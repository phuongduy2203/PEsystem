using API_WEB.Models.Bonepile;
using API_WEB.ModelsOracle;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;
using Oracle.ManagedDataAccess.Client;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace API_WEB.Services.Bonepile
{
    public class BonepileAfterRepository : IBonepileAfterRepository
    {
        private readonly OracleDbContext _oracleContext;

        public BonepileAfterRepository(OracleDbContext oracleContext)
        {
            _oracleContext = oracleContext;
        }

        public async Task<List<BonepileAfterKanbanResult>> ExecuteBonepileAfterKanbanBasicQueryAsync(CancellationToken cancellationToken)
        {
            var result = new List<BonepileAfterKanbanResult>();

            await using var connection = new OracleConnection(_oracleContext.Database.GetDbConnection().ConnectionString);
            await connection.OpenAsync(cancellationToken);

            const string query = @"SELECT /*+ USE_NL(A R107 B R109C R109P) LEADING(A) */
    A.SERIAL_NUMBER,
    R107.MO_NUMBER,
    A.MODEL_NAME,
    B.PRODUCT_LINE,
    A.WIP_GROUP AS WIP_GROUP_KANBAN,
    R107.WIP_GROUP AS WIP_GROUP_SFC,
    R107.ERROR_FLAG,
    R107.WORK_FLAG,

    NVL2(R109C.TEST_GROUP, R109C.TEST_GROUP, R109P.TEST_GROUP) AS TEST_GROUP,
    NVL2(R109C.TEST_TIME,  R109C.TEST_TIME,  R109P.TEST_TIME)  AS TEST_TIME,
    NVL2(R109C.TEST_CODE,  R109C.TEST_CODE,  R109P.TEST_CODE)  AS TEST_CODE,
    NVL2(R109C.ERROR_ITEM_CODE, R109C.ERROR_ITEM_CODE, R109P.ERROR_ITEM_CODE) AS ERROR_ITEM_CODE,
    NVL2(E1.ERROR_DESC, E1.ERROR_DESC, E2.ERROR_DESC) AS ERROR_DESC,

    --Aging dựa vào test_time mới nhất
    TRUNC(SYSDATE) - TRUNC(NVL2(R109C.TEST_TIME, R109C.TEST_TIME, R109P.TEST_TIME)) AS AGING,

    -- Aging dựa vào test_time cũ nhất
    TRUNC(SYSDATE) - TRUNC(NVL2(R109C_OLD.TEST_TIME, R109C_OLD.TEST_TIME, R109P_OLD.TEST_TIME)) AS AGING_OLDEST

FROM SFISM4.Z_KANBAN_TRACKING_T A
JOIN SFIS1.C_MODEL_DESC_T B ON A.MODEL_NAME = B.MODEL_NAME
JOIN SFISM4.R107 R107 ON R107.SERIAL_NUMBER = A.SERIAL_NUMBER

/* 🧩 Test mới nhất cho SERIAL_NUMBER */
LEFT JOIN (
    SELECT SERIAL_NUMBER, TEST_GROUP, TEST_TIME, TEST_CODE, ERROR_ITEM_CODE
    FROM (
        SELECT R.*, ROW_NUMBER() OVER (PARTITION BY R.SERIAL_NUMBER ORDER BY R.TEST_TIME DESC) rn
        FROM SFISM4.R109 R
        WHERE R.TEST_TIME IS NOT NULL
    )
    WHERE rn = 1
) R109C ON R109C.SERIAL_NUMBER = A.SERIAL_NUMBER

/* 🧩 Test cũ nhất cho SERIAL_NUMBER */
LEFT JOIN (
    SELECT SERIAL_NUMBER, TEST_TIME
    FROM (
        SELECT R.*, ROW_NUMBER() OVER (PARTITION BY R.SERIAL_NUMBER ORDER BY R.TEST_TIME ASC) rn_asc
        FROM SFISM4.R109 R
        WHERE R.TEST_TIME IS NOT NULL
    )
    WHERE rn_asc = 1
) R109C_OLD ON R109C_OLD.SERIAL_NUMBER = A.SERIAL_NUMBER

/* 🧩 Test mới nhất cho PARENT SN */
LEFT JOIN (
    SELECT CHILD.KEY_PART_SN, R.TEST_GROUP, R.TEST_TIME, R.TEST_CODE, R.ERROR_ITEM_CODE
    FROM (
        SELECT K.KEY_PART_SN,
               MAX(K.SERIAL_NUMBER) KEEP (DENSE_RANK LAST ORDER BY K.WORK_TIME) AS PARENT_SN
        FROM SFISM4.P_WIP_KEYPARTS_T K
        WHERE K.WORK_TIME IS NOT NULL
        GROUP BY K.KEY_PART_SN
    ) CHILD
    JOIN (
        SELECT SERIAL_NUMBER, TEST_GROUP, TEST_TIME, TEST_CODE, ERROR_ITEM_CODE
        FROM (
            SELECT R2.*, ROW_NUMBER() OVER (PARTITION BY R2.SERIAL_NUMBER ORDER BY R2.TEST_TIME DESC) rn
            FROM SFISM4.R109 R2
            WHERE R2.TEST_TIME IS NOT NULL
        )
        WHERE rn = 1
    ) R ON R.SERIAL_NUMBER = CHILD.PARENT_SN
) R109P ON R109P.KEY_PART_SN = A.SERIAL_NUMBER

/* 🧩 Test cũ nhất cho PARENT SN */
LEFT JOIN (
    SELECT CHILD.KEY_PART_SN, R.TEST_TIME
    FROM (
        SELECT K.KEY_PART_SN,
               MAX(K.SERIAL_NUMBER) KEEP (DENSE_RANK LAST ORDER BY K.WORK_TIME) AS PARENT_SN
        FROM SFISM4.P_WIP_KEYPARTS_T K
        WHERE K.WORK_TIME IS NOT NULL
        GROUP BY K.KEY_PART_SN
    ) CHILD
    JOIN (
        SELECT SERIAL_NUMBER, TEST_TIME
        FROM (
            SELECT R2.*, ROW_NUMBER() OVER (PARTITION BY R2.SERIAL_NUMBER ORDER BY R2.TEST_TIME ASC) rn_asc
            FROM SFISM4.R109 R2
            WHERE R2.TEST_TIME IS NOT NULL
        )
        WHERE rn_asc = 1
    ) R ON R.SERIAL_NUMBER = CHILD.PARENT_SN
) R109P_OLD ON R109P_OLD.KEY_PART_SN = A.SERIAL_NUMBER

LEFT JOIN SFIS1.C_ERROR_CODE_T E1 ON R109C.TEST_CODE = E1.ERROR_CODE
LEFT JOIN SFIS1.C_ERROR_CODE_T E2 ON R109P.TEST_CODE = E2.ERROR_CODE

WHERE
    A.WIP_GROUP LIKE '%B36R%'
    AND B.MODEL_SERIAL = 'ADAPTER'
    AND R107.WIP_GROUP NOT LIKE '%BR2C%'
    AND R107.WIP_GROUP NOT LIKE '%BCFA%'
";

            await using var command = new OracleCommand(query, connection);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                result.Add(new BonepileAfterKanbanResult
                {
                    SERIAL_NUMBER = reader["SERIAL_NUMBER"]?.ToString(),
                    MO_NUMBER = reader["MO_NUMBER"]?.ToString(),
                    MODEL_NAME = reader["MODEL_NAME"]?.ToString(),
                    PRODUCT_LINE = reader["PRODUCT_LINE"]?.ToString(),
                    WIP_GROUP_KANBAN = reader["WIP_GROUP_KANBAN"]?.ToString(),
                    WIP_GROUP_SFC = reader["WIP_GROUP_SFC"]?.ToString(),
                    ERROR_FLAG = reader["ERROR_FLAG"]?.ToString(),
                    WORK_FLAG = reader["WORK_FLAG"]?.ToString(),
                    TEST_GROUP = reader["TEST_GROUP"]?.ToString(),
                    TEST_TIME = reader["TEST_TIME"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(reader["TEST_TIME"]),
                    TEST_CODE = reader["TEST_CODE"]?.ToString(),
                    ERROR_ITEM_CODE = reader["ERROR_ITEM_CODE"]?.ToString(),
                    ERROR_DESC = reader["ERROR_DESC"]?.ToString(),
                    AGING = reader["AGING"] == DBNull.Value ? (double?)null : Convert.ToDouble(reader["AGING"])
                });
            }

            return result;
        }

        public List<string> GetExcludedSerialNumbers()
        {
            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");
            var filePath = Path.Combine(uploadsFolder, "ScrapOk.xlsx");
            var snList = new List<string>();

            if (!File.Exists(filePath))
            {
                return snList;
            }

            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
            using var package = new ExcelPackage(new FileInfo(filePath));
            var worksheet = package.Workbook.Worksheets.FirstOrDefault();

            if (worksheet == null || worksheet.Dimension == null)
            {
                return snList;
            }

            var rowCount = worksheet.Dimension.Rows;
            for (var row = 1; row <= rowCount; row++)
            {
                var sn = worksheet.Cells[row, 1].Text.Trim();
                if (!string.IsNullOrEmpty(sn))
                {
                    snList.Add(sn.ToUpperInvariant());
                }
            }

            return snList;
        }
    }
}
