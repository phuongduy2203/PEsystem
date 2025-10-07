using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API_WEB.ModelsDB;
using API_WEB.ModelsOracle;
using System.Net.Http;
using System.Text.Json;
using System.Net.Http.Headers;
using System.Text.Json.Serialization;
using Oracle.ManagedDataAccess.Client;
using System.Collections.Generic;

namespace API_WEB.Controllers.SFC
{
    [Route("api/[controller]")]
    [ApiController]
    public class SFCController : ControllerBase
    {

        private readonly string _connectionString = "User Id=TE;Password=B05te;Data Source=(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=10.220.130.220)(PORT=1521)))(CONNECT_DATA=(SERVER=DEDICATED)(SERVICE_NAME=vnsfc)))";


        [HttpPost("history-error-by-sn")]
        public async Task<IActionResult> GetErrorHistory([FromBody] List<string> serialNumbers)
        {
            try
            {
                if (serialNumbers == null || !serialNumbers.Any())
                {
                    return BadRequest("No serial numbers provided.");
                }

                // Construct the SQL query with dynamic parameter placeholders
                var snPlaceholders = string.Join(", ", serialNumbers.Select((_, i) => $":sn{i}"));
                var query = $@"
                    SELECT * FROM
                    (SELECT 
                        r.SERIAL_NUMBER,
                        ref.KEY_PART_SN,
                        'curent' AS marking
                    FROM (
                        SELECT column_value AS KEY_PART_SN
                        FROM TABLE(SYS.ODCIVARCHAR2LIST({snPlaceholders}))
                    ) ref
                    LEFT JOIN sfism4.r_wip_keyparts_t r
                        ON ref.KEY_PART_SN = r.KEY_PART_SN
                    UNION ALL
                    SELECT 
                        p.SERIAL_NUMBER,
                        ref.KEY_PART_SN,
                        'history' AS marking
                    FROM (
                        SELECT column_value AS KEY_PART_SN
                        FROM TABLE(SYS.ODCIVARCHAR2LIST({snPlaceholders}))
                    ) ref
                    LEFT JOIN sfism4.p_wip_keyparts_t p
                        ON ref.KEY_PART_SN = p.KEY_PART_SN
                    WHERE p.SERIAL_NUMBER IS NOT NULL) a
                    LEFT JOIN
                    (SELECT 
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

                var results = new List<Dictionary<string, object>>();

                using (var connection = new OracleConnection(_connectionString))
                {
                    await connection.OpenAsync();
                    using (var command = new OracleCommand(query, connection))
                    {
                        // Add parameters to prevent SQL injection
                        for (int i = 0; i < serialNumbers.Count; i++)
                        {
                            command.Parameters.Add(new OracleParameter($"sn{i}", serialNumbers[i]));
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
    }
}