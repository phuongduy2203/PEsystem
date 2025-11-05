using System;
using System.Collections.Generic;

namespace API_WEB.Dtos.PdRepositorys
{
    public class PdStockSearchRequestDto
    {
        public string? SearchType { get; set; }
        public List<string>? Terms { get; set; }
    }

    public class PdStockSearchResultDto
    {
        public string? SerialNumber { get; set; }
        public string? ModelName { get; set; }
        public string? CartonNo { get; set; }
        public string? LocationStock { get; set; }
        public DateTime? EntryDate { get; set; }
        public string? EntryOp { get; set; }
        public string? WipGroup { get; set; }
    }
}
