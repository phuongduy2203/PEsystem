using System.ComponentModel.DataAnnotations;

namespace PESystem.Areas.NPI.ViewModels
{
    public class CreateProjectInputModel
    {
        [Required]
        [StringLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Owner { get; set; } = string.Empty;
    }
}
