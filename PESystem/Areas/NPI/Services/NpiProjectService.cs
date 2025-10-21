using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using PESystem.Areas.NPI.Models;
using PESystem.Options;

namespace PESystem.Areas.NPI.Services
{
    public class NpiProjectService : INpiProjectService
    {
        private const string MetadataFileName = ".npi.project.json";
        private static readonly IReadOnlyList<NpiFolderDefinition> _folderDefinitions = new List<NpiFolderDefinition>
        {
            new("BOM/NPI BOM"),
            new("BOM/MP BOM"),
            new("Document instruction/PCB layout"),
            new("Document instruction/Schematic"),
            new("Document instruction/ASSY + Packing instruction"),
            new("Document instruction/Label instruction"),
            new("Manufacturing process/Route from NV"),
            new("Manufacturing process/Manufacturing in foxconn + SFC"),
            new("Manufacturing process/SOP full process from IE"),
            new("Key component/OVP location"),
            new("SOP NPI/EPAD location"),
            new("Config NPI/PCF config"),
            new("DFX/DFX review"),
            new("Production plan/DEV + status"),
            new("Yield Rate NPI for each build/YR everyday (tracker)"),
            new("Yield Rate NPI for each build/Only test station (engineer report)"),
            new("Cook book/Cook book document"),
            new("Cook book/Picture SFG + FG"),
            new("Cook book/Picture AOI"),
            new("Cook book/Profile SMT"),
            new("Yield rate 1st MP/Only test station (engineer report)"),
            new("Bone pile report/FA daily report"),
            new("Bone pile report/Bone pile summary")
        };

        private readonly ILogger<NpiProjectService> _logger;
        private readonly string _rootPath;
        private readonly JsonSerializerOptions _serializerOptions = new(JsonSerializerDefaults.Web)
        {
            WriteIndented = true
        };

        public NpiProjectService(IOptions<NpiDocumentOptions> options, ILogger<NpiProjectService> logger)
        {
            _logger = logger;
            _rootPath = ResolveRootPath(options.Value.RootPath);
            Directory.CreateDirectory(_rootPath);
        }

        public IReadOnlyList<NpiFolderDefinition> FolderDefinitions => _folderDefinitions;

        public IReadOnlyList<NpiProject> GetProjects()
        {
            if (!Directory.Exists(_rootPath))
            {
                return Array.Empty<NpiProject>();
            }

            var projects = new List<NpiProject>();
            foreach (var projectDir in Directory.EnumerateDirectories(_rootPath))
            {
                var project = LoadProject(projectDir);
                if (project != null)
                {
                    projects.Add(project);
                }
            }

            return projects
                .OrderByDescending(p => p.CreatedAtUtc)
                .ThenBy(p => p.Name, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        public NpiProject? GetProject(string projectId)
        {
            if (string.IsNullOrWhiteSpace(projectId))
            {
                return null;
            }

            var projectDir = GetProjectDirectory(projectId);
            return Directory.Exists(projectDir) ? LoadProject(projectDir) : null;
        }

        public async Task<OperationResult> CreateProjectAsync(string name, string owner)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return OperationResult.Failure("Project name is required.");
            }

            owner ??= string.Empty;
            var projectId = CreateSlug(name);
            if (string.IsNullOrWhiteSpace(projectId))
            {
                return OperationResult.Failure("Project name does not contain valid characters.");
            }

            var projectDir = GetProjectDirectory(projectId);
            if (Directory.Exists(projectDir))
            {
                return OperationResult.Failure("A project with the same identifier already exists. Please choose another name.");
            }

            Directory.CreateDirectory(projectDir);
            foreach (var folder in _folderDefinitions)
            {
                var fullPath = Path.Combine(new[] { projectDir }.Concat(folder.Segments).ToArray());
                Directory.CreateDirectory(fullPath);
            }

            var metadata = new NpiProjectMetadata
            {
                Id = projectId,
                Name = name.Trim(),
                Owner = owner.Trim(),
                CreatedAtUtc = DateTime.UtcNow,
            };

            await SaveMetadataAsync(metadata, projectDir).ConfigureAwait(false);

            return OperationResult.Success("Project created successfully.");
        }

        public async Task<OperationResult> UploadDocumentAsync(string projectId, string relativeFolder, IFormFile file, string uploadedBy)
        {
            if (file == null || file.Length == 0)
            {
                return OperationResult.Failure("Please choose a file to upload.");
            }

            var projectDir = GetProjectDirectory(projectId);
            if (!Directory.Exists(projectDir))
            {
                return OperationResult.Failure("Project not found.");
            }

            if (!_folderDefinitions.Any(f => string.Equals(f.RelativePath, relativeFolder, StringComparison.OrdinalIgnoreCase)))
            {
                return OperationResult.Failure("The selected folder is not part of the NPI template.");
            }

            var metadata = await LoadMetadataAsync(projectDir).ConfigureAwait(false);
            if (metadata == null)
            {
                return OperationResult.Failure("Project metadata is missing or corrupted.");
            }

            var segments = relativeFolder.Split('/', StringSplitOptions.RemoveEmptyEntries);
            var folderPath = Path.Combine(new[] { projectDir }.Concat(segments).ToArray());
            Directory.CreateDirectory(folderPath);

            var originalFileName = Path.GetFileName(file.FileName);
            var nameWithoutExtension = Path.GetFileNameWithoutExtension(originalFileName);
            var extension = Path.GetExtension(originalFileName);

            var maxExistingVersion = metadata.Documents
                .Where(d => string.Equals(d.Folder, relativeFolder, StringComparison.OrdinalIgnoreCase)
                            && string.Equals(d.OriginalFileName, originalFileName, StringComparison.OrdinalIgnoreCase))
                .Select(d => d.Version)
                .DefaultIfEmpty(0)
                .Max();

            var newVersion = maxExistingVersion + 1;
            var versionedFileName = $"{nameWithoutExtension}_v{newVersion:000}{extension}";
            var destinationPath = Path.Combine(folderPath, versionedFileName);

            using (var stream = new FileStream(destinationPath, FileMode.Create, FileAccess.Write))
            {
                await file.CopyToAsync(stream).ConfigureAwait(false);
            }

            metadata.Documents.Add(new NpiDocumentMetadata
            {
                Folder = relativeFolder,
                OriginalFileName = originalFileName,
                StoredFileName = versionedFileName,
                Version = newVersion,
                UploadedAtUtc = DateTime.UtcNow,
                UploadedBy = uploadedBy ?? string.Empty
            });

            await SaveMetadataAsync(metadata, projectDir).ConfigureAwait(false);

            return OperationResult.Success($"Uploaded '{originalFileName}' (version {newVersion}).");
        }

        public async Task<OperationResult> DeleteDocumentAsync(string projectId, string documentId)
        {
            if (string.IsNullOrWhiteSpace(projectId) || string.IsNullOrWhiteSpace(documentId))
            {
                return OperationResult.Failure("Invalid document reference.");
            }

            var projectDir = GetProjectDirectory(projectId);
            if (!Directory.Exists(projectDir))
            {
                return OperationResult.Failure("Project not found.");
            }

            var metadata = await LoadMetadataAsync(projectDir).ConfigureAwait(false);
            if (metadata == null)
            {
                return OperationResult.Failure("Project metadata is missing or corrupted.");
            }

            var document = metadata.Documents.FirstOrDefault(d => string.Equals(d.Id, documentId, StringComparison.OrdinalIgnoreCase));
            if (document == null)
            {
                return OperationResult.Failure("Document not found.");
            }

            var segments = document.Folder.Split('/', StringSplitOptions.RemoveEmptyEntries);
            var documentPath = Path.Combine(new[] { projectDir }.Concat(segments).Append(document.StoredFileName).ToArray());

            if (File.Exists(documentPath))
            {
                File.Delete(documentPath);
            }

            metadata.Documents.Remove(document);
            await SaveMetadataAsync(metadata, projectDir).ConfigureAwait(false);

            return OperationResult.Success($"Document '{document.OriginalFileName}' was deleted.");
        }

        public (Stream Stream, string ContentType, string FileName)? DownloadDocument(string projectId, string documentId)
        {
            if (string.IsNullOrWhiteSpace(projectId) || string.IsNullOrWhiteSpace(documentId))
            {
                return null;
            }

            var projectDir = GetProjectDirectory(projectId);
            if (!Directory.Exists(projectDir))
            {
                return null;
            }

            var metadata = LoadMetadataAsync(projectDir).GetAwaiter().GetResult();
            if (metadata == null)
            {
                return null;
            }

            var document = metadata.Documents.FirstOrDefault(d => string.Equals(d.Id, documentId, StringComparison.OrdinalIgnoreCase));
            if (document == null)
            {
                return null;
            }

            var segments = document.Folder.Split('/', StringSplitOptions.RemoveEmptyEntries);
            var path = Path.Combine(new[] { projectDir }.Concat(segments).Append(document.StoredFileName).ToArray());
            if (!File.Exists(path))
            {
                return null;
            }

            var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
            var contentType = GetContentType(path);
            return (stream, contentType, document.StoredFileName);
        }

        private static string GetContentType(string path)
        {
            var provider = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
            return provider.TryGetContentType(path, out var contentType) ? contentType : "application/octet-stream";
        }

        private NpiProject? LoadProject(string projectDir)
        {
            try
            {
                var metadata = LoadMetadataAsync(projectDir).GetAwaiter().GetResult();
                if (metadata == null)
                {
                    return null;
                }

                return new NpiProject
                {
                    Id = metadata.Id,
                    Name = metadata.Name,
                    Owner = metadata.Owner,
                    CreatedAtUtc = metadata.CreatedAtUtc,
                    Documents = metadata.Documents
                        .Select(d => new NpiDocument
                        {
                            Id = d.Id,
                            Folder = d.Folder,
                            OriginalFileName = d.OriginalFileName,
                            StoredFileName = d.StoredFileName,
                            Version = d.Version,
                            UploadedAtUtc = d.UploadedAtUtc,
                            UploadedBy = d.UploadedBy
                        })
                        .OrderByDescending(d => d.UploadedAtUtc)
                        .ThenByDescending(d => d.Version)
                        .ToList()
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load project metadata from {Directory}", projectDir);
                return null;
            }
        }

        private async Task<NpiProjectMetadata?> LoadMetadataAsync(string projectDir)
        {
            var metadataPath = Path.Combine(projectDir, MetadataFileName);
            if (!File.Exists(metadataPath))
            {
                return null;
            }

            await using var stream = new FileStream(metadataPath, FileMode.Open, FileAccess.Read, FileShare.Read);
            return await JsonSerializer.DeserializeAsync<NpiProjectMetadata>(stream, _serializerOptions).ConfigureAwait(false);
        }

        private async Task SaveMetadataAsync(NpiProjectMetadata metadata, string projectDir)
        {
            var metadataPath = Path.Combine(projectDir, MetadataFileName);
            await using var stream = new FileStream(metadataPath, FileMode.Create, FileAccess.Write, FileShare.None);
            await JsonSerializer.SerializeAsync(stream, metadata, _serializerOptions).ConfigureAwait(false);
        }

        private string GetProjectDirectory(string projectId) => Path.Combine(_rootPath, projectId);

        private static string CreateSlug(string value)
        {
            var slug = Regex.Replace(value.ToLowerInvariant(), "[^a-z0-9]+", "-");
            slug = Regex.Replace(slug, "-+", "-").Trim('-');
            return slug;
        }

        private static string ResolveRootPath(string? configuredPath)
        {
            if (!string.IsNullOrWhiteSpace(configuredPath))
            {
                return configuredPath;
            }

            var defaultPath = "D:\\NpiDocument";
            if (OperatingSystem.IsWindows())
            {
                return defaultPath;
            }

            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "NpiDocument");
        }
    }
}
