using Microsoft.AspNetCore.Authentication.Cookies;
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
                            new Claim("AllowedAreas", string.Join(",", user.AllowedAreas))
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
    }
}
