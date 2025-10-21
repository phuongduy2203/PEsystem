namespace PESystem.Areas.NPI.ViewModels
{
    public class NpiProjectIndexViewModel
    {
        public List<NpiProjectListItemViewModel> Projects { get; set; } = new();
        public string? StatusMessage { get; set; }
        public string? ErrorMessage { get; set; }
    }

    public class NpiProjectListItemViewModel
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Owner { get; set; } = string.Empty;
        public DateTime CreatedAtUtc { get; set; }
        public int DocumentCount { get; set; }
    }
}
