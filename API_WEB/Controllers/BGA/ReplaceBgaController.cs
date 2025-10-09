using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using API_WEB.ModelsDB;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API_WEB.Controllers.BGA
{
    [Route("api/bga-replace")]
    [ApiController]
    public class ReplaceBgaController : ControllerBase
    {
        private readonly CSDL_NE _sqlContext;

        private static readonly Dictionary<int, int> _nextStatusMap = new()
        {
            { 4, 10 },
            { 10, 11 },
            { 11, 12 },
            { 12, 13 },
            { 13, 14 },
            { 14, 15 },
            { 15, 16 },
            { 16, 17 }, // Will be overridden when processing x-ray result
            { 17, 3 }
        };

        private static readonly Dictionary<int, string> _statusDescriptions = new()
        {
            { 4, "Waiting approve replace BGA" },
            { 10, "Check in barking" },
            { 11, "Check out barking" },
            { 12, "VI after barking" },
            { 13, "Remove BGA, clean pad" },
            { 14, "Check VI BGA pad" },
            { 15, "Replace BGA" },
            { 16, "Xray" },
            { 17, "ICT, FT" },
            { 3, "Replaced BGA ok" }
        };

        private static string GetStatusName(int status)
        {
            return _statusDescriptions.TryGetValue(status, out var name)
                ? name
                : status.ToString();
        }

        public ReplaceBgaController(CSDL_NE sqlContext)
        {
            _sqlContext = sqlContext;
        }

        private IQueryable<ScrapList> QueryBgaScrapLists()
        {
            return _sqlContext.ScrapLists
                .AsNoTracking()
                .Where(s => s.Category != null && EF.Functions.Like(s.Category, "%BGA%"));
        }

        private IQueryable<HistoryScrapList> QueryBgaHistory()
        {
            return _sqlContext.HistoryScrapLists
                .AsNoTracking()
                .Where(h => h.Category != null && EF.Functions.Like(h.Category, "%BGA%"));
        }

        private static List<string> NormalizeSerialNumbers(IEnumerable<string>? serialNumbers)
        {
            return serialNumbers?
                .Where(sn => !string.IsNullOrWhiteSpace(sn))
                .Select(sn => sn.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList()
                ?? new List<string>();
        }

        private static bool IsBgaCategory(string? category)
        {
            return !string.IsNullOrWhiteSpace(category) && category.Contains("BGA", StringComparison.OrdinalIgnoreCase);
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetByStatus([FromQuery] int status)
        {
            if (!_statusDescriptions.ContainsKey(status))
            {
                return BadRequest(new { message = "Trạng thái không hợp lệ." });
            }

            var records = await QueryBgaScrapLists()
                .Where(s => s.ApplyTaskStatus == status)
                .OrderBy(s => s.SN)
                .Select(s => new
                {
                    s.SN,
                    s.TaskNumber,
                    s.InternalTask,
                    s.Desc,
                    s.ApplyTaskStatus,
                    s.FindBoardStatus,
                    s.ApproveScrapperson,
                    s.ApplyTime
                })
                .ToListAsync();

            if (!records.Any())
            {
                return NotFound(new { message = "Không có dữ liệu cho trạng thái được yêu cầu." });
            }

            var response = records
                .Select(record => new
                {
                    record.SN,
                    record.TaskNumber,
                    record.InternalTask,
                    record.Desc,
                    record.ApplyTaskStatus,
                    StatusName = GetStatusName(record.ApplyTaskStatus),
                    record.FindBoardStatus,
                    record.ApproveScrapperson,
                    record.ApplyTime
                })
                .ToList();

            return Ok(response);
        }

        [HttpGet("dashboard/status-summary")]
        public async Task<IActionResult> GetStatusSummary()
        {
            var summary = await QueryBgaScrapLists()
                .GroupBy(s => s.ApplyTaskStatus)
                .Select(g => new
                {
                    Status = g.Key,
                    Count = g.Count()
                })
                .OrderBy(item => item.Status)
                .ToListAsync();

            var response = summary
                .Select(item => new
                {
                    item.Status,
                    item.Count,
                    StatusName = GetStatusName(item.Status)
                })
                .ToList();

            return Ok(response);
        }

        [HttpGet("dashboard/barking-aging")]
        public async Task<IActionResult> GetBarkingAging()
        {
            var now = DateTime.Now;

            var records = await QueryBgaScrapLists()
                .Where(s => s.ApplyTaskStatus == 11)
                .OrderByDescending(s => s.ApplyTime)
                .Select(s => new
                {
                    s.SN,
                    s.ApplyTime
                })
                .ToListAsync();

            var payload = records
                .Select(record => new
                {
                    sn = record.SN,
                    applyTime = record.ApplyTime,
                    hours = record.ApplyTime.HasValue
                        ? Math.Round((now - record.ApplyTime.Value).TotalHours, 2)
                        : (double?)null
                })
                .ToList();

            return Ok(payload);
        }

        [HttpPost("status/bulk")]
        public async Task<IActionResult> GetStatusForList([FromBody] BulkSnRequest request)
        {
            var normalizedSNs = NormalizeSerialNumbers(request?.SNs);
            if (!normalizedSNs.Any())
            {
                return BadRequest(new { message = "Danh sách SN không hợp lệ." });
            }

            var scrapRecords = await QueryBgaScrapLists()
                .Where(s => normalizedSNs.Contains(s.SN))
                .ToListAsync();

            var result = normalizedSNs
                .Select(sn =>
                {
                    var record = scrapRecords.FirstOrDefault(s => string.Equals(s.SN, sn, StringComparison.OrdinalIgnoreCase));
                    if (record == null)
                    {
                        return new
                        {
                            sn,
                            TaskNumber = (string?)null,
                            InternalTask = (string?)null,
                            Desc = (string?)null,
                            ApplyTaskStatus = (int?)null,
                            statusName = (string?)null,
                            FindBoardStatus = (string?)null,
                            ApproveScrapperson = (string?)null,
                            ApplyTime = (DateTime?)null,
                            isValid = false,
                            message = "Không tìm thấy SN trong Replace BGA."
                        };
                    }

                    var statusName = _statusDescriptions.ContainsKey(record.ApplyTaskStatus)
                        ? _statusDescriptions[record.ApplyTaskStatus]
                        : record.ApplyTaskStatus.ToString();

                    return new
                    {
                        sn = record.SN,
                        record.TaskNumber,
                        record.InternalTask,
                        record.Desc,
                        record.ApplyTaskStatus,
                        statusName,
                        record.FindBoardStatus,
                        record.ApproveScrapperson,
                        record.ApplyTime,
                        isValid = true,
                        message = (string?)null
                    };
                })
                .ToList();

            return Ok(result);
        }

        [HttpPost("history")]
        public async Task<IActionResult> GetHistory([FromBody] BulkSnRequest request)
        {
            var normalizedSNs = NormalizeSerialNumbers(request?.SNs);
            if (!normalizedSNs.Any())
            {
                return BadRequest(new { message = "Danh sách SN không hợp lệ." });
            }

            var histories = await QueryBgaHistory()
                .Where(h => normalizedSNs.Contains(h.SN))
                .OrderBy(h => h.SN)
                .ThenByDescending(h => h.ApplyTime ?? h.CreateTime)
                .Select(h => new
                {
                    h.SN,
                    h.TaskNumber,
                    h.InternalTask,
                    h.Desc,
                    h.ApplyTaskStatus,
                    h.FindBoardStatus,
                    h.ApproveScrapperson,
                    h.ApplyTime,
                    h.CreateTime
                })
                .ToListAsync();

            var response = histories
                .Select(history => new
                {
                    history.SN,
                    history.TaskNumber,
                    history.InternalTask,
                    history.Desc,
                    history.ApplyTaskStatus,
                    StatusName = GetStatusName(history.ApplyTaskStatus),
                    history.FindBoardStatus,
                    history.ApproveScrapperson,
                    history.ApplyTime,
                    history.CreateTime
                })
                .ToList();

            return Ok(response);
        }

        [HttpPost("update-status")]
        public async Task<IActionResult> UpdateStatus([FromBody] UpdateBgaStatusRequest request)
        {
            if (request == null || request.SNs == null || !request.SNs.Any())
            {
                return BadRequest(new { message = "Danh sách SN không được để trống." });
            }

            if (!_statusDescriptions.ContainsKey(request.CurrentStatus) || request.CurrentStatus == 3)
            {
                return BadRequest(new { message = "Trạng thái hiện tại không hợp lệ." });
            }

            if (string.IsNullOrWhiteSpace(request.Remark))
            {
                return BadRequest(new { message = "Remark không được để trống." });
            }

            request.Remark = request.Remark.Trim();
            if (request.Remark.Length > 50)
            {
                return BadRequest(new { message = "Remark không được dài quá 50 ký tự." });
            }

            var normalizedSNs = request.SNs
                .Where(sn => !string.IsNullOrWhiteSpace(sn))
                .Select(sn => sn.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (!normalizedSNs.Any())
            {
                return BadRequest(new { message = "Danh sách SN không hợp lệ." });
            }

            var scrapRecords = await _sqlContext.ScrapLists
                .Where(s => normalizedSNs.Contains(s.SN))
                .ToListAsync();

            var nonBgaRecords = scrapRecords
                .Where(record => !IsBgaCategory(record?.Category))
                .Select(record => record?.SN)
                .Where(sn => !string.IsNullOrEmpty(sn))
                .Cast<string>()
                .ToList();

            if (nonBgaRecords.Any())
            {
                return BadRequest(new
                {
                    message = "Một số SN không thuộc Replace BGA.",
                    details = nonBgaRecords
                });
            }

            var missingSNs = normalizedSNs
                .Except(scrapRecords.Select(s => s.SN), StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (missingSNs.Any())
            {
                return NotFound(new { message = $"Không tìm thấy các SN: {string.Join(", ", missingSNs)}." });
            }

            var invalidStatusSNs = scrapRecords
                .Where(s => s.ApplyTaskStatus != request.CurrentStatus)
                .Select(s => $"{s.SN} (trạng thái hiện tại: {s.ApplyTaskStatus})")
                .ToList();

            if (invalidStatusSNs.Any())
            {
                return BadRequest(new
                {
                    message = "Một số SN không ở trạng thái yêu cầu để cập nhật.",
                    details = invalidStatusSNs
                });
            }

            int nextStatus;
            if (request.CurrentStatus == 16)
            {
                if (string.IsNullOrWhiteSpace(request.XrayResult))
                {
                    return BadRequest(new { message = "Vui lòng chọn kết quả Xray (OK hoặc NG)." });
                }

                var normalizedResult = request.XrayResult.Trim().ToUpperInvariant();
                if (normalizedResult == "OK")
                {
                    nextStatus = 17;
                }
                else if (normalizedResult == "NG")
                {
                    nextStatus = 13;
                }
                else
                {
                    return BadRequest(new { message = "Giá trị XrayResult chỉ được phép là OK hoặc NG." });
                }
            }
            else
            {
                if (!_nextStatusMap.TryGetValue(request.CurrentStatus, out nextStatus))
                {
                    return BadRequest(new { message = "Không xác định được trạng thái tiếp theo." });
                }
            }

            foreach (var record in scrapRecords)
            {
                record.ApplyTaskStatus = nextStatus;
                record.FindBoardStatus = request.Remark;
                record.ApplyTime = DateTime.Now;
            }

            await AddHistoryEntriesAsync(scrapRecords);
            await _sqlContext.SaveChangesAsync();

            var nextStatusName = _statusDescriptions.ContainsKey(nextStatus)
                ? _statusDescriptions[nextStatus]
                : nextStatus.ToString();

            return Ok(new
            {
                message = $"Cập nhật thành công {scrapRecords.Count} SN sang trạng thái '{nextStatusName}'.",
                nextStatus,
                nextStatusName
            });
        }

        private async Task AddHistoryEntriesAsync(IEnumerable<ScrapList> records)
        {
            if (records == null)
            {
                return;
            }

            var historyEntries = records
                .Where(record => record != null)
                .Select(record => new HistoryScrapList
                {
                    SN = record.SN,
                    KanBanStatus = record.KanBanStatus,
                    Sloc = record.Sloc,
                    TaskNumber = record.TaskNumber,
                    PO = record.PO,
                    CreatedBy = record.CreatedBy,
                    Cost = record.Cost,
                    InternalTask = record.InternalTask,
                    Desc = record.Desc,
                    CreateTime = record.CreateTime,
                    ApproveScrapperson = record.ApproveScrapperson,
                    ApplyTaskStatus = record.ApplyTaskStatus,
                    FindBoardStatus = record.FindBoardStatus,
                    Remark = record.Remark,
                    Purpose = record.Purpose,
                    Category = record.Category,
                    ApplyTime = record.ApplyTime,
                    SpeApproveTime = record.SpeApproveTime
                })
                .ToList();

            if (!historyEntries.Any())
            {
                return;
            }

            await _sqlContext.HistoryScrapLists.AddRangeAsync(historyEntries);
        }
    }

    public class UpdateBgaStatusRequest
    {
        public List<string> SNs { get; set; } = new();
        public int CurrentStatus { get; set; }
        public string? Remark { get; set; }
        public string? XrayResult { get; set; }
    }

    public class BulkSnRequest
    {
        public List<string>? SNs { get; set; }
    }
}

