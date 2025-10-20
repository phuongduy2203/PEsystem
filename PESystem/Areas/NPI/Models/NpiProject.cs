using System;

namespace PESystem.Areas.NPI.Models;

public class NpiProject
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
