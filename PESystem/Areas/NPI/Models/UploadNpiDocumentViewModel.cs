using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace PESystem.Areas.NPI.Models
{
    public class UploadNpiDocumentViewModel
    {
        [Required]
        public Guid ProjectId { get; set; }

        [Required]
        [Display(Name = "Category")]
        public string Category { get; set; } = string.Empty;

        [Required]
        [Display(Name = "Folder")]
        public string Item { get; set; } = string.Empty;

        [Required]
        [Display(Name = "Document name")]
        [StringLength(200)]
        public string DocumentName { get; set; } = string.Empty;

        [Required]
        [Display(Name = "File")]
        public IFormFile? File { get; set; }
    }
}
