using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace PESystem.Areas.NPI.Models.ViewModels
{
    public class NpiIndexViewModel
    {
        public IReadOnlyList<NpiProjectMetadata> Projects { get; set; } = Array.Empty<NpiProjectMetadata>();

        public NpiProjectDetailViewModel? SelectedProject { get; set; }

        public CreateProjectViewModel CreateProject { get; set; } = new();
    }

    public class NpiProjectDetailViewModel
    {
        public NpiProjectMetadata Project { get; set; } = null!;

        public string RelativePath { get; set; } = string.Empty;

        public IReadOnlyList<NpiBreadcrumbItem> Breadcrumbs { get; set; } = Array.Empty<NpiBreadcrumbItem>();

        public IReadOnlyList<NpiFolderViewModel> Folders { get; set; } = Array.Empty<NpiFolderViewModel>();

        public IReadOnlyList<NpiDocumentViewModel> Documents { get; set; } = Array.Empty<NpiDocumentViewModel>();
    }

    public class NpiFolderViewModel
    {
        public string Name { get; set; } = string.Empty;
        public string RelativePath { get; set; } = string.Empty;
    }

    public class NpiDocumentViewModel
    {
        public string Id { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string StoredFileName { get; set; } = string.Empty;
        public int Version { get; set; }
        public DateTime UploadedAt { get; set; }
        public string UploadedBy { get; set; } = string.Empty;
        public string RelativePath { get; set; } = string.Empty;
    }

    public class NpiBreadcrumbItem
    {
        public string Title { get; set; } = string.Empty;
        public string RelativePath { get; set; } = string.Empty;
    }

    public class CreateProjectViewModel
    {
        [Required]
        [Display(Name = "Project name")]
        [StringLength(200, ErrorMessage = "{0} không được vượt quá {1} ký tự.")]
        public string? Name { get; set; }

        [Required]
        [Display(Name = "Owner")]
        [StringLength(200, ErrorMessage = "{0} không được vượt quá {1} ký tự.")]
        public string? Owner { get; set; }
    }
}
