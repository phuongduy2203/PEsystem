using System;
using System.Collections.Generic;

namespace PESystem.Services
{
    public record NpiFolderTemplate(string Category, string CategoryFolderName, IReadOnlyList<NpiFolderItem> Items);

    public record NpiFolderItem(string Name, string FolderName);

    public class NpiProjectSummary
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Owner { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string FolderName { get; set; } = string.Empty;
        public int DocumentCount { get; set; }
    }

    public class NpiProjectDetail
    {
        public NpiProjectSummary Project { get; set; } = new();
        public List<NpiDocumentRecord> Documents { get; set; } = new();
    }

    public class NpiDocumentRecord
    {
        public Guid DocumentId { get; set; }
        public string DocumentName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string CategoryFolder { get; set; } = string.Empty;
        public string Item { get; set; } = string.Empty;
        public string ItemFolder { get; set; } = string.Empty;
        public List<NpiDocumentVersionRecord> Versions { get; set; } = new();
    }

    public class NpiDocumentVersionRecord
    {
        public Guid VersionId { get; set; }
        public int VersionNumber { get; set; }
        public string StoredFileName { get; set; } = string.Empty;
        public string OriginalFileName { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public DateTime UploadedAt { get; set; }
        public string UploadedBy { get; set; } = string.Empty;
    }

    public class NpiDocumentFileResult
    {
        public string PhysicalPath { get; set; } = string.Empty;
        public string OriginalFileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = "application/octet-stream";
    }
}
