namespace PESystem.Areas.NPI.Models
{
    public class NpiProject
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Owner { get; set; } = string.Empty;
        public DateTime CreatedAtUtc { get; set; }
        public IReadOnlyList<NpiDocument> Documents { get; set; } = Array.Empty<NpiDocument>();
    }

    public class NpiDocument
    {
        public string Id { get; set; } = string.Empty;
        public string Folder { get; set; } = string.Empty;
        public string OriginalFileName { get; set; } = string.Empty;
        public string StoredFileName { get; set; } = string.Empty;
        public int Version { get; set; }
        public DateTime UploadedAtUtc { get; set; }
        public string UploadedBy { get; set; } = string.Empty;
    }
}
