using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Options;
using PESystem.Options;

namespace PESystem.Services
{
    public class NpiDocumentService : INpiDocumentService
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            WriteIndented = true
        };

        private readonly SemaphoreSlim _syncLock = new(1, 1);
        private readonly ILogger<NpiDocumentService> _logger;
        private readonly string _rootPath;
        private readonly IReadOnlyList<NpiFolderTemplate> _templates;
        private readonly FileExtensionContentTypeProvider _contentTypeProvider = new();

        public IReadOnlyList<NpiFolderTemplate> FolderTemplates => _templates;

        private string ProjectsStorePath => Path.Combine(_rootPath, "projects.json");

        public NpiDocumentService(IOptions<NpiDocumentOptions> options, ILogger<NpiDocumentService> logger)
        {
            _logger = logger;
            _rootPath = string.IsNullOrWhiteSpace(options.Value.RootPath)
                ? @"D:\\NpiDocument"
                : options.Value.RootPath;

            Directory.CreateDirectory(_rootPath);
            _templates = BuildTemplates();
        }

        public async Task<IReadOnlyList<NpiProjectSummary>> GetProjectsAsync(CancellationToken cancellationToken = default)
        {
            await _syncLock.WaitAsync(cancellationToken);
            try
            {
                var store = await LoadProjectStoreAsync(cancellationToken).ConfigureAwait(false);
                return store.Projects
                    .OrderByDescending(p => p.CreatedAt)
                    .Select(CloneSummary)
                    .ToList();
            }
            finally
            {
                _syncLock.Release();
            }
        }

        public async Task<NpiProjectSummary> CreateProjectAsync(string name, string owner, CancellationToken cancellationToken = default)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
            owner ??= string.Empty;

            await _syncLock.WaitAsync(cancellationToken);
            try
            {
                var store = await LoadProjectStoreAsync(cancellationToken).ConfigureAwait(false);
                if (store.Projects.Any(p => string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase)))
                {
                    throw new InvalidOperationException($"Project '{name}' already exists.");
                }

                var folderName = GenerateFolderName(name, store.Projects.Select(p => p.FolderName));
                var projectSummary = new NpiProjectSummary
                {
                    Id = Guid.NewGuid(),
                    Name = name.Trim(),
                    Owner = owner.Trim(),
                    CreatedAt = DateTime.UtcNow,
                    FolderName = folderName,
                    DocumentCount = 0
                };

                var projectPath = GetProjectPath(projectSummary);
                Directory.CreateDirectory(projectPath);
                foreach (var category in _templates)
                {
                    var categoryPath = Path.Combine(projectPath, category.CategoryFolderName);
                    Directory.CreateDirectory(categoryPath);
                    foreach (var item in category.Items)
                    {
                        Directory.CreateDirectory(Path.Combine(categoryPath, item.FolderName));
                    }
                }

                var manifest = new ManifestStore();
                await SaveManifestAsync(projectSummary, manifest, cancellationToken).ConfigureAwait(false);

                store.Projects.Add(projectSummary);
                await SaveProjectStoreAsync(store, cancellationToken).ConfigureAwait(false);

                return CloneSummary(projectSummary);
            }
            finally
            {
                _syncLock.Release();
            }
        }

        public async Task<NpiProjectDetail?> GetProjectDetailAsync(Guid projectId, CancellationToken cancellationToken = default)
        {
            await _syncLock.WaitAsync(cancellationToken);
            try
            {
                var store = await LoadProjectStoreAsync(cancellationToken).ConfigureAwait(false);
                var project = store.Projects.FirstOrDefault(p => p.Id == projectId);
                if (project == null)
                {
                    return null;
                }

                var manifest = await LoadManifestAsync(project, cancellationToken).ConfigureAwait(false);
                var detail = new NpiProjectDetail
                {
                    Project = CloneSummary(project),
                    Documents = manifest.Documents
                        .Select(CloneDocument)
                        .OrderBy(d => d.Category)
                        .ThenBy(d => d.Item)
                        .ThenBy(d => d.DocumentName)
                        .ToList()
                };

                return detail;
            }
            finally
            {
                _syncLock.Release();
            }
        }

        public async Task<NpiDocumentRecord?> UploadDocumentAsync(
            Guid projectId,
            string category,
            string item,
            string documentName,
            IFormFile file,
            string uploadedBy,
            CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
            {
                throw new ArgumentException("File is required", nameof(file));
            }

            await _syncLock.WaitAsync(cancellationToken);
            try
            {
                var store = await LoadProjectStoreAsync(cancellationToken).ConfigureAwait(false);
                var project = store.Projects.FirstOrDefault(p => p.Id == projectId);
                if (project == null)
                {
                    return null;
                }

                var template = _templates.FirstOrDefault(t => string.Equals(t.Category, category, StringComparison.OrdinalIgnoreCase));
                if (template == null)
                {
                    throw new InvalidOperationException($"Category '{category}' is not defined in the template.");
                }

                var templateItem = template.Items.FirstOrDefault(i => string.Equals(i.Name, item, StringComparison.OrdinalIgnoreCase));
                if (templateItem == null)
                {
                    throw new InvalidOperationException($"Item '{item}' is not defined in the template.");
                }

                var manifest = await LoadManifestAsync(project, cancellationToken).ConfigureAwait(false);
                var displayName = string.IsNullOrWhiteSpace(documentName)
                    ? Path.GetFileNameWithoutExtension(file.FileName)
                    : documentName.Trim();

                var document = manifest.Documents.FirstOrDefault(d =>
                    string.Equals(d.Category, template.Category, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(d.Item, templateItem.Name, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(d.DocumentName, displayName, StringComparison.OrdinalIgnoreCase));

                if (document == null)
                {
                    document = new NpiDocumentRecord
                    {
                        DocumentId = Guid.NewGuid(),
                        Category = template.Category,
                        CategoryFolder = template.CategoryFolderName,
                        Item = templateItem.Name,
                        ItemFolder = templateItem.FolderName,
                        DocumentName = displayName,
                        Versions = new List<NpiDocumentVersionRecord>()
                    };
                    manifest.Documents.Add(document);
                }

                var nextVersion = document.Versions.Count == 0
                    ? 1
                    : document.Versions.Max(v => v.VersionNumber) + 1;

                var extension = Path.GetExtension(file.FileName);
                var storedFileName = $"{document.DocumentId:N}_v{nextVersion}{extension}";
                var version = new NpiDocumentVersionRecord
                {
                    VersionId = Guid.NewGuid(),
                    VersionNumber = nextVersion,
                    StoredFileName = storedFileName,
                    OriginalFileName = string.IsNullOrWhiteSpace(file.FileName) ? storedFileName : Path.GetFileName(file.FileName),
                    UploadedAt = DateTime.UtcNow,
                    UploadedBy = string.IsNullOrWhiteSpace(uploadedBy) ? "Unknown" : uploadedBy,
                    FileSize = file.Length
                };

                var documentFolder = Path.Combine(GetProjectPath(project), document.CategoryFolder, document.ItemFolder);
                Directory.CreateDirectory(documentFolder);
                var physicalPath = Path.Combine(documentFolder, storedFileName);
                await using (var stream = new FileStream(physicalPath, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    await file.CopyToAsync(stream, cancellationToken).ConfigureAwait(false);
                }

                document.Versions.Add(version);
                manifest.Documents = manifest.Documents
                    .OrderBy(d => d.Category)
                    .ThenBy(d => d.Item)
                    .ThenBy(d => d.DocumentName)
                    .ToList();

                project.DocumentCount = manifest.Documents.Sum(d => d.Versions.Count);

                await SaveManifestAsync(project, manifest, cancellationToken).ConfigureAwait(false);
                await SaveProjectStoreAsync(store, cancellationToken).ConfigureAwait(false);

                return CloneDocument(document);
            }
            finally
            {
                _syncLock.Release();
            }
        }

        public async Task<NpiDocumentFileResult?> GetDocumentFileAsync(Guid projectId, Guid documentId, Guid versionId, CancellationToken cancellationToken = default)
        {
            await _syncLock.WaitAsync(cancellationToken);
            try
            {
                var store = await LoadProjectStoreAsync(cancellationToken).ConfigureAwait(false);
                var project = store.Projects.FirstOrDefault(p => p.Id == projectId);
                if (project == null)
                {
                    return null;
                }

                var manifest = await LoadManifestAsync(project, cancellationToken).ConfigureAwait(false);
                var document = manifest.Documents.FirstOrDefault(d => d.DocumentId == documentId);
                var version = document?.Versions.FirstOrDefault(v => v.VersionId == versionId);
                if (document == null || version == null)
                {
                    return null;
                }

                var physicalPath = Path.Combine(GetProjectPath(project), document.CategoryFolder, document.ItemFolder, version.StoredFileName);
                if (!File.Exists(physicalPath))
                {
                    return null;
                }

                if (!_contentTypeProvider.TryGetContentType(version.OriginalFileName, out var contentType))
                {
                    contentType = "application/octet-stream";
                }

                return new NpiDocumentFileResult
                {
                    PhysicalPath = physicalPath,
                    OriginalFileName = version.OriginalFileName,
                    ContentType = contentType
                };
            }
            finally
            {
                _syncLock.Release();
            }
        }

        public async Task<bool> DeleteVersionAsync(Guid projectId, Guid documentId, Guid versionId, CancellationToken cancellationToken = default)
        {
            await _syncLock.WaitAsync(cancellationToken);
            try
            {
                var store = await LoadProjectStoreAsync(cancellationToken).ConfigureAwait(false);
                var project = store.Projects.FirstOrDefault(p => p.Id == projectId);
                if (project == null)
                {
                    return false;
                }

                var manifest = await LoadManifestAsync(project, cancellationToken).ConfigureAwait(false);
                var document = manifest.Documents.FirstOrDefault(d => d.DocumentId == documentId);
                var version = document?.Versions.FirstOrDefault(v => v.VersionId == versionId);
                if (document == null || version == null)
                {
                    return false;
                }

                var physicalPath = Path.Combine(GetProjectPath(project), document.CategoryFolder, document.ItemFolder, version.StoredFileName);
                if (File.Exists(physicalPath))
                {
                    try
                    {
                        File.Delete(physicalPath);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to delete file {File}", physicalPath);
                        throw;
                    }
                }

                document.Versions.Remove(version);
                if (document.Versions.Count == 0)
                {
                    manifest.Documents.Remove(document);
                }

                project.DocumentCount = manifest.Documents.Sum(d => d.Versions.Count);

                await SaveManifestAsync(project, manifest, cancellationToken).ConfigureAwait(false);
                await SaveProjectStoreAsync(store, cancellationToken).ConfigureAwait(false);

                return true;
            }
            finally
            {
                _syncLock.Release();
            }
        }

        private async Task<ProjectStore> LoadProjectStoreAsync(CancellationToken cancellationToken)
        {
            if (!File.Exists(ProjectsStorePath))
            {
                return new ProjectStore();
            }

            await using var stream = new FileStream(ProjectsStorePath, FileMode.Open, FileAccess.Read, FileShare.Read);
            var store = await JsonSerializer.DeserializeAsync<ProjectStore>(stream, JsonOptions, cancellationToken).ConfigureAwait(false);
            return store ?? new ProjectStore();
        }

        private async Task SaveProjectStoreAsync(ProjectStore store, CancellationToken cancellationToken)
        {
            await using var stream = new FileStream(ProjectsStorePath, FileMode.Create, FileAccess.Write, FileShare.None);
            await JsonSerializer.SerializeAsync(stream, store, JsonOptions, cancellationToken).ConfigureAwait(false);
        }

        private async Task<ManifestStore> LoadManifestAsync(NpiProjectSummary summary, CancellationToken cancellationToken)
        {
            var path = GetManifestPath(summary);
            if (!File.Exists(path))
            {
                return new ManifestStore();
            }

            await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
            var manifest = await JsonSerializer.DeserializeAsync<ManifestStore>(stream, JsonOptions, cancellationToken).ConfigureAwait(false);
            return manifest ?? new ManifestStore();
        }

        private async Task SaveManifestAsync(NpiProjectSummary summary, ManifestStore manifest, CancellationToken cancellationToken)
        {
            var path = GetManifestPath(summary);
            await using var stream = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None);
            await JsonSerializer.SerializeAsync(stream, manifest, JsonOptions, cancellationToken).ConfigureAwait(false);
        }

        private string GetProjectPath(NpiProjectSummary summary)
            => Path.Combine(_rootPath, summary.FolderName);

        private string GetManifestPath(NpiProjectSummary summary)
            => Path.Combine(GetProjectPath(summary), "manifest.json");

        private static string GenerateFolderName(string name, IEnumerable<string> existing)
        {
            var baseName = SanitizeName(name);
            if (string.IsNullOrWhiteSpace(baseName))
            {
                baseName = "Project";
            }

            var candidate = baseName;
            var index = 1;
            var existingSet = new HashSet<string>(existing, StringComparer.OrdinalIgnoreCase);
            while (existingSet.Contains(candidate))
            {
                candidate = $"{baseName}_{index++}";
            }

            return candidate;
        }

        private static string SanitizeFolderName(string name)
        {
            var sanitized = SanitizeName(name);
            return string.IsNullOrWhiteSpace(sanitized) ? "Folder" : sanitized;
        }

        private static string SanitizeName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return string.Empty;
            }

            var invalid = Path.GetInvalidFileNameChars();
            var builder = new StringBuilder();
            foreach (var ch in name.Trim())
            {
                if (invalid.Contains(ch))
                {
                    builder.Append('_');
                }
                else if (char.IsWhiteSpace(ch))
                {
                    builder.Append('_');
                }
                else
                {
                    builder.Append(ch);
                }
            }

            var sanitized = builder.ToString();
            while (sanitized.Contains("__", StringComparison.Ordinal))
            {
                sanitized = sanitized.Replace("__", "_", StringComparison.Ordinal);
            }

            return sanitized.Trim('_');
        }

        private static NpiProjectSummary CloneSummary(NpiProjectSummary summary)
            => new()
            {
                Id = summary.Id,
                Name = summary.Name,
                Owner = summary.Owner,
                CreatedAt = summary.CreatedAt,
                FolderName = summary.FolderName,
                DocumentCount = summary.DocumentCount
            };

        private static NpiDocumentRecord CloneDocument(NpiDocumentRecord record)
            => new()
            {
                DocumentId = record.DocumentId,
                DocumentName = record.DocumentName,
                Category = record.Category,
                CategoryFolder = record.CategoryFolder,
                Item = record.Item,
                ItemFolder = record.ItemFolder,
                Versions = record.Versions
                    .OrderByDescending(v => v.VersionNumber)
                    .Select(CloneVersion)
                    .ToList()
            };

        private static NpiDocumentVersionRecord CloneVersion(NpiDocumentVersionRecord version)
            => new()
            {
                VersionId = version.VersionId,
                VersionNumber = version.VersionNumber,
                StoredFileName = version.StoredFileName,
                OriginalFileName = version.OriginalFileName,
                FileSize = version.FileSize,
                UploadedAt = version.UploadedAt,
                UploadedBy = version.UploadedBy
            };

        private static IReadOnlyList<NpiFolderTemplate> BuildTemplates()
        {
            var configuration = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
            {
                ["BOM"] = new[] { "NPI BOM", "MP BOM" },
                ["Document instruction"] = new[] { "BOM layout", "ASSY + Packing instruction" },
                ["Manufacturing process"] = new[] { "Route from NV", "Manufacturing process in Foxconn + SFC" },
                ["Key component"] = new[] { "OPV data" },
                ["SOP NPI"] = new[] { "SOP polarity" },
                ["Config NPI"] = new[] { "Config 27 for BI process", "LR config", "EPAD location" },
                ["DFX"] = new[] { "PFMEA", "PMP" },
                ["Production plan"] = new[] { "DEV + status" },
                ["YR report for each build"] = new[] { "YR everyday (tracker)", "YR each test station (engineer report)" },
                ["Cook book"] = new[] { "Picture SFG + FG", "Picture AOI", "Profile SMT" },
                ["YR 1st MP"] = new[] { "Only test station (engineer report)", "FA detail report" }
            };

            var result = new List<NpiFolderTemplate>();
            foreach (var kvp in configuration)
            {
                var categoryFolder = SanitizeFolderName(kvp.Key);
                var items = kvp.Value
                    .Select(item => new NpiFolderItem(item, SanitizeFolderName(item)))
                    .ToList();
                result.Add(new NpiFolderTemplate(kvp.Key, categoryFolder, items));
            }

            return result;
        }

        private sealed class ProjectStore
        {
            public List<NpiProjectSummary> Projects { get; set; } = new();
        }

        private sealed class ManifestStore
        {
            public List<NpiDocumentRecord> Documents { get; set; } = new();
        }
    }
}
