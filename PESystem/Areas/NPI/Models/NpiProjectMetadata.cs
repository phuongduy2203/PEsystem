namespace PESystem.Areas.NPI.Models
{
    public class NpiProjectMetadata
    {
        public string Id { get; set; } = Guid.NewGuid().ToString("N");
        public string Name { get; set; } = string.Empty;
        public string Owner { get; set; } = string.Empty;
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public List<NpiDocumentMetadata> Documents { get; set; } = new();
    }

    public class NpiDocumentMetadata
    {
        public string Id { get; set; } = Guid.NewGuid().ToString("N");
        public string Folder { get; set; } = string.Empty;
        public string OriginalFileName { get; set; } = string.Empty;
        public string StoredFileName { get; set; } = string.Empty;
        public int Version { get; set; }
        public DateTime UploadedAtUtc { get; set; } = DateTime.UtcNow;
        public string UploadedBy { get; set; } = string.Empty;
    }
}
