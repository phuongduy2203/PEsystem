using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Logging;
using PESystem.Areas.NPI.Models.ViewModels;
using PESystem.Areas.NPI.Services;

namespace PESystem.Areas.NPI.Controllers
{
    [Area("NPI")]
    [Authorize(Policy = "NpiAccess")]
    public class HomeController : Controller
    {
        private readonly NpiDocumentService _documentService;
        private readonly ILogger<HomeController> _logger;

        public HomeController(NpiDocumentService documentService, ILogger<HomeController> logger)
        {
            _documentService = documentService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> Index(string? projectKey = null, string? path = null)
        {
            var projects = await _documentService.GetProjectsAsync();
            NpiProjectDetailViewModel? detail = null;

            if (!string.IsNullOrWhiteSpace(projectKey))
            {
                detail = await _documentService.GetProjectDetailAsync(projectKey, path);
                if (detail == null)
                {
                    TempData["ErrorMessage"] = "Không tìm thấy project đã chọn.";
                    return RedirectToAction(nameof(Index));
                }
            }

            var viewModel = new NpiIndexViewModel
            {
                Projects = projects,
                SelectedProject = detail
            };

            if (TempData.TryGetValue("ErrorMessage", out var error))
            {
                ViewData["ErrorMessage"] = error;
            }

            if (TempData.TryGetValue("SuccessMessage", out var success))
            {
                ViewData["SuccessMessage"] = success;
            }

            return View(viewModel);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateProject(CreateProjectViewModel model)
        {
            if (!ModelState.IsValid)
            {
                var projects = await _documentService.GetProjectsAsync();
                var vm = new NpiIndexViewModel
                {
                    Projects = projects,
                    SelectedProject = null,
                    CreateProject = model
                };
                ViewBag.ShowCreateModal = true;
                return View("Index", vm);
            }

            try
            {
                var project = await _documentService.CreateProjectAsync(model.Name!, model.Owner!);
                TempData["SuccessMessage"] = $"Project '{project.Name}' đã được tạo.";
                return RedirectToAction(nameof(Index), new { projectKey = project.ProjectKey });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create NPI project");
                ModelState.AddModelError(string.Empty, ex.Message);
                var projects = await _documentService.GetProjectsAsync();
                var vm = new NpiIndexViewModel
                {
                    Projects = projects,
                    SelectedProject = null,
                    CreateProject = model
                };
                ViewBag.ShowCreateModal = true;
                return View("Index", vm);
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UploadDocument(string projectKey, string? path, IFormFile? file)
        {
            if (string.IsNullOrWhiteSpace(projectKey))
            {
                TempData["ErrorMessage"] = "Thiếu thông tin project.";
                return RedirectToAction(nameof(Index));
            }

            if (file == null || file.Length == 0)
            {
                TempData["ErrorMessage"] = "Vui lòng chọn tài liệu hợp lệ.";
                return RedirectToAction(nameof(Index), new { projectKey, path });
            }

            try
            {
                await _documentService.UploadDocumentAsync(projectKey, path, file);
                TempData["SuccessMessage"] = $"Đã tải lên '{file.FileName}'.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to upload NPI document");
                TempData["ErrorMessage"] = ex.Message;
            }

            return RedirectToAction(nameof(Index), new { projectKey, path });
        }

        [HttpGet]
        public async Task<IActionResult> DownloadDocument(string projectKey, string documentId, string? path)
        {
            if (string.IsNullOrWhiteSpace(projectKey) || string.IsNullOrWhiteSpace(documentId))
            {
                TempData["ErrorMessage"] = "Không tìm thấy tài liệu.";
                return RedirectToAction(nameof(Index));
            }

            var document = await _documentService.GetDocumentAsync(projectKey, documentId, path);
            if (document == null)
            {
                TempData["ErrorMessage"] = "Không tìm thấy tài liệu.";
                return RedirectToAction(nameof(Index), new { projectKey, path });
            }

            var provider = new FileExtensionContentTypeProvider();
            if (!provider.TryGetContentType(document.Metadata.StoredFileName, out var contentType))
            {
                contentType = "application/octet-stream";
            }

            var originalName = Path.GetFileNameWithoutExtension(document.Metadata.OriginalName);
            var extension = Path.GetExtension(document.Metadata.OriginalName);
            var downloadName = $"{originalName}_v{document.Metadata.Version:000}{extension}";
            return PhysicalFile(document.PhysicalPath, contentType, downloadName);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteDocument(string projectKey, string documentId, string? path)
        {
            if (string.IsNullOrWhiteSpace(projectKey) || string.IsNullOrWhiteSpace(documentId))
            {
                TempData["ErrorMessage"] = "Không tìm thấy tài liệu.";
                return RedirectToAction(nameof(Index));
            }

            try
            {
                var deleted = await _documentService.DeleteDocumentAsync(projectKey, documentId, path);
                TempData[deleted ? "SuccessMessage" : "ErrorMessage"] = deleted ? "Đã xoá tài liệu." : "Không tìm thấy tài liệu.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete NPI document");
                TempData["ErrorMessage"] = ex.Message;
            }

            return RedirectToAction(nameof(Index), new { projectKey, path });
        }
    }
}
