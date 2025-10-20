using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PESystem.Areas.NPI.Models;
using PESystem.Services;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace PESystem.Areas.NPI.Controllers
{
    [Area("NPI")]
    [Authorize(Policy = "NPIAccess")]
    public class HomeController : Controller
    {
        private readonly INpiDocumentService _documentService;
        private readonly ILogger<HomeController> _logger;

        public HomeController(INpiDocumentService documentService, ILogger<HomeController> logger)
        {
            _documentService = documentService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> Index(CancellationToken cancellationToken)
        {
            var projects = await _documentService.GetProjectsAsync(cancellationToken);
            var viewModel = new NpiHomeIndexViewModel
            {
                Projects = projects.ToList(),
                NewProject = new CreateNpiProjectViewModel()
            };

            return View(viewModel);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateProject(CreateNpiProjectViewModel model, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                var projects = await _documentService.GetProjectsAsync(cancellationToken);
                var vm = new NpiHomeIndexViewModel { Projects = projects.ToList(), NewProject = model };
                return View("Index", vm);
            }

            try
            {
                var project = await _documentService.CreateProjectAsync(model.Name, model.Owner, cancellationToken);
                TempData["Success"] = $"Project '{project.Name}' was created successfully.";
                return RedirectToAction(nameof(Details), new { id = project.Id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create NPI project {Name}", model.Name);
                ModelState.AddModelError(string.Empty, "Không thể tạo project mới. Vui lòng thử lại sau.");
                var projects = await _documentService.GetProjectsAsync(cancellationToken);
                var vm = new NpiHomeIndexViewModel { Projects = projects.ToList(), NewProject = model };
                return View("Index", vm);
            }
        }

        [HttpGet]
        public async Task<IActionResult> Details(Guid id, CancellationToken cancellationToken)
        {
            var detail = await _documentService.GetProjectDetailAsync(id, cancellationToken);
            if (detail == null)
            {
                return NotFound();
            }

            var defaultCategory = _documentService.FolderTemplates.FirstOrDefault();
            var defaultItem = defaultCategory?.Items.FirstOrDefault();

            var viewModel = new NpiProjectDetailsViewModel
            {
                Project = detail.Project,
                Documents = detail.Documents,
                UploadModel = new UploadNpiDocumentViewModel
                {
                    ProjectId = detail.Project.Id,
                    Category = defaultCategory?.Category ?? string.Empty,
                    Item = defaultItem?.Name ?? string.Empty,
                    DocumentName = string.Empty
                },
                Structure = _documentService.FolderTemplates
            };

            if (TempData.TryGetValue("Error", out var errorMessage))
            {
                ViewData["Error"] = errorMessage;
            }

            if (TempData.TryGetValue("Success", out var successMessage))
            {
                ViewData["Success"] = successMessage;
            }

            return View(viewModel);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UploadDocument(UploadNpiDocumentViewModel model, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                TempData["Error"] = "Vui lòng kiểm tra lại thông tin tài liệu.";
                return RedirectToAction(nameof(Details), new { id = model.ProjectId });
            }

            if (model.File == null || model.File.Length == 0)
            {
                TempData["Error"] = "Vui lòng chọn file cần upload.";
                return RedirectToAction(nameof(Details), new { id = model.ProjectId });
            }

            try
            {
                var uploadedBy = GetDisplayName();
                var document = await _documentService.UploadDocumentAsync(
                    model.ProjectId,
                    model.Category,
                    model.Item,
                    model.DocumentName,
                    model.File,
                    uploadedBy,
                    cancellationToken);

                if (document == null)
                {
                    TempData["Error"] = "Project không tồn tại.";
                }
                else
                {
                    TempData["Success"] = $"Upload tài liệu '{document.DocumentName}' thành công.";
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to upload document for project {ProjectId}", model.ProjectId);
                TempData["Error"] = "Không thể upload tài liệu. Vui lòng thử lại.";
            }

            return RedirectToAction(nameof(Details), new { id = model.ProjectId });
        }

        [HttpGet]
        public async Task<IActionResult> Download(Guid projectId, Guid documentId, Guid versionId, CancellationToken cancellationToken)
        {
            var fileResult = await _documentService.GetDocumentFileAsync(projectId, documentId, versionId, cancellationToken);
            if (fileResult == null)
            {
                return NotFound();
            }

            var stream = System.IO.File.OpenRead(fileResult.PhysicalPath);
            return File(stream, fileResult.ContentType, fileResult.OriginalFileName);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteVersion(Guid projectId, Guid documentId, Guid versionId, CancellationToken cancellationToken)
        {
            try
            {
                var deleted = await _documentService.DeleteVersionAsync(projectId, documentId, versionId, cancellationToken);
                TempData[deleted ? "Success" : "Error"] = deleted
                    ? "Xóa tài liệu thành công."
                    : "Không tìm thấy tài liệu để xóa.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete document version {VersionId} from project {ProjectId}", versionId, projectId);
                TempData["Error"] = "Không thể xóa tài liệu. Vui lòng thử lại.";
            }

            return RedirectToAction(nameof(Details), new { id = projectId });
        }

        private string GetDisplayName()
        {
            var fullName = User.FindFirst("FullName")?.Value;
            if (!string.IsNullOrWhiteSpace(fullName))
            {
                return fullName;
            }

            var email = User.FindFirst(ClaimTypes.Email)?.Value;
            if (!string.IsNullOrWhiteSpace(email))
            {
                return email;
            }

            return User.Identity?.Name ?? "Unknown";
        }
    }
}
