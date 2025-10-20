using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using PESystem.Areas.NPI.Models;

namespace PESystem.Areas.NPI.Services;

public class NpiDocumentService : INpiDocumentService
{
    private const string ProjectMetadataFile = "project.json";
    private const string DocumentMetadataFile = "documents.json";

    private readonly NpiDocumentOptions _options;
    private readonly string _rootPath;
    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };
    private readonly IReadOnlyList<NpiCategoryDefinition> _structure;
    private readonly SemaphoreSlim _sync = new(1, 1);

    public NpiDocumentService(IOptions<NpiDocumentOptions> options)
    {
        _options = options.Value;
        _rootPath = ResolveRootPath(_options.RootPath);
        Directory.CreateDirectory(_rootPath);
        _structure = BuildStructure();
    }

    public IReadOnlyList<NpiCategoryDefinition> GetStructure() => _structure;

    public async Task<IReadOnlyList<NpiProject>> GetProjectsAsync()
    {
        var result = new List<NpiProject>();
        foreach (var directory in Directory.Exists(_rootPath)
            ? Directory.EnumerateDirectories(_rootPath)
            : Enumerable.Empty<string>())
        {
            var projectPath = Path.Combine(directory, ProjectMetadataFile);
            if (!File.Exists(projectPath))
            {
                continue;
            }

            try
            {
                await using var stream = File.OpenRead(projectPath);
                var project = await JsonSerializer.DeserializeAsync<NpiProject>(stream, _jsonOptions);
                if (project != null)
                {
                    result.Add(project);
                }
            }
            catch
            {
                // Ignore corrupted project metadata but keep iterating.
            }
        }

        return result
            .OrderByDescending(p => p.CreatedAt)
            .ThenBy(p => p.Name)
            .ToList();
    }

    public async Task<NpiProject?> GetProjectAsync(Guid projectId)
    {
        var (project, _) = await GetProjectInternalAsync(projectId);
        return project;
    }

    public async Task<NpiProject> CreateProjectAsync(string name, string owner)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Project name is required", nameof(name));
        }

        if (string.IsNullOrWhiteSpace(owner))
        {
            throw new ArgumentException("Owner is required", nameof(owner));
        }

        await _sync.WaitAsync();
        try
        {
            var project = new NpiProject
            {
                Id = Guid.NewGuid(),
                Name = name.Trim(),
                Owner = owner.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            var existing = await GetProjectsAsync();
            if (existing.Any(p => string.Equals(p.Name, project.Name, StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException($"A project named '{project.Name}' already exists.");
            }

            var directoryName = $"{DateTime.UtcNow:yyyyMMddHHmmss}_{SanitizePathSegment(project.Name)}_{project.Id}";
            var projectDirectory = Path.Combine(_rootPath, directoryName);
            Directory.CreateDirectory(projectDirectory);

            foreach (var category in _structure)
            {
                var categoryPath = Path.Combine(projectDirectory, SanitizePathSegment(category.Name));
                Directory.CreateDirectory(categoryPath);

                foreach (var item in category.Items)
                {
                    var itemPath = Path.Combine(categoryPath, SanitizePathSegment(item));
                    Directory.CreateDirectory(itemPath);
                }
            }

            var projectMetadataPath = Path.Combine(projectDirectory, ProjectMetadataFile);
            await using (var stream = File.Create(projectMetadataPath))
            {
                await JsonSerializer.SerializeAsync(stream, project, _jsonOptions);
            }

            var documentsPath = Path.Combine(projectDirectory, DocumentMetadataFile);
            await using (var stream = File.Create(documentsPath))
            {
                await JsonSerializer.SerializeAsync(stream, new List<NpiDocumentRecord>(), _jsonOptions);
            }

            return project;
        }
        finally
        {
            _sync.Release();
        }
    }

    public async Task<IReadOnlyList<NpiDocumentRecord>> GetDocumentsAsync(Guid projectId)
    {
        var (_, projectDirectory) = await GetProjectInternalAsync(projectId);
        if (projectDirectory == null)
        {
            return Array.Empty<NpiDocumentRecord>();
        }

        return await ReadDocumentsAsync(projectDirectory);
    }

    public async Task<NpiDocumentRecord?> GetDocumentAsync(Guid projectId, Guid documentId)
    {
        var documents = await GetDocumentsAsync(projectId);
        return documents.FirstOrDefault(d => d.Id == documentId);
    }

    public async Task<(NpiDocumentRecord? Record, string? FilePath)> GetDocumentFileAsync(Guid projectId, Guid documentId)
    {
        var (_, projectDirectory) = await GetProjectInternalAsync(projectId);
        if (projectDirectory == null)
        {
            return (null, null);
        }

        var documents = await ReadDocumentsAsync(projectDirectory);
        var record = documents.FirstOrDefault(d => d.Id == documentId);
        if (record == null)
        {
            return (null, null);
        }

        var safeCategory = SanitizePathSegment(record.Category);
        var safeItem = SanitizePathSegment(record.Item);
        var filePath = Path.Combine(projectDirectory, safeCategory, safeItem, record.StoredFileName);
        return (record, filePath);
    }

    public async Task<NpiDocumentRecord> UploadDocumentAsync(Guid projectId, string category, string item, IFormFile file, string uploadedBy)
    {
        if (file == null)
        {
            throw new ArgumentNullException(nameof(file));
        }

        if (string.IsNullOrWhiteSpace(category))
        {
            throw new ArgumentException("Category is required", nameof(category));
        }

        if (string.IsNullOrWhiteSpace(item))
        {
            throw new ArgumentException("Item is required", nameof(item));
        }

        if (string.IsNullOrWhiteSpace(uploadedBy))
        {
            throw new ArgumentException("Uploader is required", nameof(uploadedBy));
        }

        var (project, projectDirectory) = await GetProjectInternalAsync(projectId);
        if (project == null || projectDirectory == null)
        {
            throw new InvalidOperationException("Project not found");
        }

        var safeCategory = SanitizePathSegment(category);
        var safeItem = SanitizePathSegment(item);
        var destinationDirectory = Path.Combine(projectDirectory, safeCategory, safeItem);
        Directory.CreateDirectory(destinationDirectory);

        var documents = await ReadDocumentsAsync(projectDirectory);
        var originalName = Path.GetFileName(file.FileName);
        var relatedDocuments = documents
            .Where(d => string.Equals(d.Category, category, StringComparison.OrdinalIgnoreCase)
                        && string.Equals(d.Item, item, StringComparison.OrdinalIgnoreCase)
                        && string.Equals(d.OriginalFileName, originalName, StringComparison.OrdinalIgnoreCase))
            .ToList();

        var version = relatedDocuments.Any() ? relatedDocuments.Max(d => d.Version) + 1 : 1;
        var record = new NpiDocumentRecord
        {
            Id = Guid.NewGuid(),
            Category = category.Trim(),
            Item = item.Trim(),
            OriginalFileName = originalName,
            StoredFileName = $"{Guid.NewGuid()}{Path.GetExtension(originalName)}",
            UploadedBy = uploadedBy.Trim(),
            UploadedAt = DateTime.UtcNow,
            Version = version
        };

        var destinationFilePath = Path.Combine(destinationDirectory, record.StoredFileName);
        await using (var destinationStream = File.Create(destinationFilePath))
        {
            await file.CopyToAsync(destinationStream);
        }

        documents.Add(record);
        await WriteDocumentsAsync(projectDirectory, documents);

        return record;
    }

    public async Task<bool> DeleteDocumentAsync(Guid projectId, Guid documentId)
    {
        var (_, projectDirectory) = await GetProjectInternalAsync(projectId);
        if (projectDirectory == null)
        {
            return false;
        }

        var documents = await ReadDocumentsAsync(projectDirectory);
        var record = documents.FirstOrDefault(d => d.Id == documentId);
        if (record == null)
        {
            return false;
        }

        var safeCategory = SanitizePathSegment(record.Category);
        var safeItem = SanitizePathSegment(record.Item);
        var filePath = Path.Combine(projectDirectory, safeCategory, safeItem, record.StoredFileName);

        if (File.Exists(filePath))
        {
            File.Delete(filePath);
        }

        documents.Remove(record);
        await WriteDocumentsAsync(projectDirectory, documents);

        return true;
    }

    private async Task<(NpiProject? Project, string? Directory)> GetProjectInternalAsync(Guid projectId)
    {
        foreach (var directory in Directory.Exists(_rootPath)
            ? Directory.EnumerateDirectories(_rootPath)
            : Enumerable.Empty<string>())
        {
            var projectPath = Path.Combine(directory, ProjectMetadataFile);
            if (!File.Exists(projectPath))
            {
                continue;
            }

            try
            {
                await using var stream = File.OpenRead(projectPath);
                var project = await JsonSerializer.DeserializeAsync<NpiProject>(stream, _jsonOptions);
                if (project != null && project.Id == projectId)
                {
                    return (project, directory);
                }
            }
            catch
            {
                // ignore malformed metadata
            }
        }

        return (null, null);
    }

    private async Task<List<NpiDocumentRecord>> ReadDocumentsAsync(string projectDirectory)
    {
        var documentsPath = Path.Combine(projectDirectory, DocumentMetadataFile);
        if (!File.Exists(documentsPath))
        {
            return new List<NpiDocumentRecord>();
        }

        try
        {
            await using var stream = File.OpenRead(documentsPath);
            var documents = await JsonSerializer.DeserializeAsync<List<NpiDocumentRecord>>(stream, _jsonOptions);
            return documents ?? new List<NpiDocumentRecord>();
        }
        catch
        {
            return new List<NpiDocumentRecord>();
        }
    }

    private async Task WriteDocumentsAsync(string projectDirectory, List<NpiDocumentRecord> documents)
    {
        var documentsPath = Path.Combine(projectDirectory, DocumentMetadataFile);
        await using var stream = File.Create(documentsPath);
        await JsonSerializer.SerializeAsync(stream, documents, _jsonOptions);
    }

    private static string SanitizePathSegment(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "General";
        }

        var invalid = Path.GetInvalidFileNameChars();
        var cleaned = new string(value.Select(ch => invalid.Contains(ch) ? '_' : ch).ToArray());
        return cleaned.Trim().Length == 0 ? "General" : cleaned.Trim();
    }

    private static string ResolveRootPath(string? configuredPath)
    {
        var path = string.IsNullOrWhiteSpace(configuredPath) ? @"D:\\NpiDocument" : configuredPath;
        return Path.GetFullPath(path);
    }

    private static IReadOnlyList<NpiCategoryDefinition> BuildStructure()
        => new List<NpiCategoryDefinition>
        {
            new()
            {
                Name = "BOM",
                Items = new List<string>
                {
                    "NPI BOM",
                    "BOM Map",
                    "PCB layout"
                }
            },
            new()
            {
                Name = "Document instruction",
                Items = new List<string>
                {
                    "ASSY + Packing instruction",
                    "Label instruction"
                }
            },
            new()
            {
                Name = "Manufacturing process",
                Items = new List<string>
                {
                    "Route from NV",
                    "Sampling in foxconn + SFC",
                    "SOP route NV",
                    "OPV data"
                }
            },
            new()
            {
                Name = "Key component",
                Items = new List<string>
                {
                    "OPV data"
                }
            },
            new()
            {
                Name = "SOP NPI",
                Items = new List<string>
                {
                    "SOP polarity",
                    "EPAD location",
                    "ESD location"
                }
            },
            new()
            {
                Name = "Config NPI",
                Items = new List<string>
                {
                    "Config 27 for BI process",
                    "LCR config",
                    "PMP"
                }
            },
            new()
            {
                Name = "DFX",
                Items = new List<string>
                {
                    "PFMEA",
                    "PMP"
                }
            },
            new()
            {
                Name = "Production plan",
                Items = new List<string>
                {
                    "DEV + status",
                    "YR everyday (tracker)",
                    "YR report",
                    "YR report for each build (engineer report)"
                }
            },
            new()
            {
                Name = "Cook book",
                Items = new List<string>
                {
                    "Cook book",
                    "Picture SFG + FG",
                    "Picture AOI",
                    "Picture SMT",
                    "Profile SMT",
                    "Profile SFG"
                }
            },
            new()
            {
                Name = "YR 1st MP",
                Items = new List<string>
                {
                    "Only test station (engineer report)"
                }
            }
        };
}
