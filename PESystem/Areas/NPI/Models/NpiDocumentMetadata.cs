using System;
using System.Text.Json.Serialization;

namespace PESystem.Areas.NPI.Models
{
    public class NpiDocumentMetadata
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString("N");

        [JsonPropertyName("name")]
        public string OriginalName { get; set; } = string.Empty;

        [JsonPropertyName("stored")]
        public string StoredFileName { get; set; } = string.Empty;

        [JsonPropertyName("version")]
        public int Version { get; set; }

        [JsonPropertyName("uploadedAt")]
        public DateTime UploadedAt { get; set; }

        [JsonPropertyName("uploadedBy")]
        public string UploadedBy { get; set; } = string.Empty;
    }
}
