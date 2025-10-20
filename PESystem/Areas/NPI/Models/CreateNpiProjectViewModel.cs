using System.ComponentModel.DataAnnotations;

namespace PESystem.Areas.NPI.Models
{
    public class CreateNpiProjectViewModel
    {
        [Required]
        [Display(Name = "Project name")]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Display(Name = "Owner")]
        [StringLength(200)]
        public string Owner { get; set; } = string.Empty;
    }
}
