using Microsoft.AspNetCore.Http;
using PESystem.Areas.NPI.Models;

namespace PESystem.Areas.NPI.Services
{
    public interface INpiProjectService
    {
        IReadOnlyList<NpiFolderDefinition> FolderDefinitions { get; }
        IReadOnlyList<NpiProject> GetProjects();
        NpiProject? GetProject(string projectId);
        Task<OperationResult> CreateProjectAsync(string name, string owner);
        Task<OperationResult> UploadDocumentAsync(string projectId, string relativeFolder, IFormFile file, string uploadedBy);
        Task<OperationResult> DeleteDocumentAsync(string projectId, string documentId);
        (Stream Stream, string ContentType, string FileName)? DownloadDocument(string projectId, string documentId);
    }

    public record OperationResult(bool Succeeded, string Message)
    {
        public static OperationResult Success(string message) => new(true, message);
        public static OperationResult Failure(string message) => new(false, message);
    }
}
