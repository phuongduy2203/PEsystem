async function fetchData(url, payload) {
    try {
        console.log("Đang gọi API:", url, "với payload:", payload); // Debug payload gửi đi
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(response.statusText);
        const data = await response.json();
        console.log("Dữ liệu trả về từ API", url, ":", data); // Debug dữ liệu trả về
        return data;
    } catch (error) {
        console.error(`API Error: ${url}`, error);
        return { success: false, data: [] };
    }
}

const TABLE_CONFIG = {
    xoaR: {
        headers: ["OWNER", "SERIAL_NUMBER","MO_NUMBER", "MODEL_NAME", "WIP_GROUP","ERROR_FLAG", "TEST_GROUP", "TEST_CODE", "ERROR_DESC", "REPAIRER", "REPAIR_TIME", "REASON_CODE", "ERROR_ITEM"],
        fields: ["owner", "seriaL_NUMBER", "mO_NUMBER", "modeL_NAME", "wiP_GROUP", "erroR_FLAG", "tesT_GROUP", "tesT_CODE", "datA1", "repairer", "repaiR_TIME", "reasoN_CODE", "erroR_ITEM_CODE"]
    },
    XacNhanPhanTich: {
        headers: ["OWNER", "SERIAL_NUMBER","MO_NUMBER", "MODEL_NAME","WIP_GROUP", "TEST_GROUP", "TEST_CODE", "ERROR_DESC", "TYPE", "TIME_SAVE", "CURRENT_STATUS", "NEXT_STATUS", "REMARK"],
        fields: ["owner", "seriaL_NUMBER", "mO_NUMBER", "modeL_NAME","wiP_GROUP", "tesT_GROUP", "tesT_CODE", "datA1", "type", "timE_SAVE", "currenT_STATUS", "nexT_STATUS", "remark"]
    }
};

const SerialNumberModal = (() => {
    const MODAL_ID = "serialNumberModal";
    const MODAL_TITLE_ID = "serialNumberModalLabel";
    const TABLE_SELECTOR = "#serialNumberTable";
    let modalInstance = null;
    let dataTableInstance = null;

    const escapeHtml = (value) => {
        if (value === null || value === undefined) return "";
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    };

    function getModalElement() {
        return document.getElementById(MODAL_ID);
    }

    function ensureModalInstance() {
        if (modalInstance) return modalInstance;
        const modalElement = getModalElement();
        if (!modalElement) {
            console.warn("Không tìm thấy modal hiển thị serial number");
            return null;
        }
        if (typeof bootstrap === "undefined" || !bootstrap.Modal) {
            console.warn("Bootstrap Modal chưa được tải");
            return null;
        }
        modalInstance = new bootstrap.Modal(modalElement, { keyboard: true });
        return modalInstance;
    }

    function ensureDataTable() {
        if (!window.$ || !$.fn || !$.fn.DataTable) {
            console.warn("Thư viện DataTable chưa được tải");
            return null;
        }
        if (dataTableInstance) return dataTableInstance;

        dataTableInstance = $(TABLE_SELECTOR).DataTable({
            data: [],
            columns: [
                {
                    title: "SERIAL_NUMBER",
                    data: "serial",
                    className: "align-middle",
                    render: (data, type) => type === "display" ? escapeHtml(data) : data
                },
                {
                    title: "MODEL_NAME",
                    data: "modeL_NAME",
                    className: "align-middle",
                    render: (data, type) => type === "display" ? escapeHtml(data) : data
                },
                {
                    title: "WIP_GROUP",
                    data: "wiP_GROUP",
                    className: "align-middle",
                    render: (data, type) => type === "display" ? escapeHtml(data) : data
                },
                {
                    title: "ERROR_FLAG",
                    data: "erroR_FLAG",
                    className: "align-middle",
                    render: (data, type) => type === "display" ? escapeHtml(data) : data
                },
                {
                    title: "MO_NUMBER",
                    data: "mO_NUMBER",
                    className: "align-middle",
                    render: (data, type) => type === "display" ? escapeHtml(data) : data
                },
                {
                    title: "TEST_GROUP",
                    data: "tesT_GROUP",
                    className: "align-middle",
                    render: (data, type) => type === "display" ? escapeHtml(data) : data
                },
                {
                    title: "ERROR_CODE",
                    data: "tesT_CODE",
                    className: "align-middle",
                    render: (data, type) => type === "display" ? escapeHtml(data) : data
                },
                {
                    title: "ERROR_DESC",
                    data: "datA1",
                    className: "align-middle",
                    render: (data, type) => type === "display" ? escapeHtml(data) : data
                },
                {
                    title: "ERROR_CODE_ITEM",
                    data: "erroR_ITEM_CODE",
                    className: "align-middle",
                    render: (data, type) => type === "display" ? escapeHtml(data) : data
                },
                {
                    title: "REPAIRER",
                    data: "repairer",
                    className: "align-middle",
                    render: (data, type) => type === "display" ? escapeHtml(data) : data
                },
                {
                    title: "REPAIR_TIME",
                    data: "repaiR_TIME",
                    className: "align-middle",
                    render: (data, type) => type === "display" ? escapeHtml(data) : data
                }
            ],
            ordering: false,
            searching: true,
            pageLength: 10,
            lengthMenu: [10, 25, 50, 100],
            language: {
                search: "Tìm kiếm:",
                lengthMenu: "Hiển thị _MENU_ dòng",
                info: "Hiển thị _START_ đến _END_ của _TOTAL_ dòng",
                infoEmpty: "Không có dữ liệu",
                infoFiltered: "(lọc từ _MAX_ dòng)",
                zeroRecords: "Không có serial number phù hợp",
                paginate: {
                    previous: "Trước",
                    next: "Sau"
                }
            }
        });

        return dataTableInstance;
    }

    function updateTitle(category) {
        const titleElement = document.getElementById(MODAL_TITLE_ID);
        if (titleElement) {
            titleElement.textContent = `Serial Number - ${category}`;
        }
    }

    function updateTable(records) {
        const dataTable = ensureDataTable();
        if (!dataTable) return;

        dataTable.clear();
        dataTable.rows.add(records || []);
        dataTable.draw();
        dataTable.columns.adjust();
    }

    return {
        show(category, serialNumbers) {
            if (!category) {
                console.warn("Không có thông tin giờ để hiển thị serial number");
                return;
            }

            updateTitle(category);
            updateTable(serialNumbers);

            const modal = ensureModalInstance();
            if (modal) {
                modal.show();
            }
        }
    };
})();

function renderTable(containerId, data, config, ownerFullNames) {
    const container = document.getElementById(containerId);
    if (!container || !data.length) {
        console.warn(`Không tìm thấy container ${containerId} hoặc dữ liệu rỗng`); // Debug nếu không có dữ liệu
        return;
    }
    //Lọc dữ liệu, chỉ dữ lại các hàng có fullName
    const filteredData = containerId === "XacNhanPhanTich" ? data.filter(item => ownerFullNames[item.owner]) : data;

    const tableHTML = `
        <table border="1" style="width:100%;border-collapse:collapse;text-align:center;">
            <thead><tr>${config.headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
            <tbody>${filteredData.map(item => `
                <tr>${config.fields.map(field => {
        let value = item[field] || "";
        if (field === "owner") value = ownerFullNames[value] || value;
        return `<td title="${value}">${value.length > 50 ? `${value.substring(0, 50)}...` : value}</td>`;
    }).join("")}</tr>`
    ).join("")}</tbody>
        </table>`;

    container.innerHTML = tableHTML;
}

function renderOwnerChart(containerId, data, title, ownerFullNames) {
    //Lọc dữ liệu chỉ giữ lại các mã thẻ có fullName
    const filteredData = containerId === "confirmChart" ? data.filter(item => ownerFullNames[item.owner]) : data;
    const ownerCounts = {};
    filteredData.forEach(item => {
        const ownerName = ownerFullNames[item.owner] || item.owner;
        ownerCounts[ownerName] = (ownerCounts[ownerName] || 0) + 1;
    });

    const sortedData = Object.entries(ownerCounts).sort((a, b) => b[1] - a[1]);
    const categories = sortedData.map(item => item[0]);
    const values = sortedData.map(item => item[1]);

    console.log(`Dữ liệu biểu đồ cho ${containerId}:`, { categories, values }); // Debug dữ liệu biểu đồ

    Highcharts.chart(containerId, {
        chart: {
            type: 'column',
            height: 500,
            backgroundColor: '#ffffff',
            animation: true,
            scrollablePlotArea: {
                minWidth: categories.length * 50,
                scrollPositionX: 0
            },
            zoomType: 'x'
        },
        title: {
            text: title,
            align: 'center',
            style: { color: '#2c3e50', fontSize: '20px', fontWeight: 'bold' }
        },
        xAxis: {
            categories: categories,
            labels: {
                rotation: -45,
                style: { color: '#333', fontSize: '12px', fontWeight: '500' },
                formatter: function () {
                    return this.value.length > 15 ? this.value.substring(0, 15) + '...' : this.value;
                }
            }
        },
        yAxis: {
            title: { text: 'Số lượng', style: { color: '#333', fontSize: '14px' } },
            labels: { style: { color: '#333' } },
            tickInterval: 50
        },
        tooltip: {
            shared: true,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            style: { color: '#fff', fontSize: '12px' }
        },
        legend: { enabled: false },
        plotOptions: {
            column: {
                borderRadius: 8,
                pointWidth: 40,
                dataLabels: {
                    enabled: true,
                    style: { color: '#2c3e50', fontWeight: 'bold', textOutline: 'none' },
                    rotation: 0,
                    y: -30
                },
                pointPadding: 0.05,
                groupPadding: 0.1,
                animation: {
                    duration: 1000
                }
            }
        },
        series: [{
            name: "Số lượng",
            type: 'column',
            data: values,
            color: {
                linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
                stops: [
                    [0, '#FF9800'],
                    [1, '#F57C00']
                ]
            }
        }]
    });
}


function parseDateTime(value) {
    if (!value) return null;

    const tryParse = (input) => {
        const parsed = new Date(input);
        return isNaN(parsed.getTime()) ? null : parsed;
    };

    let result = tryParse(value);
    if (result) return result;

    result = tryParse(value.replace(' ', 'T'));
    if (result) return result;

    const match = value.match(/^(\d{4})[-/](\d{2})[-/](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
        const [, year, month, day, hour, minute, second = '0'] = match;
        return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    }

    return null;
}

function formatHourLabel(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:00`;
}

function normalizeSerialRecord(item) {
    if (!item || typeof item !== "object") {
        return { serial: "" };
    }

    return {
        ...item,
        serial: item.seriaL_NUMBER || item.serial || ""
    };
}

function renderHourlyChart(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Không tìm thấy container ${containerId}`);
        return;
    }

    // 🕒 Lấy phạm vi thời gian ca hiện tại
    const { startDate, endDate } = getShiftTimeRange();
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 🔍 Lọc dữ liệu chỉ nằm trong ca làm việc
    const filteredData = (data || []).filter(item => {
        const date = parseDateTime(item.repaiR_TIME);
        return date && date >= start && date <= end;
    });

    if (!filteredData.length) {
        container.innerHTML = "<div class='text-muted'>Không có dữ liệu trong ca làm việc hiện tại.</div>";
        return;
    }

    const hourAggregator = {};

    filteredData.forEach(item => {
        const date = parseDateTime(item.repaiR_TIME);
        const hourDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
        const key = hourDate.getTime();

        if (!hourAggregator[key]) {
            hourAggregator[key] = {
                label: formatHourLabel(hourDate),
                count: 0,
                records: []
            };
        }

        hourAggregator[key].count += 1;
        hourAggregator[key].records.push(normalizeSerialRecord(item));
    });

    const sortedKeys = Object.keys(hourAggregator).map(Number).sort((a, b) => a - b);
    const seriesData = sortedKeys.map(key => ({
        y: hourAggregator[key].count,
        name: hourAggregator[key].label,
        records: hourAggregator[key].records
    }));

    const categories = sortedKeys.map(key => hourAggregator[key].label);

    Highcharts.chart(containerId, {
        chart: { type: 'column', height: 500, backgroundColor: '#ffffff' },
        title: {
            text: 'Sản lượng xóa R theo giờ (trong ca làm việc)',
            style: { color: '#2c3e50', fontSize: '20px', fontWeight: 'bold' }
        },
        xAxis: {
            categories,
            labels: { rotation: -35, style: { color: '#333', fontSize: '12px' } }
        },
        yAxis: {
            min: 0,
            title: { text: 'Số lượng', style: { color: '#333', fontSize: '14px' } }
        },
        tooltip: { pointFormat: '<b>{point.y}</b> SN', shared: false },
        legend: { enabled: false },
        plotOptions: {
            series: {
                borderRadius: 6,
                pointWidth: 30,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    style: { color: '#2c3e50', fontWeight: 'bold', textOutline: 'none' }
                },
                point: {
                    events: {
                        click: function () {
                            SerialNumberModal.show(this.category, this.options.records || []);
                        }
                    }
                }
            }
        },
        series: [{
            name: 'Số lượng',
            type: 'column',
            data: seriesData,
            color: {
                linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
                stops: [
                    [0, '#42a5f5'],
                    [1, '#1e88e5']
                ]
            }
        }]
    });
}

//GỌI API LẤY FULL_NAME
async function fetchOwnerFullNamesBatch(ownerCodes) {
    if (!ownerCodes.length) {
        console.warn("Không có mã owner để lấy tên đầy đủ"); // Debug nếu không có mã owner
        return {};
    }
    try {
        console.log("Đang lấy tên đầy đủ cho các owner:", ownerCodes); // Debug danh sách owner
        const response = await fetch("http://10.220.130.119:9090/api/SearchFA/get-fullname-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(ownerCodes)
        });
        const data = response.ok ? (await response.json()).data : {};
        console.log("Tên đầy đủ của owner:", data); // Debug dữ liệu tên đầy đủ
        return data;
    } catch (error) {
        console.error("Lỗi lấy tên:", error);
        return {};
    }
}

function getShiftTimeRange() {
    const now = new Date();
    console.log("Thời gian hiện tại:", now);
    const hours = now.getHours();
    const minutes = now.getMinutes();
    console.log("Giờ hiện tại:", hours, "Phút hiện tại:", minutes);
    let startDate, endDate;

    // Kiểm tra nếu giờ hiện tại từ 7:30 sáng đến trước 7:30 tối
    if ((hours > 7 || (hours === 7 && minutes >= 30)) && (hours < 19 || (hours === 19 && minutes < 30))) {
        // Day shift: 7:30AM to 7:30PM of the current day
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 30, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 30, 0);
    } else if (hours >= 19 || (hours === 19 && minutes >= 30)) {
        // Evening to next morning: 7:30PM today to 7:30AM tomorrow
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 30, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 7, 30, 0);
    } else {
        // Night to morning: 7:30PM previous day to 7:30AM today
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 19, 30, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 30, 0);
    }

    // Hàm định dạng thời gian theo giờ địa phương
    const formatDateTimeLocal = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0, cần +1
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const result = {
        startDate: formatDateTimeLocal(startDate),
        endDate: formatDateTimeLocal(endDate)
    };
    console.log("Khoảng thời gian ca làm việc:", result);
    return result;
}

async function loadData(startDate, endDate) {
    try {
        console.log("Đang tải dữ liệu với khoảng thời gian:", { startDate, endDate }); // Debug thời gian gửi API
        const [repair, confirm] = await Promise.all([
            fetchData("http://10.220.130.119:9090/api/SearchFA/get-repair-owner-data", { startDate, endDate }),
            fetchData("http://10.220.130.119:9090/api/SearchFA/get-confirm-save-data", { startDate, endDate })
        ]);

        const allOwners = new Set([...repair.data, ...confirm.data].map(i => i.owner));
        console.log("Danh sách owner:", [...allOwners]); // Debug danh sách owner
        const ownerFullNames = await fetchOwnerFullNamesBatch([...allOwners]);

        if (repair.success) {
            renderTable("xoaR", repair.data, TABLE_CONFIG.xoaR, ownerFullNames);
            renderOwnerChart("repairChart", repair.data, "Sản lượng xóa R theo Owner", ownerFullNames);
            renderHourlyChart("repairHourlyChart", repair.data);
        }
        if (confirm.success) {
            renderTable("XacNhanPhanTich", confirm.data, TABLE_CONFIG.XacNhanPhanTich, ownerFullNames);
            renderOwnerChart("confirmChart", confirm.data, "Sản lượng xác nhận bản lỗi theo Owner", ownerFullNames);
        }
    } catch (error) {
        console.error("Lỗi xử lý:", error);
        showError("Error!");
    }
}

// Initial load
document.addEventListener("DOMContentLoaded", () => {
    console.log("Trang bắt đầu tải"); // Debug khi trang tải
    const { startDate, endDate } = getShiftTimeRange();
    document.getElementById("startDate").value = startDate;
    document.getElementById("endDate").value = endDate;
    loadData(startDate, endDate);
});

// Search button handler
document.getElementById("searchBtn").addEventListener("click", async () => {
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    if (!startDate || !endDate) {
        console.warn("Thiếu thời gian bắt đầu hoặc kết thúc"); // Debug nếu thiếu thời gian
        return showWarning("Vui lòng chọn thời gian!");
    }
    console.log("Nút tìm kiếm được nhấn với thời gian:", { startDate, endDate }); // Debug khi nhấn tìm kiếm
    loadData(startDate, endDate);
});

// Excel export
document.getElementById("PdStock-ExportExcel-btn").addEventListener("click", () => {
    try {
        console.log("Bắt đầu xuất file Excel"); // Debug khi xuất Excel
        const workbook = XLSX.utils.book_new();

        const xoaRTable = document.getElementById("xoaR");
        if (xoaRTable) {
            const xoaRSheet = XLSX.utils.table_to_sheet(xoaRTable.querySelector("table"));
            XLSX.utils.book_append_sheet(workbook, xoaRSheet, "Xóa R");
        } else {
            console.warn("Không tìm thấy bảng xoaR để xuất Excel"); // Debug nếu không tìm thấy bảng
        }

        const xacNhanPhanTichTable = document.getElementById("XacNhanPhanTich");
        if (xacNhanPhanTichTable) {
            const xacNhanPhanTichSheet = XLSX.utils.table_to_sheet(xacNhanPhanTichTable.querySelector("table"));
            XLSX.utils.book_append_sheet(workbook, xacNhanPhanTichSheet, "Xác Nhận Phân Tích");
        } else {
            console.warn("Không tìm thấy bảng XacNhanPhanTich để xuất Excel"); // Debug nếu không tìm thấy bảng
        }

        XLSX.writeFile(workbook, "ExportedData.xlsx");
        console.log("Xuất file Excel thành công"); // Debug khi xuất thành công
        showSuccess("Success!");
    } catch (error) {
        console.error("Lỗi khi xuất file Excel:", error);
        showError("Error!");
    }
});