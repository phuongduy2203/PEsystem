using API_WEB.Models.Bonepile;
using API_WEB.Models.Repositories;
using API_WEB.ModelsDB;
using API_WEB.ModelsOracle;
using DocumentFormat.OpenXml.InkML;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;
using Oracle.ManagedDataAccess.Client;
using System.Linq;
using System.Runtime.Intrinsics.X86;

namespace API_WEB.Controllers.Repositories
{
    [Route("api/[controller]")]
    [ApiController]
    public class Bonepile2Controller : ControllerBase
    {

        private readonly CSDL_NE _sqlContext;
        private readonly OracleDbContext _oracleContext;

        public Bonepile2Controller(CSDL_NE sqlContext, OracleDbContext oracleContext)
        {
            _sqlContext = sqlContext;
            _oracleContext = oracleContext;
        }

        /// <summary>
        /// Bonepile 2.0
        /// </summary>
        /// <param name="request"></param>
        /// <returns></returns>
        [HttpPost("data")]
        public async Task<IActionResult> DetailStatus([FromBody] StatusRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new { message = "Yeu cau khong hop le!" });
                }
                //var statuses = request.Statuses?.Any() == true ? request.Statuses : new List<string> { "Repair", "CheckOut", "CheckIn", "WaitingLink", "Online", "WaitingApproveScrap", "Scrap" };
                var statuses = request.Statuses?.Any() == true ? request.Statuses : new List<string> { "Repair", "CheckOut", "CheckIn", "WaitingLink", "Online", "WaitingKanBanIn", "WaitingApproveScrap", "Scrap" };
                //Kiem tra dinh dang ngay
                if (string.IsNullOrEmpty(request.StartDate) || string.IsNullOrEmpty(request.EndDate))
                {
                    return BadRequest(new { message = "StartDate va EndDate khong duoc de trong!" });
                }
                if (!DateTime.TryParseExact(request.StartDate, "yyyy/MM/dd HH:mm", null, System.Globalization.DateTimeStyles.None, out _)
                    || !DateTime.TryParseExact(request.EndDate, "yyyy/MM/dd HH:mm", null, System.Globalization.DateTimeStyles.None, out _))
                {
                    return BadRequest(new { message = "Định dạng StartDate hoặc EndDate không hợp lệ. Vui lòng sử dụng định dạng yyyy/MM/dd HH:mm." });
                }

                //THuc thien truy van Oracle
                var bonepileData = await ExecuteOracleQuery(request);

                if (!bonepileData.Any())
                {
                    return NotFound(new { message = "Khong tim thay du lieu!!", count = 0 });
                }


                var scrapCategories = await _sqlContext.ScrapLists
                    .Where(s => bonepileData.Select(b => b.SN).Contains(s.SN))
                    .Select(s => new ScrapListCategory { SN = s.SN, Category = s.Category })
                    .ToListAsync();

                //var validStatuses = new HashSet<string> { "Repair", "CheckOut", "CheckIn", "WaitingLink", "Online", "WaitingApproveScrap", "Scrap" };
                var validStatuses = new HashSet<string> { "Repair", "CheckOut", "CheckIn", "WaitingLink", "Online", "WaitingKanBanIn", "WaitingApproveScrap", "Scrap" };
                var result = bonepileData.Select(b =>
                {
                    var scrapCategory = scrapCategories.FirstOrDefault(c => c.SN == b.SN);
                    string status;
                    if (scrapCategory != null)
                    {
                        status = scrapCategory.Category == "Scrap" ? "Scrap" : "WaitingApproveScrap";
                    }
                    else
                    {
                        // Không có dữ liệu trong ScrapLists, dùng ERROR_FLAG
                        status = b.ERROR_FLAG switch
                        {
                            "7" => "Repair",
                            "8" => "CheckOut",
                            "1" => "CheckIn",
                            "2" => "WaitingLink",
                            "0" => b.WIP_GROUP == "KANBAN_IN" ? "WaitingKanBanIn" : "Online",
                            //"0" => "Online",
                            _ => "Unknown" // Xử lý các giá trị ERROR_FLAG không xác định
                        };
                    }
                    return new
                    {
                        SN = b.SN,
                        MoNumber = b.MO_NUMBER,
                        ModelName = b.MODEL_NAME,
                        ProductLine = b.PRODUCT_LINE,
                        FailStation = b.FAIL_STATION,
                        Symptom = b.SYMPTOM,
                        ErrorDescription = b.ERROR_DESC,
                        Time = b.TIME.ToString("yyyy-MM-dd HH:mm:ss"),
                        Flag = b.FLAG,
                        PONo = b.PO_NO,
                        POItem = b.PO_ITEM,
                        FailureAging = b.FAILURE_AGING,
                        WipGroup = b.WIP_GROUP,
                        VersionCode = b.VERSION_CODE,
                        WorkFlag = b.WORK_FLAG,
                        ErrorFlag = b.ERROR_FLAG,
                        MONew = b.MO_NEW,
                        Status = status,
                        CheckinRepairTime = b.CHECKIN_REPAIR_TIME?.ToString("yyyy-MM-dd HH:mm:ss") ?? "N/A",
                        CheckoutRepairTime = b.CHECKOUT_REPAIR_TIME?.ToString("yyyy-MM-dd HH:mm:ss") ?? "N/A",
                        ScrapStatus = b.SCRAP_STATUS,
                        Category = scrapCategory?.Category ?? "N/A"
                    };
                }).Where(r => validStatuses.Contains(r.Status) && request.Statuses.Contains(r.Status)).ToList();
                if (!result.Any())
                {
                    return NotFound(new { message = "Khong tim thay du lieu!!", count = 0 });
                }
                return Ok(new
                {
                    count = result.Count,
                    data = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Xay ra loi", error = ex.Message });
            }
        }

        // API mới: StatusCount
        [HttpPost("status-count")]
        public async Task<IActionResult> StatusCount([FromBody] StatusRequest request)
        {
            try
            {
                // Kiểm tra đầu vào
                if (request == null)
                {
                    return BadRequest(new { message = "Yeu cau khong hop le!" });
                }

                // Nếu không có Statuses, sử dụng tất cả trạng thái hợp lệ
                //var statuses = request.Statuses?.Any() == true ? request.Statuses : new List<string> { "Repair", "CheckOut", "CheckIn", "WaitingLink", "Online", "WaitingApproveScrap", "Scrap" };
                var statuses = request.Statuses?.Any() == true ? request.Statuses : new List<string> { "Repair", "CheckOut", "CheckIn", "WaitingLink", "Online", "WaitingKanBanIn", "WaitingApproveScrap", "Scrap" };

                if (string.IsNullOrEmpty(request.StartDate) || string.IsNullOrEmpty(request.EndDate))
                {
                    return BadRequest(new { message = "StartDate va EndDate khong duoc de trong!" });
                }
                if (!DateTime.TryParseExact(request.StartDate, "yyyy/MM/dd HH:mm", null, System.Globalization.DateTimeStyles.None, out _)
                    || !DateTime.TryParseExact(request.EndDate, "yyyy/MM/dd HH:mm", null, System.Globalization.DateTimeStyles.None, out _))
                {
                    return BadRequest(new { message = "Định dạng StartDate hoặc EndDate không hợp lệ. Vui lòng sử dụng định dạng yyyy/MM/dd HH:mm." });
                }

                // Thực hiện truy vấn Oracle
                var bonepileData = await ExecuteOracleQuery(request);

                if (!bonepileData.Any())
                {
                    return NotFound(new { message = "Khong tim thay du lieu!!", count = 0, statusCounts = new { } });
                }

                // Lấy Category từ ScrapLists (SQL Server)
                var scrapCategories = await _sqlContext.ScrapLists
                    .Where(s => bonepileData.Select(b => b.SN).Contains(s.SN))
                    .Select(s => new ScrapListCategory { SN = s.SN, Category = s.Category })
                    .ToListAsync();

                // Xác định trạng thái và đếm số lượng
                //var validStatuses = new HashSet<string> { "Repair", "CheckOut", "CheckIn", "WaitingLink", "Online", "WaitingApproveScrap", "Scrap" };
                var validStatuses = new HashSet<string> { "Repair", "CheckOut", "CheckIn", "WaitingLink", "Online", "WaitingKanBanIn", "WaitingApproveScrap", "Scrap" };
                var statusCounts = new Dictionary<string, int>
                {
                    { "Repair", 0 },
                    { "CheckOut", 0 },
                    { "CheckIn", 0 },
                    { "WaitingLink", 0 },
                    { "Online", 0 },
                    { "WaitingKanBanIn", 0 },
                    { "WaitingApproveScrap", 0 },
                    { "Scrap", 0 }
                };

                foreach (var b in bonepileData)
                {
                    var scrapCategory = scrapCategories.FirstOrDefault(c => c.SN == b.SN);
                    string status;
                    if (scrapCategory != null)
                    {
                        status = scrapCategory.Category == "Scrap" ? "Scrap" : "WaitingApproveScrap";
                    }
                    else
                    {
                        status = b.ERROR_FLAG switch
                        {
                            "7" => "Repair",
                            "8" => "CheckOut",
                            "1" => "CheckIn",
                            "2" => "WaitingLink",
                            "0" => b.WIP_GROUP == "KANBAN_IN" ? "WaitingKanBanIn" : "Online",
                            //"0" => "Online",
                            _ => "Unknown"
                        };
                    }

                    // Chỉ đếm nếu trạng thái hợp lệ và nằm trong danh sách yêu cầu
                    if (validStatuses.Contains(status) && request.Statuses.Contains(status))
                    {
                        statusCounts[status]++;
                    }
                }

                // Tổng số bản ghi khớp
                int totalCount = statusCounts.Values.Sum();

                if (totalCount == 0)
                {
                    return NotFound(new { message = "Khong tim thay du lieu!!", count = 0, statusCounts = new { } });
                }

                // Loại bỏ các trạng thái có số lượng 0 để trả về JSON gọn hơn
                var filteredStatusCounts = statusCounts
                    .Where(kv => kv.Value > 0)
                    .ToDictionary(kv => kv.Key, kv => kv.Value);

                return Ok(new
                {
                    count = totalCount,
                    statusCounts = filteredStatusCounts
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Xay ra loi", error = ex.Message });
            }
        }
        private async Task<List<BonepileResult>> ExecuteOracleQuery(StatusRequest request)
        {
            var result = new List<BonepileResult>();

            await using var connection = new OracleConnection(_oracleContext.Database.GetDbConnection().ConnectionString);
            await connection.OpenAsync();

            string query = @"
                    SELECT 
                        c.SERIAL_NUMBER, 
                        c.MODEL_NAME, 
                        c.PRODUCT_LINE, 
                        c.MO_NUMBER, 
                        c.FAIL_STATION, 
                        c.SYMPTOM, 
                        c.ERROR_DESC, 
                        c.TIME, 
                        c.FLAG, 
                        c.PO_NO, 
                        c.PO_ITEM, 
                        c.FAILURE_AGING, 
                        c.WIP_GROUP, 
                        c.VERSION_CODE, 
                        c.WORK_FLAG,
                        CASE 
                            WHEN c.ERROR_FLAG = '0' AND c.MO_NEW IS NOT NULL THEN '0'
                            WHEN c.ERROR_FLAG = '0' AND c.MO_NEW IS NULL THEN '2'
                            ELSE c.ERROR_FLAG 
                        END AS ERROR_FLAG,
                        c.MO_NEW, 
                        c.STATUS, 
                        c.CHECKIN_REPAIR_TIME, 
                        c.CHECKOUT_REPAIR_TIME,
                        CASE 
                            WHEN s.SERIAL_NUMBER IS NOT NULL THEN 'SCRAP' 
                            ELSE '' 
                        END AS SCRAP_STATUS
                    FROM (
                        SELECT 
                            a.*, 
                            b.MO_NUMBER1, 
                            b.DATA1, 
                            b.ERROR_FLAG, 
                            b.WORK_FLAG, 
                            b.WIP_GROUP, 
                            b.VERSION_CODE,
                            CASE 
                                WHEN a.MO_NUMBER <> b.MO_NUMBER1 THEN b.MO_NUMBER1
                                WHEN a.MO_NUMBER = b.MO_NUMBER1 
                                    AND b.ERROR_FLAG NOT IN ('1', '7', '8') 
                                    AND b.DATA1 IS NOT NULL THEN b.DATA1
                                ELSE '' 
                            END AS MO_NEW,
                            CASE 
                                WHEN a.FAILURE_AGING <= 7 THEN 'Normal <7 DAY'
                                WHEN a.FAILURE_AGING > 7 AND a.FAILURE_AGING < 14 THEN 'Medium >7,<14 DAY'
                                ELSE 'High >14 DAY'
                            END AS STATUS,
                            r.IN_DATETIME AS CHECKIN_REPAIR_TIME,
                            r.OUT_DATETIME AS CHECKOUT_REPAIR_TIME
                        FROM (
                            SELECT 
                                a.SERIAL_NUMBER, 
                                a.MODEL_NAME, 
                                a.PRODUCT_LINE, 
                                a.MO_NUMBER, 
                                a.TEST_STATION AS FAIL_STATION, 
                                a.SYMPTOM, 
                                b.ERROR_DESC, 
                                a.TIME, 
                                a.FLAG, 
                                a.PO_NO, 
                                a.PO_ITEM, 
                                ROUND((SYSDATE - a.TIME), 2) AS FAILURE_AGING
                            FROM SFISM4.NVIDIA_BONPILE_SN_LOG a
                            INNER JOIN SFIS1.C_ERROR_CODE_T b 
                                ON a.SYMPTOM = b.ERROR_CODE
                            WHERE a.TIME BETWEEN TO_DATE(:start_date, 'YYYY/MM/DD HH24:MI') 
                                AND TO_DATE(:end_date, 'YYYY/MM/DD HH24:MI')
                                AND NOT EXISTS (
                                    SELECT 1 
                                    FROM SFISM4.Z_KANBAN_TRACKING_T z 
                                    WHERE z.SERIAL_NUMBER = a.SERIAL_NUMBER
                                )
                                AND NOT EXISTS (
                                    SELECT 1 
                                    FROM SFISM4.R_NV_REPAIR_BONEPILE_T r 
                                    WHERE r.SERIAL_NUMBER = a.SERIAL_NUMBER 
                                    AND r.DATA7 = 'SCRAP'
                                )
                        ) a
                        LEFT JOIN (
                            SELECT 
                                a.SERIAL_NUMBER, 
                                a.MO_NUMBER AS MO_NUMBER1, 
                                b.DATA1, 
                                a.ERROR_FLAG, 
                                a.WORK_FLAG, 
                                a.WIP_GROUP, 
                                a.VERSION_CODE
                            FROM SFISM4.R107 a
                            LEFT JOIN SFISM4.R_KEYPART_BLACK_WHITE_LIST_T b 
                                ON a.SERIAL_NUMBER = b.KEY_PART_SN 
                                AND b.TYPE = 'LINK_MO'
                        ) b 
                            ON a.SERIAL_NUMBER = b.SERIAL_NUMBER
                        LEFT JOIN SFISM4.R_REPAIR_IN_OUT_T r 
                            ON a.SERIAL_NUMBER = r.SERIAL_NUMBER 
                            AND a.FAIL_STATION = r.STATION_NAME 
                            AND a.MO_NUMBER = r.MO_NUMBER
                    ) c
                    LEFT JOIN (
                        SELECT SERIAL_NUMBER, TEST_GROUP, TEST_CODE
                        FROM SFISM4.R109 
                        WHERE REASON_CODE = 'B001'
                    ) s 
                        ON c.SERIAL_NUMBER = s.SERIAL_NUMBER 
                        AND c.FAIL_STATION = s.TEST_GROUP 
                        AND c.SYMPTOM = s.TEST_CODE
                    ORDER BY c.TIME";

            using (var command = new OracleCommand(query, connection))
            {
                // Bind parameters
                command.Parameters.Add("start_date", OracleDbType.Varchar2).Value = request.StartDate;
                command.Parameters.Add("end_date", OracleDbType.Varchar2).Value = request.EndDate;

                using (var reader = await command.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        result.Add(new BonepileResult
                        {
                            SN = reader["SERIAL_NUMBER"].ToString(),
                            MODEL_NAME = reader["MODEL_NAME"].ToString(),
                            PRODUCT_LINE = reader["PRODUCT_LINE"].ToString(),
                            MO_NUMBER = reader["MO_NUMBER"].ToString(),
                            FAIL_STATION = reader["FAIL_STATION"].ToString(),
                            SYMPTOM = reader["SYMPTOM"].ToString(),
                            ERROR_DESC = reader["ERROR_DESC"].ToString(),
                            TIME = Convert.ToDateTime(reader["TIME"]),
                            FLAG = reader["FLAG"].ToString(),
                            PO_NO = reader["PO_NO"].ToString(),
                            PO_ITEM = reader["PO_ITEM"].ToString(),
                            FAILURE_AGING = Convert.ToDouble(reader["FAILURE_AGING"]),
                            WIP_GROUP = reader["WIP_GROUP"].ToString(),
                            VERSION_CODE = reader["VERSION_CODE"].ToString(),
                            WORK_FLAG = reader["WORK_FLAG"].ToString(),
                            ERROR_FLAG = reader["ERROR_FLAG"].ToString(),
                            MO_NEW = reader["MO_NEW"].ToString(),
                            STATUS = reader["STATUS"].ToString(),
                            CHECKIN_REPAIR_TIME = reader["CHECKIN_REPAIR_TIME"] != DBNull.Value ? Convert.ToDateTime(reader["CHECKIN_REPAIR_TIME"]) : (DateTime?)null,
                            CHECKOUT_REPAIR_TIME = reader["CHECKOUT_REPAIR_TIME"] != DBNull.Value ? Convert.ToDateTime(reader["CHECKOUT_REPAIR_TIME"]) : (DateTime?)null,
                            SCRAP_STATUS = reader["SCRAP_STATUS"].ToString()
                        });
                    }
                }
            }
            return result;
        }


        /// <summary>
        /// Bonpile Before
        /// </summary>
        /// <param name="request"></param>
        /// <returns></returns>
        [HttpPost("adapter-repair-records")]
        public async Task<IActionResult> AdapterRepairRecords([FromBody] StatusRequestBonepile request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new { message = "Yêu cầu không hợp lệ!" });
                }

                bool filterByStatus = request.Statuses?.Any() == true;
                //var statuses = filterByStatus ? request.Statuses : null;
                var statuses = filterByStatus ? request.Statuses.Where(s => !string.IsNullOrEmpty(s)).ToList() : null;
                // Lấy data từ Oracle
                var allData = await ExecuteAdapterRepairQuery();

                // Lấy ApplyTaskStatus từ ScrapLists
                var serialNumbers = allData.Select(x => x.SERIAL_NUMBER.Trim().ToUpper()).Distinct().ToList();

                var scrapCategories = await _sqlContext.ScrapLists
                    .Where(s => serialNumbers.Contains(s.SN.Trim().ToUpper()))
                    .Select(s => new { SN = s.SN, ApplyTaskStatus = s.ApplyTaskStatus, TaskNumber = s.TaskNumber })
                    .ToListAsync();

                //var scrapDict = scrapCategories.ToDictionary(
                //    c => c.SN?.Trim().ToUpper() ?? "",
                //    c => c.ApplyTaskStatus,
                //    StringComparer.OrdinalIgnoreCase
                //);
                // Tạo từ điển ánh xạ SN với ApplyTaskStatus và TaskNumber
                var scrapDict = scrapCategories.ToDictionary(
                    c => c.SN?.Trim().ToUpper() ?? "",
                    c => (ApplyTaskStatus: c.ApplyTaskStatus, TaskNumber: c.TaskNumber),
                    StringComparer.OrdinalIgnoreCase
                );
                // Định nghĩa validStatuses
                var validStatuses = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "Scrap Lacks Task",
                    "Scrap Has Scrap",
                    "SPE approve to BGA",
                    "Waiting SPE approve scrap",
                    "Rework FG",
                    "Under repair in RE",
                    "Waiting Check Out",
                    "Under repair in PD"
                };

                // Phân loại status theo yêu cầu
                var result = allData
                    .Select(b =>
                    {
                        var sn = b.SERIAL_NUMBER?.Trim().ToUpper() ?? "";
                        string status;

                        // Kiểm tra thông tin trong scrapDict
                        if (scrapDict.TryGetValue(sn, out var scrapInfo))
                        {
                            var applyTaskStatus = scrapInfo.ApplyTaskStatus;
                            var taskNumber = scrapInfo.TaskNumber;

                            if (applyTaskStatus == 0 || applyTaskStatus == 1)
                            {
                                status = string.IsNullOrEmpty(taskNumber) ? "Scrap Lacks Task" : "Scrap Has Scrap";
                            }
                            else
                            {
                                status = applyTaskStatus switch
                                {
                                    2 => "Waiting SPE approve scrap",
                                    3 => "SPE approve to BGA",
                                    _ => "Under repair in PD"
                                };
                            }
                        }
                        // Kiểm tra MO_NUMBER
                        else if (b.MO_NUMBER?.Trim().StartsWith("4") == true)
                        {
                            status = "Rework FG";
                        }
                        // Kiểm tra ERROR_FLAG
                        else
                        {
                            status = b.ERROR_FLAG switch
                            {
                                "7" => "Under repair in RE",
                                "8" => "Waiting Check Out",
                                "0" => "Under repair in PD",
                                _ => "Under repair in PD"
                            };
                        }
                        return new
                        {
                            SN = b.SERIAL_NUMBER,
                            ModelName = b.MODEL_NAME,
                            MoNumber = b.MO_NUMBER,
                            ProductLine = b.PRODUCT_LINE,
                            ErrorFlag = b.ERROR_FLAG,
                            WorkFlag = b.WORK_FLAG,
                            WipGroup = b.WIP_GROUP,
                            Data11 = b.DATA11,
                            Status = status,
                            testTime = b.TEST_TIME,
                            testCode = b.TEST_CODE,
                            testGroup = b.TEST_GROUP,
                            errorDesc = b.ERROR_DESC,
                            note = b.DATA19,
                            agingDay = b.AGING_DAY,
                            checkInDate = b.CHECKIN_DATE
                        };
                    })
                    .Where(r => validStatuses.Contains(r.Status, StringComparer.OrdinalIgnoreCase) &&
                                (!filterByStatus || statuses.Contains(r.Status, StringComparer.OrdinalIgnoreCase)))
                    .ToList();

                // Log result count
                Console.WriteLine($"Result Count: {result?.Count}");

                if (!result.Any())
                {
                    return NotFound(new { message = "Không tìm thấy dữ liệu!", count = 0 });
                }

                return Ok(new
                {
                    count = result?.Count,
                    data = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Xảy ra lỗi", error = ex.Message });
            }
        }
        [HttpGet("adapter-repair-status-count")]
        public async Task<IActionResult> AdapterRepairStatusCount()
        {
            try
            {
                var repairTaskData = await ExecuteAdapterRepairQuery();
                var scrapCategories = await _sqlContext.ScrapLists
                .Select(s => new { SN = s.SN, ApplyTaskStatus = s.ApplyTaskStatus, TaskNumber = s.TaskNumber })
                .ToListAsync();
                //var scrapDict = scrapCategories.ToDictionary(
                //    c => c.SN?.Trim().ToUpper() ?? "",
                //    c => c.ApplyTaskStatus,
                //    StringComparer.OrdinalIgnoreCase
                //);
                // Tạo từ điển ánh xạ SN với ApplyTaskStatus và TaskNumber
                var scrapDict = scrapCategories.ToDictionary(
                    c => c.SN?.Trim().ToUpper() ?? "",
                    c => (ApplyTaskStatus: c.ApplyTaskStatus, TaskNumber: c.TaskNumber),
                    StringComparer.OrdinalIgnoreCase
                );
                // Phân loại trạng thái cho từng bản ghi
                var result = repairTaskData
                    .Select(b =>
                    {
                        var sn = b.SERIAL_NUMBER?.Trim().ToUpper() ?? "";
                        string status;

                        // Kiểm tra thông tin trong scrapDict
                        if (scrapDict.TryGetValue(sn, out var scrapInfo))
                        {
                            var applyTaskStatus = scrapInfo.ApplyTaskStatus;
                            var taskNumber = scrapInfo.TaskNumber;

                            if (applyTaskStatus == 0 || applyTaskStatus == 1)
                            {
                                status = string.IsNullOrEmpty(taskNumber) ? "Scrap Lacks Task" : "Scrap Has Scrap";
                            }
                            else
                            {
                                status = applyTaskStatus switch
                                {
                                    2 => "Waiting SPE approve scrap",
                                    3 => "SPE approve to BGA",
                                    _ => "Under repair in PD"
                                };
                            }
                        }
                        // Kiểm tra MO_NUMBER
                        else if (b.MO_NUMBER?.Trim().StartsWith("4") == true)
                        {
                            status = "Rework FG";
                        }
                        // Kiểm tra ERROR_FLAG
                        else
                        {
                            status = b.ERROR_FLAG switch
                            {
                                "7" => "Under repair in RE",
                                "8" => "Waiting Check Out",
                                "0" => "Under repair in PD",
                                _ => "Under repair in PD"
                            };
                        }

                        return status;
                    })
                    .ToList();

                var statusCounts = result
                    .GroupBy(status => status)
                    .Select(g => new
                    {
                        Status = g.Key,
                        Count = g.Count()
                    })
                    .ToList();

                return Ok(new
                {
                    totalCount = result.Count,
                    statusCounts = statusCounts
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Xảy ra lỗi", error = ex.Message });
            }
        }
        private async Task<List<RepairTaskResult>> ExecuteAdapterRepairQuery()
        {
            var result = new List<RepairTaskResult>();

            await using var connection = new OracleConnection(_oracleContext.Database.GetDbConnection().ConnectionString);
            await connection.OpenAsync();

            string query = @"SELECT 
    a.SERIAL_NUMBER,
    a.MODEL_NAME,
    c.PRODUCT_LINE,
    a.MO_NUMBER,
    a.TEST_GROUP,
    a.TEST_CODE,
    a.TEST_TIME,
    r107.WIP_GROUP,
    r107.ERROR_FLAG,
    r107.WORK_FLAG,
    a.DATA1,
    a.DATA11,
    a.DATA19,
    'REPAIR_TASK' AS SOURCE,
    (
        SELECT MIN(d.DATE3)
        FROM SFISM4.R_REPAIR_TASK_DETAIL_T d
        WHERE d.SERIAL_NUMBER = a.SERIAL_NUMBER
          AND d.DATA12 = 'CHECK_IN'
    ) AS CHECKIN_DATE,
    (
        SYSDATE - (
            SELECT MIN(d.DATE3)
            FROM SFISM4.R_REPAIR_TASK_DETAIL_T d
            WHERE d.SERIAL_NUMBER = a.SERIAL_NUMBER
              AND d.DATA12 = 'CHECK_IN'
        )
    ) AS AGING_DAY
FROM SFISM4.R_REPAIR_TASK_T a
INNER JOIN SFIS1.C_MODEL_DESC_T c ON a.MODEL_NAME = c.MODEL_NAME
LEFT JOIN SFISM4.R107 r107 ON a.SERIAL_NUMBER = r107.SERIAL_NUMBER
WHERE NOT EXISTS (
    SELECT 1 
    FROM SFISM4.Z_KANBAN_TRACKING_T z 
    WHERE z.serial_number = a.SERIAL_NUMBER
)
AND NOT EXISTS (
    SELECT 1 
    FROM SFISM4.Z_KANBAN_TRACKING_T z 
    WHERE z.serial_number = a.SERIAL_NUMBER 
    AND z.WIP_GROUP LIKE '%B36R%'
)
AND a.MO_NUMBER NOT LIKE '8%'
AND (
    (c.MODEL_SERIAL = 'ADAPTER' AND a.MODEL_NAME NOT LIKE '900%' AND a.MODEL_NAME NOT LIKE '692%')
    OR ((a.MODEL_NAME LIKE '900%' OR a.MODEL_NAME LIKE '692%') AND a.MO_NUMBER LIKE '400%')
)
AND r107.WIP_GROUP NOT LIKE '%BR2C%'
AND a.TEST_CODE NOT IN (
    'BV00', 'PP10', 'BRK00', 'HSK00', 'SCR00', 'C028', 'TA00', 'CAR0', 'C010', 'C012',
    'LBxx', 'GB00', 'CLExx', 'GL00', 'BHSK00', 'DIR02', 'DIR03', 'DR00', 'GF06',
    'CLE02', 'CLE03', 'CLE04', 'CLE05', 'CLE06', 'CLE07', 'CLE08', 'LB01', 'LB02', 
    'LB03', 'LB04', 'LB05', 'LB06', 'LB07', 'CK00'
)

UNION ALL

SELECT 
    a.SERIAL_NUMBER,
    a.MODEL_NAME,
    c.PRODUCT_LINE,
    a.MO_NUMBER,
    a.TEST_GROUP,
    a.TEST_CODE,
    a.TEST_TIME,
    b.WIP_GROUP,
    b.ERROR_FLAG,
    b.WORK_FLAG,
    a.DATA1,
    NULL AS DATA11,
    NULL AS DATA19,
    'R109_ERROR_FLAG1' AS SOURCE,
    (
        SELECT MIN(d.DATE3)
        FROM SFISM4.R_REPAIR_TASK_DETAIL_T d
        WHERE d.SERIAL_NUMBER = a.SERIAL_NUMBER
          AND d.DATA12 = 'CHECK_IN'
    ) AS CHECKIN_DATE,
    (
        SYSDATE - (
            SELECT MIN(d.DATE3)
            FROM SFISM4.R_REPAIR_TASK_DETAIL_T d
            WHERE d.SERIAL_NUMBER = a.SERIAL_NUMBER
              AND d.DATA12 = 'CHECK_IN'
        )
    ) AS AGING_DAY
FROM SFISM4.R109 a
INNER JOIN SFISM4.R107 b ON a.SERIAL_NUMBER = b.SERIAL_NUMBER
INNER JOIN SFIS1.C_MODEL_DESC_T c ON a.MODEL_NAME = c.MODEL_NAME
WHERE a.REASON_CODE IS NULL
AND a.MODEL_NAME IN (
    SELECT MODEL_NAME 
    FROM SFIS1.C_MODEL_DESC_T 
    WHERE MODEL_SERIAL = 'ADAPTER'
)
AND a.MODEL_NAME NOT LIKE '900%'
AND a.MODEL_NAME NOT LIKE 'TB%'
AND b.ERROR_FLAG = 1
AND a.MO_NUMBER NOT LIKE '8%'
AND NOT EXISTS (
    SELECT 1 
    FROM SFISM4.Z_KANBAN_TRACKING_T z 
    WHERE z.serial_number = a.SERIAL_NUMBER 
    AND z.WIP_GROUP LIKE '%B36R%'
)
AND b.WIP_GROUP NOT LIKE '%BR2C%'
AND a.TEST_CODE NOT IN (
    'BV00', 'PP10', 'BRK00', 'HSK00', 'SCR00', 'C028', 'TA00', 'CAR0', 'C010', 'C012',
    'LBxx', 'GB00', 'CLExx', 'GL00', 'BHSK00', 'DIR02', 'DIR03', 'DR00', 'GF06',
    'CLE02', 'CLE03', 'CLE04', 'CLE05', 'CLE06', 'CLE07', 'CLE08', 'LB01', 'LB02', 
    'LB03', 'LB04', 'LB05', 'LB06', 'LB07', 'CK00'
)
AND (SYSDATE - a.TEST_TIME) * 24 >= 8

UNION ALL

SELECT 
    a.SERIAL_NUMBER,
    a.MODEL_NAME,
    c.PRODUCT_LINE,
    a.MO_NUMBER,
    a.TEST_GROUP,
    a.TEST_CODE,
    a.TEST_TIME,
    b.WIP_GROUP,
    b.ERROR_FLAG,
    b.WORK_FLAG,
    a.DATA1,
    NULL AS DATA11,
    NULL AS DATA19,
    'R109_REASON_B001' AS SOURCE,
    (
        SELECT MIN(d.DATE3)
        FROM SFISM4.R_REPAIR_TASK_DETAIL_T d
        WHERE d.SERIAL_NUMBER = a.SERIAL_NUMBER
          AND d.DATA12 = 'CHECK_IN'
    ) AS CHECKIN_DATE,
    (
        SYSDATE - (
            SELECT MIN(d.DATE3)
            FROM SFISM4.R_REPAIR_TASK_DETAIL_T d
            WHERE d.SERIAL_NUMBER = a.SERIAL_NUMBER
              AND d.DATA12 = 'CHECK_IN'
        )
    ) AS AGING_DAY
FROM SFISM4.R109 a
INNER JOIN SFISM4.R107 b ON a.SERIAL_NUMBER = b.SERIAL_NUMBER
INNER JOIN SFIS1.C_MODEL_DESC_T c ON a.MODEL_NAME = c.MODEL_NAME
WHERE a.SERIAL_NUMBER NOT IN (SELECT SERIAL_NUMBER FROM SFISM4.Z_KANBAN_TRACKING_T)
AND NOT EXISTS (
    SELECT 1 
    FROM SFISM4.Z_KANBAN_TRACKING_T z 
    WHERE z.serial_number = a.SERIAL_NUMBER 
    AND z.WIP_GROUP LIKE '%B36R%'
)
AND a.REASON_CODE = 'B001'
AND b.WIP_GROUP NOT LIKE '%BR2C%'
AND c.MODEL_SERIAL = 'ADAPTER'
AND a.MO_NUMBER NOT LIKE '8%'
AND a.REPAIR_TIME BETWEEN TO_DATE('2025-05-15 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
AND TO_DATE(TO_CHAR(SYSDATE, 'YYYY-MM-DD') || ' 10:59:59', 'YYYY-MM-DD HH24:MI:SS')
";

            using (var command = new OracleCommand(query, connection))
            {
                using (var reader = await command.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        result.Add(new RepairTaskResult
                        {
                            SERIAL_NUMBER = reader["SERIAL_NUMBER"].ToString(),
                            MODEL_NAME = reader["MODEL_NAME"].ToString(),
                            PRODUCT_LINE = reader["PRODUCT_LINE"].ToString(),
                            MO_NUMBER = reader["MO_NUMBER"].ToString(),
                            ERROR_FLAG = reader["ERROR_FLAG"] != DBNull.Value ? reader["ERROR_FLAG"].ToString() : null,
                            WORK_FLAG = reader["WORK_FLAG"] != DBNull.Value ? reader["WORK_FLAG"].ToString() : null,
                            WIP_GROUP = reader["WIP_GROUP"] != DBNull.Value ? reader["WIP_GROUP"].ToString() : null,
                            TEST_GROUP = reader["TEST_GROUP"] != DBNull.Value ? reader["TEST_GROUP"].ToString() : null,
                            TEST_TIME = reader["TEST_TIME"].ToString(),
                            TEST_CODE = reader["TEST_CODE"].ToString(),
                            ERROR_DESC = reader["DATA1"].ToString(),
                            DATA11 = reader["DATA11"] != DBNull.Value ? reader["DATA11"].ToString() : null,
                            DATA19 = reader["DATA19"] != DBNull.Value ? reader["DATA19"].ToString() : null,
                            CHECKIN_DATE = reader["CHECKIN_DATE"] != DBNull.Value ? Convert.ToDateTime(reader["CHECKIN_DATE"]) : (DateTime?)null,
                        });
                    }
                }
            }

            return result;
        }
        //===============END BONEPILE BEFORE==================


        /// <summary>
        /// Bonepile After
        /// </summary>
        /// <param name="request"></param>
        /// <returns></returns>
        /// 
        [HttpPost("bonepile-after-kanban")]
        public async Task<IActionResult> BonepileAfterKanban([FromBody] StatusRequestBonepile request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new { message = "Yêu cầu không hợp lệ!" });
                }
                bool filterByStatus = request.Statuses?.Any() == true;
                var statuses = filterByStatus ? request.Statuses.Where(s => !string.IsNullOrEmpty(s)).ToList() : null;
                var allData = await ExecuteBonepileAfterKanbanQuery();

                var excludedSNs = GetExcludedSerialNumbers();
                if (excludedSNs.Any())
                {
                    allData = allData.Where(d => !excludedSNs.Contains(d.SFG?.Trim().ToUpper())).ToList();
                }

                var sfgList = allData.Select(d => d.SFG).Where(s => !string.IsNullOrEmpty(s)).ToList();

                var scrapCategories = await _sqlContext.ScrapLists
                .Where(s => sfgList.Contains(s.SN.Trim().ToUpper()))
                .Select(s => new { SN = s.SN, ApplyTaskStatus = s.ApplyTaskStatus, TaskNumber = s.TaskNumber })
                .ToListAsync();

                var scrapDict = scrapCategories.ToDictionary(
                    c => c.SN?.Trim().ToUpper() ?? "",
                    c => (ApplyTaskStatus: c.ApplyTaskStatus, TaskNumber: c.TaskNumber),
                    StringComparer.OrdinalIgnoreCase
                );

                var validStatuses = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "ScrapLackTask",
                    "ScrapHasTask",
                    "Online",
                    "WatitingScrap",
                    "ApproveBGA",
                    "RepairInRE",
                };
                // Phân loại status theo yêu cầu
                var result = allData
                    .Select(b =>
                    {
                        var sn = b.SFG?.Trim().ToUpper() ?? "";
                        string status;

                        var groupKanban = b.WIP_GROUP_KANBAN?.Trim();
                        // Kiểm tra thông tin trong scrapDict
                        if (!string.IsNullOrEmpty(groupKanban) && groupKanban.IndexOf("B36R_TO_SFG", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            status = "Online";
                        }
                        else if (scrapDict.TryGetValue(sn, out var scrapInfo))
                        {
                            var applyTaskStatus = scrapInfo.ApplyTaskStatus;
                            var taskNumber = scrapInfo.TaskNumber;

                            if (applyTaskStatus == 0 || applyTaskStatus == 1)
                            {
                                status = string.IsNullOrEmpty(taskNumber) ? "ScrapLackTask" : "ScrapHasTask";
                            }
                            else
                            {
                                status = applyTaskStatus switch
                                {
                                    2 => "WatitingScrap",
                                    3 => "ApproveBGA",
                                    _ => "RepairInRE"
                                };
                            }
                        }
                        else
                        {
                            status = "RepairInRE";
                        }
                        return new
                        {
                            SN = b.SFG,
                            FG = b.FG,
                            ModelName = b.MODEL_NAME,
                            MoNumber = b.MO_NUMBER,
                            ProductLine = b.PRODUCT_LINE,
                            WipGroupSFC = b.WIP_GROUP_SFC,
                            WipGroupKANBAN = b.WIP_GROUP_KANBAN,
                            Status = status,
                            testTime = b.TEST_TIME,
                            testCode = b.TEST_CODE,
                            testGroup = b.TEST_GROUP,
                            errorDesc = b.ERROR_CODE,
                        };
                    })
                    .Where(r => validStatuses.Contains(r.Status, StringComparer.OrdinalIgnoreCase) &&
                                (!filterByStatus || statuses.Contains(r.Status, StringComparer.OrdinalIgnoreCase)))
                    .ToList();
                // Log result count
                Console.WriteLine($"Result Count: {result?.Count}");

                if (!result.Any())
                {
                    return NotFound(new { message = "Không tìm thấy dữ liệu!", count = 0 });
                }

                return Ok(new
                {
                    count = result?.Count,
                    data = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Xay ra loi", error = ex.Message });
            }
        }

        [HttpGet("bonepile-after-kanban-count")]
        public async Task<IActionResult> BonepileAfterKanbanCount()
        {
            try
            {
                var repairTaskData = await ExecuteBonepileAfterKanbanQuery();

                var excludedSNs = GetExcludedSerialNumbers();
                if (excludedSNs.Any())
                {
                    repairTaskData = repairTaskData.Where(d => !excludedSNs.Contains(d.SFG?.Trim().ToUpper())).ToList();
                }

                var scrapCategories = await _sqlContext.ScrapLists
                    .Select(s => new { SN = s.SN, ApplyTaskStatus = s.ApplyTaskStatus, TaskNumber = s.TaskNumber })
                    .ToListAsync();
                var scrapDict = scrapCategories.ToDictionary(
                    c => c.SN?.Trim().ToUpper() ?? "",
                    c => (ApplyTaskStatus: c.ApplyTaskStatus, TaskNumber: c.TaskNumber),
                    StringComparer.OrdinalIgnoreCase
                );
                var result = repairTaskData.Select(b =>
                {
                    var sn = b.SFG?.Trim().ToUpper() ?? "";
                    string status;

                    var groupKanban = b.WIP_GROUP_KANBAN.Trim();

                    if (!string.IsNullOrEmpty(groupKanban) && groupKanban.IndexOf("B36R_TO_SFG", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        status = "Online";
                    }
                    else if (scrapDict.TryGetValue(sn, out var scrapInfo))
                    {
                        var applyTaskStatus = scrapInfo.ApplyTaskStatus;
                        var taskNumber = scrapInfo.TaskNumber;

                        if (applyTaskStatus == 0 || applyTaskStatus == 1)
                        {
                            status = string.IsNullOrEmpty(taskNumber) ? "ScrapLackTask" : "ScrapHasTask";
                        }
                        else
                        {
                            status = applyTaskStatus switch
                            {
                                2 => "WatitingScrap",
                                3 => "ApproveBGA",
                                _ => "RepairInRE"
                            };
                        }
                    }
                    else
                    {
                        status = "RepairInRE";
                    }
                    return status;
                }).ToList();
                var statusCounts = result
                    .GroupBy(status => status)
                    .Select(g => new
                    {
                        Status = g.Key,
                        Count = g.Count()
                    })
                    .ToList();
                return Ok(new
                {
                    totalCount = result.Count,
                    statusCounts = statusCounts
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Xảy ra lỗi", error = ex.Message });
            }
        }

        private async Task<List<BonepileAfterKanbanResult>> ExecuteBonepileAfterKanbanQuery()
        {
            var rawResult = new List<BonepileAfterKanbanRawResult>();

            await using var connection = new OracleConnection(_oracleContext.Database.GetDbConnection().ConnectionString);
            await connection.OpenAsync();

            string query = @"
        SELECT 
            a.SERIAL_NUMBER AS SFG,
            c.SERIAL_NUMBER AS FG,
            a.MO_NUMBER,
            a.MODEL_NAME,
            b.PRODUCT_LINE,
            a.WIP_GROUP AS WIP_GROUP_KANBAN,
            r107.WIP_GROUP AS WIP_GROUP_SFC,
            c.WORK_TIME,

            r109_sfg.test_time AS SFG_TEST_TIME,
            r109_sfg.test_code AS SFG_TEST_CODE,
            r109_sfg.test_group AS SFG_TEST_GROUP,
            ce_sfg.error_desc AS SFG_ERROR_DESC,

            r109_fg.test_time AS FG_TEST_TIME,
            r109_fg.test_code AS FG_TEST_CODE,
            r109_fg.test_group AS FG_TEST_GROUP,
            ce_fg.error_desc AS FG_ERROR_DESC

        FROM SFISM4.Z_KANBAN_TRACKING_T a
        INNER JOIN SFIS1.C_MODEL_DESC_T b ON a.MODEL_NAME = b.MODEL_NAME
        LEFT JOIN (
            SELECT t.*, ROW_NUMBER() OVER (PARTITION BY t.KEY_PART_SN ORDER BY t.WORK_TIME DESC) AS rn
            FROM SFISM4.P_WIP_KEYPARTS_T t
        ) c ON a.SERIAL_NUMBER = c.KEY_PART_SN AND c.rn = 1
        LEFT JOIN (
            SELECT t.*, ROW_NUMBER() OVER (PARTITION BY t.serial_number ORDER BY t.test_time DESC) AS rn
            FROM SFISM4.R109 t
        ) r109_sfg ON a.SERIAL_NUMBER = r109_sfg.serial_number AND r109_sfg.rn = 1
        LEFT JOIN (
            SELECT t.*, ROW_NUMBER() OVER (PARTITION BY t.serial_number ORDER BY t.test_time DESC) AS rn
            FROM SFISM4.R109 t
        ) r109_fg ON c.SERIAL_NUMBER = r109_fg.serial_number AND r109_fg.rn = 1
        LEFT JOIN SFIS1.C_ERROR_CODE_T ce_sfg ON r109_sfg.test_code = ce_sfg.error_code
        LEFT JOIN SFIS1.C_ERROR_CODE_T ce_fg ON r109_fg.test_code = ce_fg.error_code
        LEFT JOIN SFISM4.R107 r107 ON r107.SERIAL_NUMBER = a.SERIAL_NUMBER
        WHERE a.WIP_GROUP LIKE '%B36R%'
        AND b.model_serial != 'SWITCH'";

            using (var command = new OracleCommand(query, connection))
            {
                using (var reader = await command.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        var item = new BonepileAfterKanbanRawResult
                        {
                            SFG = reader["SFG"]?.ToString(),
                            FG = reader["FG"]?.ToString(),
                            MO_NUMBER = reader["MO_NUMBER"]?.ToString(),
                            MODEL_NAME = reader["MODEL_NAME"]?.ToString(),
                            PRODUCT_LINE = reader["PRODUCT_LINE"]?.ToString(),
                            WIP_GROUP_KANBAN = reader["WIP_GROUP_KANBAN"]?.ToString(),
                            WIP_GROUP_SFC = reader["WIP_GROUP_SFC"]?.ToString(),
                            WORK_TIME = reader["WORK_TIME"] != DBNull.Value ? (DateTime?)reader["WORK_TIME"] : null,
                            SFG_TEST_TIME = reader["SFG_TEST_TIME"] != DBNull.Value ? (DateTime?)reader["SFG_TEST_TIME"] : null,
                            SFG_TEST_CODE = reader["SFG_TEST_CODE"]?.ToString(),
                            SFG_TEST_GROUP = reader["SFG_TEST_GROUP"]?.ToString(),
                            SFG_ERROR_DESC = reader["SFG_ERROR_DESC"]?.ToString(),
                            FG_TEST_TIME = reader["FG_TEST_TIME"] != DBNull.Value ? (DateTime?)reader["FG_TEST_TIME"] : null,
                            FG_TEST_CODE = reader["FG_TEST_CODE"]?.ToString(),
                            FG_TEST_GROUP = reader["FG_TEST_GROUP"]?.ToString(),
                            FG_ERROR_DESC = reader["FG_ERROR_DESC"]?.ToString(),
                        };
                        rawResult.Add(item);
                    }
                }
            }

            // Chuyển thành danh sách chuẩn hóa, chọn theo test_time lớn hơn
            var result = rawResult.Select(b =>
            {
                var sfgTime = b.SFG_TEST_TIME ?? DateTime.MinValue;
                var fgTime = b.FG_TEST_TIME ?? DateTime.MinValue;
                bool useSFG = sfgTime >= fgTime;

                return new BonepileAfterKanbanResult
                {
                    SFG = b.SFG,
                    FG = b.FG,
                    MO_NUMBER = b.MO_NUMBER,
                    MODEL_NAME = b.MODEL_NAME,
                    PRODUCT_LINE = b.PRODUCT_LINE,
                    WIP_GROUP_KANBAN = b.WIP_GROUP_KANBAN,
                    WIP_GROUP_SFC = b.WIP_GROUP_SFC,
                    WORK_TIME = b.WORK_TIME,
                    TEST_CODE = useSFG ? b.SFG_TEST_CODE : b.FG_TEST_CODE,
                    TEST_GROUP = useSFG ? b.SFG_TEST_GROUP : b.FG_TEST_GROUP,
                    TEST_TIME = useSFG ? b.SFG_TEST_TIME : b.FG_TEST_TIME,
                    ERROR_CODE = useSFG ? b.SFG_ERROR_DESC : b.FG_ERROR_DESC
                };
            }).ToList();

            return result;
        }

        private List<string> GetExcludedSerialNumbers()
        {
            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");
            var filePath = Path.Combine(uploadsFolder, "ScrapOk.xlsx");
            var snList = new List<string>();

            if (System.IO.File.Exists(filePath))
            {
                ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
                using var package = new ExcelPackage(new FileInfo(filePath));
                var worksheet = package.Workbook.Worksheets.FirstOrDefault();

                if (worksheet != null)
                {
                    int rowCount = worksheet.Dimension.Rows;
                    for (int row = 1; row <= rowCount; row++)
                    {
                        var sn = worksheet.Cells[row, 1].Text.Trim();
                        if (!string.IsNullOrEmpty(sn))
                        {
                            snList.Add(sn.ToUpper());
                        }
                    }
                }
            }

            return snList;
        }
    }
}
