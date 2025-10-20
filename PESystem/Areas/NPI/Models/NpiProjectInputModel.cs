using System.ComponentModel.DataAnnotations;

namespace PESystem.Areas.NPI.Models;

public class NpiProjectInputModel
{
    [Required]
    [StringLength(150)]
    [Display(Name = "Project name")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(150)]
    [Display(Name = "Owner")]
    public string Owner { get; set; } = string.Empty;
}
