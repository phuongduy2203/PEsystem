using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace PESystem.Areas.NPI.ViewModels
{
    public class UploadDocumentInputModel
    {
        [Required]
        public string ProjectId { get; set; } = string.Empty;

        [Required]
        public string RelativeFolder { get; set; } = string.Empty;

        [Required]
        public IFormFile? File { get; set; }
    }
}
