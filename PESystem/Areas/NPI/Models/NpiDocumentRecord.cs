using System;

namespace PESystem.Areas.NPI.Models;

public class NpiDocumentRecord
{
    public Guid Id { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public string StoredFileName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Item { get; set; } = string.Empty;
    public int Version { get; set; }
    public string UploadedBy { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
}
