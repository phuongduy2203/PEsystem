using System.Collections.Generic;

namespace PESystem.Areas.NPI.Models;

public class NpiCategoryDefinition
{
    public string Name { get; init; } = string.Empty;
    public IReadOnlyList<string> Items { get; init; } = new List<string>();
}
