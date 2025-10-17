using System;
using System.Text.Json.Serialization;

namespace PESystem.Areas.NPI.Models
{
    public class NpiProjectMetadata
    {
        [JsonPropertyName("key")]
        public string ProjectKey { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("owner")]
        public string Owner { get; set; } = string.Empty;

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }
    }
}
