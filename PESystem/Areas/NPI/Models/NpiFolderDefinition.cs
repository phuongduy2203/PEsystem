namespace PESystem.Areas.NPI.Models
{
    public record NpiFolderDefinition(string RelativePath)
    {
        public string[] Segments => RelativePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        public string Root => Segments.Length > 0 ? Segments[0] : RelativePath;
        public string DisplayName => Segments.Length > 0 ? Segments[^1] : RelativePath;
    }
}
