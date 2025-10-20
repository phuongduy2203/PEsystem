using System.Collections.Generic;

namespace PESystem.Areas.NPI.Models;

public class NpiProjectDetailViewModel
{
    public NpiProject Project { get; set; } = new();
    public IReadOnlyList<NpiCategoryViewModel> Categories { get; set; } = new List<NpiCategoryViewModel>();
    public NpiUploadInputModel Upload { get; set; } = new();
    public string? StatusMessage { get; set; }
    public string? ErrorMessage { get; set; }
}

public class NpiCategoryViewModel
{
    public string Name { get; set; } = string.Empty;
    public IReadOnlyList<NpiItemViewModel> Items { get; set; } = new List<NpiItemViewModel>();
}

public class NpiItemViewModel
{
    public string Name { get; set; } = string.Empty;
    public IReadOnlyList<NpiDocumentRecord> Documents { get; set; } = new List<NpiDocumentRecord>();
}
