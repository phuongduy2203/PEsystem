using PESystem.Services;

namespace PESystem.Areas.NPI.Models
{
    public class NpiProjectDetailsViewModel
    {
        public NpiProjectSummary Project { get; set; } = new();

        public List<NpiDocumentRecord> Documents { get; set; } = new();

        public UploadNpiDocumentViewModel UploadModel { get; set; } = new();

        public IReadOnlyList<NpiFolderTemplate> Structure { get; set; } = Array.Empty<NpiFolderTemplate>();
    }
}
