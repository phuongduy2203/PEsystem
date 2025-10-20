using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace PESystem.Services
{
    public interface INpiDocumentService
    {
        IReadOnlyList<NpiFolderTemplate> FolderTemplates { get; }

        Task<IReadOnlyList<NpiProjectSummary>> GetProjectsAsync(CancellationToken cancellationToken = default);

        Task<NpiProjectSummary> CreateProjectAsync(string name, string owner, CancellationToken cancellationToken = default);

        Task<NpiProjectDetail?> GetProjectDetailAsync(Guid projectId, CancellationToken cancellationToken = default);

        Task<NpiDocumentRecord?> UploadDocumentAsync(
            Guid projectId,
            string category,
            string item,
            string documentName,
            IFormFile file,
            string uploadedBy,
            CancellationToken cancellationToken = default);

        Task<NpiDocumentFileResult?> GetDocumentFileAsync(Guid projectId, Guid documentId, Guid versionId, CancellationToken cancellationToken = default);

        Task<bool> DeleteVersionAsync(Guid projectId, Guid documentId, Guid versionId, CancellationToken cancellationToken = default);
    }
}
