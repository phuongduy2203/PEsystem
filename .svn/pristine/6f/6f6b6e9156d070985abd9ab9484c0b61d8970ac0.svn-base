using API_WEB.ModelsOracle;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API_WEB.Controllers.SmartFA
{
    [Route("api/[controller]")]
    public class DataChartController : ControllerBase
    {
        private readonly OracleDbContext _oracleContext;
        public DataChartController(OracleDbContext oracleContext)
        {
            _oracleContext = oracleContext;
        }


        [HttpGet("getCountModelName")]
        public async Task<IActionResult> GetModelNameCount()
        {
            var data = await _oracleContext.OracleDataRepairTask
                .Where(r => r.MODEL_NAME != null)
                .GroupBy(r => r.MODEL_NAME)
                .Select(g => new { ModelName = g.Key, TotalCount = g.Count() })
                .ToListAsync();

            // ✅ Tính tổng số lượng tất cả models
            int totalAllModels = data.Sum(d => d.TotalCount);

            // ✅ Sắp xếp giảm dần theo TotalCount và lấy TOP 10
            var topModels = data.OrderByDescending(d => d.TotalCount).Take(10).ToList();

            return Ok(new
            {
                TotalAllModels = totalAllModels,  // ✅ Tổng số lượng tất cả models
                Models = topModels                // ✅ Danh sách 10 model có số lượng cao nhất
            });
        }


        [HttpPost("get-testcode-count")]
        public async Task<IActionResult> GetTestCodeCount([FromBody] List<string> modelNames)
        {
            try
            {
                if (modelNames == null || modelNames.Count == 0)
                {
                    return BadRequest(new { success = false, message = "Danh sách modelNames không hợp lệ!" });
                }

                var query = _oracleContext.OracleDataRepairTask
                    .Where(task => modelNames.Contains(task.MODEL_NAME))
                    .GroupBy(task => new { task.MODEL_NAME, task.TEST_CODE })
                    .Select(group => new
                    {
                        ModelName = group.Key.MODEL_NAME,
                        TestCode = group.Key.TEST_CODE,
                        Count = group.Count()
                    })
                    .OrderByDescending(item => item.Count) // Sắp xếp giảm dần theo số lượng
                    .ToListAsync();

                var result = await query;

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

    }
}
