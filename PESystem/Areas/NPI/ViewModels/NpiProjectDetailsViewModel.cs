using PESystem.Areas.NPI.Models;

namespace PESystem.Areas.NPI.ViewModels
{
    public class NpiProjectDetailsViewModel
    {
        public NpiProject Project { get; init; } = null!;
        public List<NpiFolderGroupViewModel> FolderGroups { get; init; } = new();
        public string? StatusMessage { get; set; }
        public string? ErrorMessage { get; set; }
    }

    public class NpiFolderGroupViewModel
    {
        public string Name { get; set; } = string.Empty;
        public List<NpiLeafFolderViewModel> Folders { get; set; } = new();
    }

    public class NpiLeafFolderViewModel
    {
        public string RelativePath { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public List<NpiDocumentViewModel> Documents { get; set; } = new();
    }

    public class NpiDocumentViewModel
    {
        public string Id { get; set; } = string.Empty;
        public string OriginalFileName { get; set; } = string.Empty;
        public int Version { get; set; }
        public DateTime UploadedAtUtc { get; set; }
        public string UploadedBy { get; set; } = string.Empty;
    }
}
