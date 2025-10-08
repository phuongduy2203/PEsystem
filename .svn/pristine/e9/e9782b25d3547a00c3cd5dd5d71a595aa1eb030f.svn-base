using Microsoft.AspNetCore.Authentication.Cookies;
using PESystem.Helpers;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using PESystem.Models;
using Microsoft.AspNetCore.Identity;

namespace PESystem.Controllers
{
    public class AccountController : Controller
    {
        private readonly ApplicationDbContext _context;

        public AccountController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult Login()
        {
            return View();
        }
        [HttpPost]
        public async Task<IActionResult> Login(LoginModel model)
        {
            if (ModelState.IsValid)
            {
                var user = await _context.Users
                    .SingleOrDefaultAsync(u => u.Username == model.Username);

                if (user != null)
                {
                    var hasher = new PasswordHasher<User>();
                    var result = hasher.VerifyHashedPassword(user, user.Password, model.Password);

                    if (result == PasswordVerificationResult.Success)
                    {
                        // Tạo Claims cho người dùng
                        var claims = new List<Claim>
                        {
                            new Claim(ClaimTypes.Name, user.Username),
                            new Claim(ClaimTypes.Role, user.Role),
                            new Claim("AllowedAreas", string.Join(",", user.AllowedAreas)),
                            new Claim("FullName", user.FullName),
                            new Claim("Email", user.Email),
                            new Claim("Department", user.Department)
                        };

                        var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);

                        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(claimsIdentity));

                        return RedirectToAction("Home", "Home");
                    }
                }

                ModelState.AddModelError("", "Username hoặc Password không đúng.");
            }

            return View(model);
        }

        [HttpGet]
        public IActionResult Register()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Register(RegisterModel model)
        {
            if (ModelState.IsValid)
            {
                var userExists = await _context.Users.AnyAsync(u => u.Username == model.Username);
                if (userExists)
                {
                    ModelState.AddModelError("", "Username đã tồn tại.");
                    return View(model);
                }

                var hasher = new PasswordHasher<User>();
                var user = new User
                {
                    Username = model.Username,
                    Password = hasher.HashPassword(null, model.Password),
                    FullName = model.FullName,
                    Email = model.Email,
                    Department = model.Department,  
                    Role = "User",
                    AllowedAreas = new List<string> {""} // Giá trị mặc định
                };
                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                return RedirectToAction("Login");
            }

            return View(model);
        }


        //Khi username không có quyền truy cập, sẽ điều hướng đến đây!
        [HttpGet]
        public IActionResult AccessDenied()
        {
            return View();
        }


        [HttpPost]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme); //Xóa xác thực người dùng( xóa session)

            //// Xóa cache để ngăn người dùng quay lại trang trước sau khi đăng xuất
            //Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
            //Response.Headers["Pragma"] = "no-cache";
            //Response.Headers["Expires"] = "0";

            // Xóa cookie sau khi đăng xuất
            Response.Cookies.Delete(".AspNetCore.Cookies");
            return RedirectToAction("Login");
        }

        [HttpGet]
        public IActionResult ChangePassword()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> ChangePassword(ChangePasswordModel model)
        {
            if (!ModelState.IsValid) return View(model);
            var username = User.Identity?.Name;
            if (username == null) return RedirectToAction("Login");
            var user = await _context.Users.SingleOrDefaultAsync(u => u.Username == username);
            if (user == null) return RedirectToAction("Login");
            var hasher = new PasswordHasher<User>();
            var result = hasher.VerifyHashedPassword(user, user.Password, model.OldPassword);
            if (result != PasswordVerificationResult.Success)
            {
                ModelState.AddModelError("", "Mật khẩu cũ không đúng.");
                return View(model);
            }
            user.Password = hasher.HashPassword(user, model.NewPassword);
            await _context.SaveChangesAsync();
            ViewBag.SuccessMessage = "Đổi mật khẩu thành công.";
            return View();
        }

        [HttpGet]
        public IActionResult ForgotPassword()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordModel model)
        {
            if (!ModelState.IsValid) return View(model);
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
            if (user == null)
            {
                ModelState.AddModelError("", "Email không tồn tại.");
                return View(model);
            }
            var otp = new Random().Next(100000, 999999).ToString();
            Helpers.OtpStore.SetOtp(user.Email, otp);
            await MailHelper.SendEmailAsync(user.Email, "OTP Reset Password", $"Your OTP is: {otp}");
            TempData["Email"] = user.Email;
            return RedirectToAction("ResetPassword");
        }

        [HttpGet]
        public IActionResult ResetPassword()
        {
            var email = TempData["Email"] as string;
            return View(new ResetPasswordModel { Email = email ?? string.Empty });
        }

        [HttpPost]
        public async Task<IActionResult> ResetPassword(ResetPasswordModel model)
        {
            if (!ModelState.IsValid) return View(model);
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
            if (user == null)
            {
                ModelState.AddModelError("", "User not found");
                return View(model);
            }
            if (!Helpers.OtpStore.ValidateOtp(user.Email, model.Otp))
            {
                ModelState.AddModelError("", "OTP không hợp lệ hoặc đã hết hạn.");
                return View(model);
            }
            var hasher = new PasswordHasher<User>();
            user.Password = hasher.HashPassword(user, model.NewPassword);
            await _context.SaveChangesAsync();
            Helpers.OtpStore.RemoveOtp(user.Email);
            return RedirectToAction("Login");
        }
    }
}
