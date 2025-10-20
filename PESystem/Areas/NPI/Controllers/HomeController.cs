using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PESystem.Areas.NPI.Models;
using PESystem.Areas.NPI.Services;

namespace PESystem.Areas.NPI.Controllers;

[Area("NPI")]
[Authorize(Policy = "NpiAccess")]
public class HomeController : Controller
{
    private readonly INpiDocumentService _documentService;

    public HomeController(INpiDocumentService documentService)
    {
        _documentService = documentService;
    }

    public async Task<IActionResult> Index()
    {
        var model = new NpiProjectIndexViewModel
        {
            Projects = await _documentService.GetProjectsAsync(),
            NewProject = new NpiProjectInputModel(),
            StatusMessage = TempData["StatusMessage"] as string,
            ErrorMessage = TempData["ErrorMessage"] as string
        };

        return View(model);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(NpiProjectInputModel input)
    {
        if (!ModelState.IsValid)
        {
            var model = new NpiProjectIndexViewModel
            {
                Projects = await _documentService.GetProjectsAsync(),
                NewProject = input,
                StatusMessage = TempData["StatusMessage"] as string,
                ErrorMessage = TempData["ErrorMessage"] as string
            };

            return View("Index", model);
        }

        try
        {
            var project = await _documentService.CreateProjectAsync(input.Name, input.Owner);
            TempData["StatusMessage"] = $"Project '{project.Name}' created successfully.";
            return RedirectToAction(nameof(Details), new { id = project.Id });
        }
        catch (Exception ex)
        {
            TempData["ErrorMessage"] = ex.Message;
            return RedirectToAction(nameof(Index));
        }
    }

    public async Task<IActionResult> Details(Guid id)
    {
        var project = await _documentService.GetProjectAsync(id);
        if (project == null)
        {
            return NotFound();
        }

        var documents = await _documentService.GetDocumentsAsync(id);
        var structure = _documentService.GetStructure();

        var categories = structure
            .Select(category => new NpiCategoryViewModel
            {
                Name = category.Name,
                Items = category.Items
                    .Select(item => new NpiItemViewModel
                    {
                        Name = item,
                        Documents = documents
                            .Where(d => string.Equals(d.Category, category.Name, StringComparison.OrdinalIgnoreCase)
                                        && string.Equals(d.Item, item, StringComparison.OrdinalIgnoreCase))
                            .OrderByDescending(d => d.UploadedAt)
                            .ThenByDescending(d => d.Version)
                            .ToList()
                    })
                    .ToList()
            })
            .ToList();

        var model = new NpiProjectDetailViewModel
        {
            Project = project,
            Categories = categories,
            Upload = new NpiUploadInputModel
            {
                ProjectId = id,
                UploadedBy = User?.Identity?.Name ?? string.Empty
            },
            StatusMessage = TempData["StatusMessage"] as string,
            ErrorMessage = TempData["ErrorMessage"] as string
        };

        return View(model);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Upload(NpiUploadInputModel input)
    {
        if (!ModelState.IsValid)
        {
            TempData["ErrorMessage"] = "Please provide all required information for the upload.";
            return RedirectToAction(nameof(Details), new { id = input.ProjectId });
        }

        if (input.File == null || input.File.Length == 0)
        {
            TempData["ErrorMessage"] = "The selected file is empty.";
            return RedirectToAction(nameof(Details), new { id = input.ProjectId });
        }

        try
        {
            await _documentService.UploadDocumentAsync(input.ProjectId, input.Category, input.Item, input.File, input.UploadedBy);
            TempData["StatusMessage"] = $"Document '{input.File.FileName}' uploaded successfully.";
        }
        catch (Exception ex)
        {
            TempData["ErrorMessage"] = ex.Message;
        }

        return RedirectToAction(nameof(Details), new { id = input.ProjectId });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteDocument(Guid projectId, Guid documentId)
    {
        var deleted = await _documentService.DeleteDocumentAsync(projectId, documentId);
        TempData[deleted ? "StatusMessage" : "ErrorMessage"] = deleted
            ? "Document deleted successfully."
            : "Unable to delete the selected document.";

        return RedirectToAction(nameof(Details), new { id = projectId });
    }

    public async Task<IActionResult> Download(Guid projectId, Guid documentId)
    {
        var (record, filePath) = await _documentService.GetDocumentFileAsync(projectId, documentId);
        if (record == null || string.IsNullOrEmpty(filePath) || !System.IO.File.Exists(filePath))
        {
            return NotFound();
        }

        var contentType = GetContentType(record.OriginalFileName);
        return PhysicalFile(filePath, contentType, record.OriginalFileName);
    }

    private static string GetContentType(string fileName)
    {
        var extension = System.IO.Path.GetExtension(fileName)?.ToLowerInvariant();
        return extension switch
        {
            ".pdf" => "application/pdf",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".xls" => "application/vnd.ms-excel",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".doc" => "application/msword",
            ".pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".ppt" => "application/vnd.ms-powerpoint",
            ".txt" => "text/plain",
            ".csv" => "text/csv",
            _ => "application/octet-stream"
        };
    }
}
