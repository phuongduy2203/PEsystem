using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PESystem.Areas.NPI.Models;
using PESystem.Areas.NPI.Models.ViewModels;

namespace PESystem.Areas.NPI.Services
{
    public class NpiDocumentService
    {
        private const string ProjectsMetadataFileName = ".projects.json";
        private const string DocumentMetadataFileName = ".documents.json";

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            WriteIndented = true
        };

        private static readonly SemaphoreSlim ProjectsLock = new(1, 1);
        private static readonly ConcurrentDictionary<string, SemaphoreSlim> FolderLocks = new();

        private readonly ILogger<NpiDocumentService> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        private readonly string _rootPath;

        private static readonly IReadOnlyDictionary<string, string[]> TemplateFolders = new Dictionary<string, string[]>
        {
            ["BOM"] = new[] { "NPI BOM", "MP BOM" },
            ["Document instruction"] = new[] { "BOM map", "PCB layout", "ASSY + Packing instruction" },
            ["Manufacturing process"] = new[] { "Route from NV", "Manufacturing in foxconn + SFC", "SOP route NV" },
            ["Key component"] = new[] { "OPV data", "SOP NPI", "EPAD location" },
            ["Config NPI"] = new[] { "Config 27 for BI process", "LCR config" },
            ["DFX"] = new[] { "PFMEA", "PMP" },
            ["Production plan"] = new[] { "DEV + status" },
            ["YR report for each build"] = new[] { "YR everyday (tracker)", "YR report (engineer report)" },
            ["Cook book"] = new[] { "Picture SFG + FG", "Picture AOI", "Profile SMT" },
            ["YR 1st MP"] = new[] { "Only test station (engineer report)" },
            ["Bone pile report"] = Array.Empty<string>()
        };

        public NpiDocumentService(IConfiguration configuration, ILogger<NpiDocumentService> logger, IHttpContextAccessor httpContextAccessor)
        {
            var configuredPath = configuration.GetSection("NpiDocument")?.GetValue<string>("RootPath");
            _rootPath = string.IsNullOrWhiteSpace(configuredPath) ? @"D:\\NpiDocument" : configuredPath!;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<IReadOnlyList<NpiProjectMetadata>> GetProjectsAsync()
        {
            await EnsureRootExistsAsync();
            await ProjectsLock.WaitAsync();
            try
            {
                var metadataPath = GetProjectsMetadataPath();
                if (!File.Exists(metadataPath))
                {
                    return Array.Empty<NpiProjectMetadata>();
                }

                await using var stream = File.OpenRead(metadataPath);
                var projects = await JsonSerializer.DeserializeAsync<List<NpiProjectMetadata>>(stream, JsonOptions) ?? new List<NpiProjectMetadata>();
                return projects
                    .Where(p => Directory.Exists(GetProjectFolderPath(p.ProjectKey, ensureExists: false)))
                    .OrderBy(p => p.Name, StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to read NPI project metadata");
                return Array.Empty<NpiProjectMetadata>();
            }
            finally
            {
                ProjectsLock.Release();
            }
        }

        public async Task<NpiProjectMetadata?> CreateProjectAsync(string name, string owner)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new ArgumentException("Tên project không hợp lệ.", nameof(name));
            }

            if (string.IsNullOrWhiteSpace(owner))
            {
                throw new ArgumentException("Owner không hợp lệ.", nameof(owner));
            }

            name = name.Trim();
            owner = owner.Trim();

            await EnsureRootExistsAsync();

            await ProjectsLock.WaitAsync();
            try
            {
                var projects = await ReadProjectsInternalAsync();
                if (projects.Any(p => string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase)))
                {
                    throw new InvalidOperationException($"Project '{name}' đã tồn tại.");
                }

                var projectKey = GenerateUniqueProjectKey(name, projects);
                var project = new NpiProjectMetadata
                {
                    ProjectKey = projectKey,
                    Name = name,
                    Owner = owner,
                    CreatedAt = DateTime.UtcNow
                };

                projects.Add(project);
                await WriteProjectsInternalAsync(projects);

                var projectPath = GetProjectFolderPath(project.ProjectKey);
                Directory.CreateDirectory(projectPath);

                foreach (var group in TemplateFolders)
                {
                    var groupPath = Path.Combine(projectPath, group.Key);
                    Directory.CreateDirectory(groupPath);
                    foreach (var child in group.Value)
                    {
                        Directory.CreateDirectory(Path.Combine(groupPath, child));
                    }
                }

                return project;
            }
            finally
            {
                ProjectsLock.Release();
            }
        }

        public async Task<NpiProjectMetadata?> GetProjectAsync(string projectKey)
        {
            if (string.IsNullOrWhiteSpace(projectKey))
            {
                return null;
            }

            await ProjectsLock.WaitAsync();
            try
            {
                var projects = await ReadProjectsInternalAsync();
                return projects.FirstOrDefault(p => string.Equals(p.ProjectKey, projectKey, StringComparison.OrdinalIgnoreCase));
            }
            finally
            {
                ProjectsLock.Release();
            }
        }

        public async Task<NpiProjectDetailViewModel?> GetProjectDetailAsync(string projectKey, string? relativePath)
        {
            var project = await GetProjectAsync(projectKey);
            if (project == null)
            {
                return null;
            }

            var normalizedPath = NormalizeRelativePath(relativePath);
            var folderPath = GetProjectFolderPath(project.ProjectKey);
            var currentPath = string.IsNullOrEmpty(normalizedPath) ? folderPath : Path.Combine(folderPath, normalizedPath);
            currentPath = EnsurePathWithinProject(project, currentPath);

            if (!Directory.Exists(currentPath))
            {
                Directory.CreateDirectory(currentPath);
            }

            var breadcrumbItems = BuildBreadcrumbs(project, normalizedPath);

            var directories = Directory.GetDirectories(currentPath)
                .OrderBy(d => d, StringComparer.OrdinalIgnoreCase)
                .Select(d => new NpiFolderViewModel
                {
                    Name = Path.GetFileName(d),
                    RelativePath = CombineRelativePaths(ToRoutePath(normalizedPath), Path.GetFileName(d))
                })
                .ToList();

            var documents = await LoadDocumentsAsync(currentPath, ToRoutePath(normalizedPath));

            return new NpiProjectDetailViewModel
            {
                Project = project,
                RelativePath = ToRoutePath(normalizedPath),
                Breadcrumbs = breadcrumbItems,
                Folders = directories,
                Documents = documents
            };
        }

        public async Task UploadDocumentAsync(string projectKey, string? relativePath, IFormFile file, CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0)
            {
                throw new InvalidOperationException("Tệp tải lên không hợp lệ.");
            }

            var project = await GetProjectAsync(projectKey) ?? throw new InvalidOperationException("Project không tồn tại.");
            var normalizedPath = NormalizeRelativePath(relativePath);
            var folderPath = EnsurePathWithinProject(project, Path.Combine(GetProjectFolderPath(project.ProjectKey), normalizedPath));
            Directory.CreateDirectory(folderPath);

            var metadataPath = Path.Combine(folderPath, DocumentMetadataFileName);
            var folderLock = FolderLocks.GetOrAdd(metadataPath, _ => new SemaphoreSlim(1, 1));
            await folderLock.WaitAsync(cancellationToken);
            try
            {
                var documents = await ReadDocumentsInternalAsync(metadataPath);
                var existingVersions = documents
                    .Where(d => string.Equals(d.OriginalName, file.FileName, StringComparison.OrdinalIgnoreCase))
                    .Select(d => d.Version);
                var nextVersion = existingVersions.Any() ? existingVersions.Max() + 1 : 1;

                var baseName = Path.GetFileNameWithoutExtension(file.FileName);
                var extension = Path.GetExtension(file.FileName);
                var storedName = $"{SanitizeFileName(baseName)}_v{nextVersion:000}{extension}";
                var storedPath = Path.Combine(folderPath, storedName);

                await using (var stream = File.Create(storedPath))
                {
                    await file.CopyToAsync(stream, cancellationToken);
                }

                var uploader = _httpContextAccessor.HttpContext?.User?.Identity?.Name;
                if (string.IsNullOrWhiteSpace(uploader))
                {
                    uploader = "Unknown";
                }

                documents.Add(new NpiDocumentMetadata
                {
                    Id = Guid.NewGuid().ToString("N"),
                    OriginalName = file.FileName,
                    StoredFileName = storedName,
                    UploadedAt = DateTime.UtcNow,
                    UploadedBy = uploader,
                    Version = nextVersion
                });

                await WriteDocumentsInternalAsync(metadataPath, documents);
            }
            finally
            {
                folderLock.Release();
            }
        }

        public async Task<(NpiDocumentMetadata Metadata, string PhysicalPath)?> GetDocumentAsync(string projectKey, string documentId, string? relativePath)
        {
            var project = await GetProjectAsync(projectKey);
            if (project == null)
            {
                return null;
            }

            var normalizedPath = NormalizeRelativePath(relativePath);
            var folderPath = EnsurePathWithinProject(project, Path.Combine(GetProjectFolderPath(project.ProjectKey), normalizedPath));
            var metadataPath = Path.Combine(folderPath, DocumentMetadataFileName);
            var documents = await ReadDocumentsInternalAsync(metadataPath);
            var document = documents.FirstOrDefault(d => d.Id == documentId);
            if (document == null)
            {
                return null;
            }

            var filePath = Path.Combine(folderPath, document.StoredFileName);
            if (!File.Exists(filePath))
            {
                return null;
            }

            return (document, filePath);
        }

        public async Task<bool> DeleteDocumentAsync(string projectKey, string documentId, string? relativePath)
        {
            var project = await GetProjectAsync(projectKey);
            if (project == null)
            {
                return false;
            }

            var normalizedPath = NormalizeRelativePath(relativePath);
            var folderPath = EnsurePathWithinProject(project, Path.Combine(GetProjectFolderPath(project.ProjectKey), normalizedPath));
            var metadataPath = Path.Combine(folderPath, DocumentMetadataFileName);
            var folderLock = FolderLocks.GetOrAdd(metadataPath, _ => new SemaphoreSlim(1, 1));
            await folderLock.WaitAsync();
            try
            {
                var documents = await ReadDocumentsInternalAsync(metadataPath);
                var index = documents.FindIndex(d => d.Id == documentId);
                if (index < 0)
                {
                    return false;
                }

                var document = documents[index];
                var filePath = Path.Combine(folderPath, document.StoredFileName);
                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                }

                documents.RemoveAt(index);
                await WriteDocumentsInternalAsync(metadataPath, documents);
                return true;
            }
            finally
            {
                folderLock.Release();
            }
        }

        private async Task EnsureRootExistsAsync()
        {
            if (!Directory.Exists(_rootPath))
            {
                Directory.CreateDirectory(_rootPath);
            }

            var metadataPath = GetProjectsMetadataPath();
            if (!File.Exists(metadataPath))
            {
                await using var stream = File.Create(metadataPath);
                await JsonSerializer.SerializeAsync(stream, new List<NpiProjectMetadata>(), JsonOptions);
            }
        }

        private string GetProjectsMetadataPath() => Path.Combine(_rootPath, ProjectsMetadataFileName);

        private string GetProjectFolderPath(string projectKey, bool ensureExists = true)
        {
            var projectPath = Path.Combine(_rootPath, projectKey);
            if (ensureExists && !Directory.Exists(projectPath))
            {
                Directory.CreateDirectory(projectPath);
            }

            return projectPath;
        }

        private async Task<List<NpiProjectMetadata>> ReadProjectsInternalAsync()
        {
            var metadataPath = GetProjectsMetadataPath();
            if (!File.Exists(metadataPath))
            {
                return new List<NpiProjectMetadata>();
            }

            await using var stream = File.OpenRead(metadataPath);
            return await JsonSerializer.DeserializeAsync<List<NpiProjectMetadata>>(stream, JsonOptions) ?? new List<NpiProjectMetadata>();
        }

        private async Task WriteProjectsInternalAsync(List<NpiProjectMetadata> projects)
        {
            var metadataPath = GetProjectsMetadataPath();
            await using var stream = File.Create(metadataPath);
            await JsonSerializer.SerializeAsync(stream, projects, JsonOptions);
        }

        private string GenerateUniqueProjectKey(string projectName, IEnumerable<NpiProjectMetadata> existing)
        {
            var safeName = SanitizeFileName(projectName);
            if (string.IsNullOrWhiteSpace(safeName))
            {
                safeName = "Project";
            }

            var key = safeName;
            var suffix = 1;
            var existingKeys = new HashSet<string>(existing.Select(p => p.ProjectKey), StringComparer.OrdinalIgnoreCase);
            while (existingKeys.Contains(key) || Directory.Exists(Path.Combine(_rootPath, key)))
            {
                key = $"{safeName}_{suffix++}";
            }

            return key;
        }

        private static string ToRoutePath(string normalizedPath)
        {
            return string.IsNullOrWhiteSpace(normalizedPath)
                ? string.Empty
                : normalizedPath.Replace('\\', '/');
        }

        private static string SanitizeFileName(string input)
        {
            var invalidChars = Regex.Escape(new string(Path.GetInvalidFileNameChars()));
            var invalidRegex = new Regex($"[{invalidChars}]", RegexOptions.Compiled);
            var sanitized = invalidRegex.Replace(input, "_");
            sanitized = Regex.Replace(sanitized, "\\s+", "_");
            sanitized = sanitized.Trim('_');
            return string.IsNullOrWhiteSpace(sanitized) ? "item" : sanitized;
        }

        private static string NormalizeRelativePath(string? relativePath)
        {
            if (string.IsNullOrWhiteSpace(relativePath))
            {
                return string.Empty;
            }

            var parts = relativePath
                .Split(new[] { '/', '\\' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(part => part.Trim())
                .Where(part => !string.IsNullOrWhiteSpace(part))
                .Select(Path.GetFileName);

            return Path.Combine(parts.ToArray());
        }

        private string EnsurePathWithinProject(NpiProjectMetadata project, string targetPath)
        {
            var projectRoot = Path.GetFullPath(GetProjectFolderPath(project.ProjectKey));
            var fullPath = Path.GetFullPath(targetPath);
            if (!fullPath.StartsWith(projectRoot, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Đường dẫn không hợp lệ.");
            }

            return fullPath;
        }

        private static string CombineRelativePaths(string basePath, string? append)
        {
            if (string.IsNullOrEmpty(basePath))
            {
                return append ?? string.Empty;
            }

            if (string.IsNullOrEmpty(append))
            {
                return basePath;
            }

            return $"{basePath.TrimEnd('/')}/{append.TrimStart('/')}";
        }

        private IReadOnlyList<NpiBreadcrumbItem> BuildBreadcrumbs(NpiProjectMetadata project, string relativePath)
        {
            var breadcrumbs = new List<NpiBreadcrumbItem>
            {
                new() { Title = project.Name, RelativePath = string.Empty }
            };

            if (string.IsNullOrEmpty(relativePath))
            {
                return breadcrumbs;
            }

            var parts = relativePath.Split(Path.DirectorySeparatorChar, StringSplitOptions.RemoveEmptyEntries);
            var current = string.Empty;
            foreach (var part in parts)
            {
                current = CombineRelativePaths(current, part);
                breadcrumbs.Add(new NpiBreadcrumbItem
                {
                    Title = part,
                    RelativePath = current
                });
            }

            return breadcrumbs;
        }

        private async Task<IReadOnlyList<NpiDocumentViewModel>> LoadDocumentsAsync(string folderPath, string relativePath)
        {
            var metadataPath = Path.Combine(folderPath, DocumentMetadataFileName);
            var documents = await ReadDocumentsInternalAsync(metadataPath);

            return documents
                .OrderBy(d => d.OriginalName, StringComparer.OrdinalIgnoreCase)
                .ThenByDescending(d => d.Version)
                .Select(d => new NpiDocumentViewModel
                {
                    Id = d.Id,
                    DisplayName = d.OriginalName,
                    Version = d.Version,
                    UploadedAt = d.UploadedAt,
                    UploadedBy = d.UploadedBy,
                    StoredFileName = d.StoredFileName,
                    RelativePath = relativePath
                })
                .ToList();
        }

        private static async Task<List<NpiDocumentMetadata>> ReadDocumentsInternalAsync(string metadataPath)
        {
            if (!File.Exists(metadataPath))
            {
                return new List<NpiDocumentMetadata>();
            }

            await using var stream = File.OpenRead(metadataPath);
            return await JsonSerializer.DeserializeAsync<List<NpiDocumentMetadata>>(stream, JsonOptions) ?? new List<NpiDocumentMetadata>();
        }

        private static async Task WriteDocumentsInternalAsync(string metadataPath, List<NpiDocumentMetadata> documents)
        {
            await using var stream = File.Create(metadataPath);
            await JsonSerializer.SerializeAsync(stream, documents, JsonOptions);
        }
    }
}
