using System.ComponentModel.DataAnnotations;

namespace PESystem.Areas.NPI.ViewModels
{
    public class DeleteDocumentInputModel
    {
        [Required]
        public string ProjectId { get; set; } = string.Empty;

        [Required]
        public string DocumentId { get; set; } = string.Empty;
    }
}
