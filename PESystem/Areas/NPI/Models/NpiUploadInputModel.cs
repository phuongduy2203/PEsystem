using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace PESystem.Areas.NPI.Models;

public class NpiUploadInputModel
{
    [Required]
    public Guid ProjectId { get; set; }

    [Required]
    public string Category { get; set; } = string.Empty;

    [Required]
    public string Item { get; set; } = string.Empty;

    [Required]
    [Display(Name = "Document")]
    public IFormFile? File { get; set; }

    [Required]
    [StringLength(150)]
    [Display(Name = "Updated by")]
    public string UploadedBy { get; set; } = string.Empty;
}
