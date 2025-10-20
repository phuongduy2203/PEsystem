using System.Collections.Generic;

namespace PESystem.Areas.NPI.Models;

public class NpiProjectIndexViewModel
{
    public IReadOnlyList<NpiProject> Projects { get; set; } = new List<NpiProject>();
    public NpiProjectInputModel NewProject { get; set; } = new();
    public string? StatusMessage { get; set; }
    public string? ErrorMessage { get; set; }
}
