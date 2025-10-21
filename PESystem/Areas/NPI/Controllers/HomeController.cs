using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PESystem.Areas.NPI.Services;
using PESystem.Areas.NPI.ViewModels;

namespace PESystem.Areas.NPI.Controllers
{
    [Area("NPI")]
    [Authorize(Policy = "NPIAccess")]
    public class HomeController : Controller
    {
        private const string StatusMessageKey = "StatusMessage";
        private const string ErrorMessageKey = "ErrorMessage";

        private readonly INpiProjectService _projectService;
        private readonly ILogger<HomeController> _logger;

        public HomeController(INpiProjectService projectService, ILogger<HomeController> logger)
        {
            _projectService = projectService;
            _logger = logger;
        }

        public IActionResult Index()
        {
            var projects = _projectService.GetProjects();
            var model = new NpiProjectIndexViewModel
            {
                Projects = projects.Select(p => new NpiProjectListItemViewModel
                {
                    Id = p.Id,
                    Name = p.Name,
                    Owner = p.Owner,
                    CreatedAtUtc = p.CreatedAtUtc,
                    DocumentCount = p.Documents.Count
                }).ToList(),
                StatusMessage = TempData[StatusMessageKey] as string,
                ErrorMessage = TempData[ErrorMessageKey] as string
            };

            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateProject(CreateProjectInputModel input)
        {
            if (!ModelState.IsValid)
            {
                TempData[ErrorMessageKey] = "Please provide both a project name and an owner.";
                return RedirectToAction(nameof(Index));
            }

            try
            {
                var result = await _projectService.CreateProjectAsync(input.Name, input.Owner).ConfigureAwait(false);
                TempData[result.Succeeded ? StatusMessageKey : ErrorMessageKey] = result.Message;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create NPI project {Name}", input.Name);
                TempData[ErrorMessageKey] = "An unexpected error occurred while creating the project.";
            }

            return RedirectToAction(nameof(Index));
        }

        public IActionResult Details(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return NotFound();
            }

            var project = _projectService.GetProject(id);
            if (project == null)
            {
                return NotFound();
            }

            var groups = _projectService.FolderDefinitions
                .GroupBy(fd => fd.Root, StringComparer.OrdinalIgnoreCase)
                .Select(group => new NpiFolderGroupViewModel
                {
                    Name = group.Key,
                    Folders = group
                        .OrderBy(fd => fd.DisplayName, StringComparer.OrdinalIgnoreCase)
                        .Select(fd => new NpiLeafFolderViewModel
                        {
                            RelativePath = fd.RelativePath,
                            DisplayName = fd.DisplayName,
                            Documents = project.Documents
                                .Where(d => string.Equals(d.Folder, fd.RelativePath, StringComparison.OrdinalIgnoreCase))
                                .OrderByDescending(d => d.Version)
                                .Select(d => new NpiDocumentViewModel
                                {
                                    Id = d.Id,
                                    OriginalFileName = d.OriginalFileName,
                                    Version = d.Version,
                                    UploadedAtUtc = d.UploadedAtUtc,
                                    UploadedBy = d.UploadedBy
                                }).ToList()
                        }).ToList()
                })
                .OrderBy(g => g.Name, StringComparer.OrdinalIgnoreCase)
                .ToList();

            var model = new NpiProjectDetailsViewModel
            {
                Project = project,
                FolderGroups = groups,
                StatusMessage = TempData[StatusMessageKey] as string,
                ErrorMessage = TempData[ErrorMessageKey] as string
            };

            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UploadDocument(UploadDocumentInputModel input)
        {
            if (!ModelState.IsValid)
            {
                TempData[ErrorMessageKey] = "Please choose a file and folder before uploading.";
                return RedirectToAction(nameof(Details), new { id = input.ProjectId });
            }

            try
            {
                var userName = User?.Identity?.Name;
                var result = await _projectService
                    .UploadDocumentAsync(input.ProjectId, input.RelativeFolder, input.File!, userName ?? "Unknown")
                    .ConfigureAwait(false);
                TempData[result.Succeeded ? StatusMessageKey : ErrorMessageKey] = result.Message;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to upload document for project {ProjectId}", input.ProjectId);
                TempData[ErrorMessageKey] = "An unexpected error occurred while uploading the document.";
            }

            return RedirectToAction(nameof(Details), new { id = input.ProjectId });
        }

        public IActionResult DownloadDocument(string projectId, string documentId)
        {
            var fileResult = _projectService.DownloadDocument(projectId, documentId);
            if (fileResult == null)
            {
                return NotFound();
            }

            return File(fileResult.Value.Stream, fileResult.Value.ContentType, fileResult.Value.FileName);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteDocument(DeleteDocumentInputModel input)
        {
            if (!ModelState.IsValid)
            {
                TempData[ErrorMessageKey] = "Invalid document reference.";
                return RedirectToAction(nameof(Details), new { id = input.ProjectId });
            }

            try
            {
                var result = await _projectService.DeleteDocumentAsync(input.ProjectId, input.DocumentId).ConfigureAwait(false);
                TempData[result.Succeeded ? StatusMessageKey : ErrorMessageKey] = result.Message;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete document {DocumentId} from project {ProjectId}", input.DocumentId, input.ProjectId);
                TempData[ErrorMessageKey] = "An unexpected error occurred while deleting the document.";
            }

            return RedirectToAction(nameof(Details), new { id = input.ProjectId });
        }
    }
}
