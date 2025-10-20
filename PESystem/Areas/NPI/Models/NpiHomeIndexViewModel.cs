using PESystem.Services;

namespace PESystem.Areas.NPI.Models
{
    public class NpiHomeIndexViewModel
    {
        public List<NpiProjectSummary> Projects { get; set; } = new();

        public CreateNpiProjectViewModel NewProject { get; set; } = new();
    }
}
