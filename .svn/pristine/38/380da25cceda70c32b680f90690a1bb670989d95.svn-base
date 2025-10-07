using System.ComponentModel.DataAnnotations;

namespace PESystem.Models
{
    public class ResetPasswordModel
    {
        [Required]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Otp { get; set; } = string.Empty;

        [Required]
        [DataType(DataType.Password)]
        public string NewPassword { get; set; } = string.Empty;

        [Required]
        [DataType(DataType.Password)]
        [Compare("NewPassword", ErrorMessage = "Mật khẩu không khớp!")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
