using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using PESystem.Areas.NPI.Models;

namespace PESystem.Areas.NPI.Services;

public interface INpiDocumentService
{
    IReadOnlyList<NpiCategoryDefinition> GetStructure();
    Task<IReadOnlyList<NpiProject>> GetProjectsAsync();
    Task<NpiProject?> GetProjectAsync(Guid projectId);
    Task<NpiProject> CreateProjectAsync(string name, string owner);
    Task<IReadOnlyList<NpiDocumentRecord>> GetDocumentsAsync(Guid projectId);
    Task<NpiDocumentRecord?> GetDocumentAsync(Guid projectId, Guid documentId);
    Task<(NpiDocumentRecord? Record, string? FilePath)> GetDocumentFileAsync(Guid projectId, Guid documentId);
    Task<NpiDocumentRecord> UploadDocumentAsync(Guid projectId, string category, string item, IFormFile file, string uploadedBy);
    Task<bool> DeleteDocumentAsync(Guid projectId, Guid documentId);
}
