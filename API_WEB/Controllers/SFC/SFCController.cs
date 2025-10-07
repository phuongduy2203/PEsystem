using Microsoft.AspNetCore.Mvc;
using Oracle.ManagedDataAccess.Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API_WEB.Controllers.SFC
{
    [Route("api/[controller]")]
    [ApiController]
    public class SFCController : ControllerBase
    {
        private readonly string _connectionString = "User Id=TE;Password=B05te;Data Source=(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=10.220.130.220)(PORT=1521)))(CONNECT_DATA=(SERVER=DEDICATED)(SERVICE_NAME=vnsfc)))";

        [HttpPost("history-error-by-sn")]
        public async Task<IActionResult> GetErrorHistory([FromBody] HistoryErrorRequest request)
        {
            try
            {
                if (request == null || request.SerialNumbers == null || !request.SerialNumbers.Any() || (request.TypeValue != 1 && request.TypeValue != 2))
                {
                    return BadRequest("Invalid request: SerialNumbers and TypeValue are required. TypeValue must be 1 or 2.");
                }

                // Construct parameter placeholders
                var snPlaceholders = string.Join(", ", request.SerialNumbers.Select((_, i) => $":sn{i}"));
                string query = request.TypeValue == 1 ? GetSqlQueryType1(snPlaceholders) : GetSqlQueryType2(snPlaceholders);

                var results = new List<Dictionary<string, object>>();

                using (var connection = new OracleConnection(_connectionString))
                {
                    await connection.OpenAsync();
                    using (var command = new OracleCommand(query, connection))
                    {
                        // Add parameters to prevent SQL injection
                        for (int i = 0; i < request.SerialNumbers.Count; i++)
                        {
                            command.Parameters.Add(new OracleParameter($"sn{i}", request.SerialNumbers[i]));
                        }

                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                var row = new Dictionary<string, object>();
                                for (int j = 0; j < reader.FieldCount; j++)
                                {
                                    row[reader.GetName(j)] = reader.IsDBNull(j) ? null : reader.GetValue(j);
                                }
                                results.Add(row);
                            }
                        }
                    }
                }

                if (!results.Any())
                {
                    return NotFound("No error history found for the provided serial numbers.");
                }

                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }

        [HttpPost("search-ult-data")]
        public async Task<IActionResult> SearchULTData([FromBody] ULTDataRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrEmpty(request.Type) || request.Data == null || !request.Data.Any())
                {
                    return BadRequest("Invalid request: Type and Data are required.");
                }

                if (request.Type != "SN" && request.Type != "ULT")
                {
                    return BadRequest("Invalid Type: Type must be 'SN' or 'ULT'.");
                }

                // Construct parameter placeholders
                var dataPlaceholders = string.Join(", ", request.Data.Select((_, i) => $":data{i}"));
                string query = request.Type == "SN"
                    ? $"SELECT SERIAL_NUMBER, MODEL_NAME, GROUP_NAME, PASS_TIME TEST_TIME, ULT, ATE_STATION_NO STATION_NAME, DATA1 TEST_ON, DATA2 TEST_OFF, DATA5 TEST_RESULT FROM sfism4.R_ULT_RESULT_T WHERE SERIAL_NUMBER IN ({dataPlaceholders})"
                    : $"SELECT SERIAL_NUMBER, MODEL_NAME, GROUP_NAME, PASS_TIME TEST_TIME, ULT, ATE_STATION_NO STATION_NAME, DATA1 TEST_ON, DATA2 TEST_OFF, DATA5 TEST_RESULT FROM sfism4.R_ULT_RESULT_T WHERE ULT IN ({dataPlaceholders})";

                var results = new List<Dictionary<string, object>>();

                using (var connection = new OracleConnection(_connectionString))
                {
                    await connection.OpenAsync();
                    using (var command = new OracleCommand(query, connection))
                    {
                        // Add parameters to prevent SQL injection
                        for (int i = 0; i < request.Data.Count; i++)
                        {
                            command.Parameters.Add(new OracleParameter($"data{i}", request.Data[i]));
                        }

                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                var row = new Dictionary<string, object>();
                                for (int j = 0; j < reader.FieldCount; j++)
                                {
                                    row[reader.GetName(j)] = reader.IsDBNull(j) ? null : reader.GetValue(j);
                                }
                                results.Add(row);
                            }
                        }
                    }
                }

                if (!results.Any())
                {
                    return NotFound($"No data found for the provided {request.Type}.");
                }

                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }

        [HttpGet("summary-retest-result")]
        public async Task<IActionResult> GetSummaryRetestResult()
        {
            try
            {
                string query = @"
                    SELECT
                        t.shift_date AS test_date,
                        t.time_frame,
                        COUNT(t.SERIAL_NUMBER) AS total_sn_tested,
                        SUM(CASE WHEN t.DATA2 = 'Pass' THEN 1 ELSE 0 END) AS pass_count,
                        SUM(CASE WHEN t.DATA2 = 'Fail' THEN 1 ELSE 0 END) AS fail_count
                    FROM (
                        SELECT
                            A.SERIAL_NUMBER,
                            A.PASS_TIME,
                            A.DATA1,
                            A.DATA2,
                            B.MODEL_SERIAL,
                            TRUNC((A.PASS_TIME - TRUNC(A.PASS_TIME)) * 24 * 60) AS minute_of_day,
                            CASE
                                WHEN TRUNC((A.PASS_TIME - TRUNC(A.PASS_TIME)) * 24 * 60) BETWEEN 450 AND 1169
                                THEN '07:30–19:30'
                                ELSE '19:30–07:30'
                            END AS time_frame,
                            CASE
                                WHEN TRUNC((A.PASS_TIME - TRUNC(A.PASS_TIME)) * 24 * 60) < 450
                                THEN TRUNC(A.PASS_TIME) - 1
                                ELSE TRUNC(A.PASS_TIME)
                            END AS shift_date
                        FROM sfism4.R_ULT_RESULT_T A
                        JOIN SFIS1.C_MODEL_DESC_T B
                          ON A.MODEL_NAME = B.MODEL_NAME
                        WHERE A.PASS_TIME >= TRUNC(SYSDATE - 6) + INTERVAL '7:30' HOUR TO MINUTE
                          AND A.PASS_TIME < TRUNC(SYSDATE + 1) + INTERVAL '7:30' HOUR TO MINUTE
                          AND B.MODEL_SERIAL = 'ADAPTER'
                          AND A.DATA1 = 'N/A'
                    ) t
                    GROUP BY t.shift_date, t.time_frame
                    ORDER BY t.shift_date, t.time_frame";

                var results = new List<Dictionary<string, object>>();

                using (var connection = new OracleConnection(_connectionString))
                {
                    await connection.OpenAsync();
                    using (var command = new OracleCommand(query, connection))
                    {
                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                var row = new Dictionary<string, object>();
                                for (int j = 0; j < reader.FieldCount; j++)
                                {
                                    row[reader.GetName(j)] = reader.IsDBNull(j) ? null : reader.GetValue(j);
                                }
                                results.Add(row);
                            }
                        }
                    }
                }

                if (!results.Any())
                {
                    return NotFound("No retest summary data found for the specified criteria.");
                }

                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }

        [HttpPost("summary-retest-model")]
        public async Task<IActionResult> GetSummaryRetestModel([FromBody] RetestModelRequest request)
        {
            try
            {
                if (request == null || request.StartTime == default || request.EndTime == default)
                {
                    return BadRequest("Invalid request: StartTime and EndTime are required.");
                }

                if (request.EndTime <= request.StartTime)
                {
                    return BadRequest("Invalid request: EndTime must be greater than StartTime.");
                }

                string query = @"
                    SELECT 
                        A.MODEL_NAME,
                        COUNT(A.SERIAL_NUMBER) AS TOTAL_TESTS,
                        SUM(CASE WHEN A.DATA2 = 'Pass' THEN 1 ELSE 0 END) AS PASS_COUNT,
                        SUM(CASE WHEN A.DATA2 = 'Fail' THEN 1 ELSE 0 END) AS FAIL_COUNT
                    FROM 
                        sfism4.R_ULT_RESULT_T A
                    INNER JOIN 
                        SFIS1.C_MODEL_DESC_T B
                    ON 
                        A.MODEL_NAME = B.MODEL_NAME
                    WHERE 
                        A.PASS_TIME BETWEEN :startTime AND :endTime
                        AND B.MODEL_SERIAL = 'ADAPTER'
                        AND A.DATA1 = 'N/A'
                    GROUP BY 
                        A.MODEL_NAME
                    ORDER BY 
                        A.MODEL_NAME";

                var results = new List<Dictionary<string, object>>();

                using (var connection = new OracleConnection(_connectionString))
                {
                    await connection.OpenAsync();
                    using (var command = new OracleCommand(query, connection))
                    {
                        // Add parameters to prevent SQL injection
                        command.Parameters.Add(new OracleParameter("startTime", request.StartTime));
                        command.Parameters.Add(new OracleParameter("endTime", request.EndTime));

                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                var row = new Dictionary<string, object>();
                                for (int j = 0; j < reader.FieldCount; j++)
                                {
                                    row[reader.GetName(j)] = reader.IsDBNull(j) ? null : reader.GetValue(j);
                                }
                                results.Add(row);
                            }
                        }
                    }
                }

                if (!results.Any())
                {
                    return NotFound("No retest model summary data found for the specified time range.");
                }

                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }

        private string GetSqlQueryType1(string snPlaceholders)
        {
            return $@"
                SELECT * FROM
                (
                    SELECT 
                        r.SERIAL_NUMBER,
                        ref.KEY_PART_SN
                    FROM (
                        SELECT column_value AS KEY_PART_SN
                        FROM TABLE(SYS.ODCIVARCHAR2LIST({snPlaceholders}))
                    ) ref
                    LEFT JOIN sfism4.r_wip_keyparts_t r
                        ON ref.KEY_PART_SN = r.KEY_PART_SN
                    UNION ALL
                    SELECT 
                        p.SERIAL_NUMBER,
                        ref.KEY_PART_SN
                    FROM (
                        SELECT column_value AS KEY_PART_SN
                        FROM TABLE(SYS.ODCIVARCHAR2LIST({snPlaceholders}))
                    ) ref
                    LEFT JOIN sfism4.p_wip_keyparts_t p
                        ON ref.KEY_PART_SN = p.KEY_PART_SN
                    WHERE p.SERIAL_NUMBER IS NOT NULL
                ) a
                LEFT JOIN
                (
                    SELECT 
                        SERIAL_NUMBER,
                        MO_NUMBER,
                        MODEL_NAME,
                        TEST_TIME,
                        TEST_GROUP,
                        TEST_CODE,
                        DATA1,
                        REASON_CODE 
                    FROM SFISM4.R109 
                    WHERE SERIAL_NUMBER IN ({snPlaceholders})
                    AND TEST_GROUP IN ('ICT', 'FT', 'CTO')
                    UNION ALL
                    SELECT 
                        r.SERIAL_NUMBER,
                        r.MO_NUMBER,
                        r.MODEL_NAME,
                        r.TEST_TIME,
                        r.TEST_GROUP,
                        r.TEST_CODE,
                        r.DATA1,
                        r.REASON_CODE
                    FROM SFISM4.R109 r
                    WHERE r.SERIAL_NUMBER IN (
                        SELECT t.SERIAL_NUMBER
                        FROM sfism4.r_wip_keyparts_t t
                        WHERE t.KEY_PART_SN IN ({snPlaceholders})
                        UNION ALL
                        SELECT t.SERIAL_NUMBER
                        FROM sfism4.p_wip_keyparts_t t
                        WHERE t.KEY_PART_SN IN ({snPlaceholders})
                    )
                    AND r.TEST_GROUP IN ('ICT', 'FT', 'CTO')
                ) k
                ON (k.SERIAL_NUMBER = a.SERIAL_NUMBER OR k.SERIAL_NUMBER = a.KEY_PART_SN)
                WHERE TEST_GROUP IS NOT NULL";
        }

        private string GetSqlQueryType2(string snPlaceholders)
        {
            return $@"
                SELECT * FROM 
                (
                    SELECT SERIAL_NUMBER, KEY_PART_SN 
                    FROM SFISM4.R_WIP_KEYPARTS_T 
                    WHERE SERIAL_NUMBER IN ({snPlaceholders}) 
                    AND KEY_PART_NO LIKE 'SFG%'
                    UNION ALL
                    SELECT SERIAL_NUMBER, KEY_PART_SN 
                    FROM SFISM4.P_WIP_KEYPARTS_T 
                    WHERE SERIAL_NUMBER IN ({snPlaceholders}) 
                    AND KEY_PART_NO LIKE 'SFG%'
                ) a
                LEFT JOIN
                (
                    SELECT 
                        SERIAL_NUMBER,
                        MO_NUMBER,
                        MODEL_NAME,
                        TEST_TIME,
                        TEST_GROUP,
                        TEST_CODE,
                        DATA1,
                        REASON_CODE 
                    FROM SFISM4.R109 
                    WHERE SERIAL_NUMBER IN (
                        SELECT SERIAL_NUMBER 
                        FROM SFISM4.R_WIP_KEYPARTS_T 
                        WHERE SERIAL_NUMBER IN ({snPlaceholders}) 
                        AND KEY_PART_NO LIKE 'SFG%'
                        UNION
                        SELECT KEY_PART_SN 
                        FROM SFISM4.R_WIP_KEYPARTS_T 
                        WHERE SERIAL_NUMBER IN ({snPlaceholders}) 
                        AND KEY_PART_NO LIKE 'SFG%'
                        UNION
                        SELECT SERIAL_NUMBER 
                        FROM SFISM4.P_WIP_KEYPARTS_T 
                        WHERE SERIAL_NUMBER IN ({snPlaceholders}) 
                        AND KEY_PART_NO LIKE 'SFG%'
                        UNION
                        SELECT KEY_PART_SN 
                        FROM SFISM4.P_WIP_KEYPARTS_T 
                        WHERE SERIAL_NUMBER IN ({snPlaceholders}) 
                        AND KEY_PART_NO LIKE 'SFG%'
                    ) 
                    AND TEST_GROUP IN ('ICT', 'FT', 'CTO')
                ) b
                ON (a.SERIAL_NUMBER = b.SERIAL_NUMBER OR a.KEY_PART_SN = b.SERIAL_NUMBER)";
        }
    }

    public class HistoryErrorRequest
    {
        public List<string> SerialNumbers { get; set; }
        public int TypeValue { get; set; }
    }

    public class ULTDataRequest
    {
        public string Type { get; set; }
        public List<string> Data { get; set; }
    }

    public class RetestModelRequest
    {
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
    }
}