// Hiển thị spinner
function showSpinner() {
    document.getElementById("spinner-overlay").style.display = "flex";
}
// Ẩn spinner
function hideSpinner() {
    document.getElementById("spinner-overlay").style.display = "none";
    removeBackdrop();
}
function showSuccess(message) {
    Swal.fire({
        icon: 'success',
        title: 'Thành công',
        text: message,
        timer: 2000,
        showConfirmButton: false
    });
}
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: message,
        showConfirmButton: true
    });
}
const API_BASE_URL = 'http://10.220.130.119:9090';
const COLUMN_MAPPING = {
    serialNumber: 'SERIAL_NUMBER',
    moNumber: 'MO_NUMBER',
    modelName: 'MODEL_NAME',
    testGroup: 'TEST_GROUP',
    testCode: 'TEST_CODE',
    data1: 'ERROR_DESC',
    data11: 'STATUS_FA',
    data12: 'PRE_STATUS_FA',
    date3: 'TIME',
    data18: 'LOCATION',
    data19: 'NOTE_FA',
    reasonCode: 'REASON_CODE',
    wipGroup: 'WIP_GROUP',
    workFlag: 'WORK_FLAG',
    kanbanWip: 'KANBAN_WIP',
    productLine: 'PRODUCT_LINE',
    shelfCode: 'KỆ',
    columnNumber: 'CỘT',
    levelNumber: 'TẦNG',
    trayNumber: 'KHAY',
    positionInTray: 'Ô',
    entryDate: 'NGÀY_NHẬP',
    entryPerson: 'NGƯỜI_NHẬP',
    borrowDate: 'NGÀY_MƯỢN',
    borrowPerson: 'NGƯỜI_MƯỢN',
    borrowStatus: 'TRẠNG_THÁI_MƯỢN',
    note: 'NOTE',
    actionNe: 'ACTION',
    scrapStatus: 'SCRAP_STATUS'
};

const BORROWED_LOCATION_CHUNK_SIZE = 200;
const borrowedLocationData = {
    found: [],
    missing: []
};
let borrowedLocationTable = null;

function getBorrowedLocationTable() {
    if (!window.jQuery) {
        return null;
    }

    if (borrowedLocationTable) {
        return borrowedLocationTable;
    }

    const tableElement = $('#borrowedLocationTable');
    if (!tableElement.length) {
        return null;
    }

    borrowedLocationTable = tableElement.DataTable({
        destroy: true,
        data: [],
        columns: [
            { data: 'serialNumber' },
            { data: 'warehouse' },
            { data: 'location' },
            { data: 'productLine' },
            { data: 'modelName' }
        ],
        dom: '<"top d-flex align-items-center"flB>rt<"bottom"ip>',
        buttons: [{
            extend: 'excel',
            text: '<img src="/assets/img/excel.png" class="excel-icon"/>',
            className: 'excel-button',
            title: 'BorrowedLocationDetails'
        }]
    });

    return borrowedLocationTable;
}

function openBorrowedLocationModal(type) {
    const table = getBorrowedLocationTable();
    if (!table) {
        return;
    }

    const modalTitle = document.getElementById('borrowedLocationModalLabel');
    const data = type === 'found' ? borrowedLocationData.found : borrowedLocationData.missing;

    table.clear();
    table.rows.add(data);
    table.draw();

    if (modalTitle) {
        modalTitle.textContent = type === 'found' ? 'Danh sách SN có vị trí' : 'Danh sách SN chưa có vị trí';
    }

    $('#borrowedLocationModal').modal('show');
}

async function updateBorrowedLocationStats(totalBorrowed) {
    const locationFoundEl = document.getElementById('borrowed-location-found');
    const locationMissingEl = document.getElementById('borrowed-location-missing');

    if (!locationFoundEl || !locationMissingEl) {
        return;
    }

    borrowedLocationData.found = [];
    borrowedLocationData.missing = [];

    if (!totalBorrowed) {
        locationFoundEl.textContent = '0';
        locationMissingEl.textContent = '0';
        return;
    }

    try {
        const borrowedResponse = await fetch(`${API_BASE_URL}/api/product/borrowed/list`);

        if (!borrowedResponse.ok) {
            throw new Error(`Borrowed list failed with status ${borrowedResponse.status}`);
        }

        const borrowedJson = await borrowedResponse.json();
        if (!borrowedJson.success || !Array.isArray(borrowedJson.serialNumbers)) {
            throw new Error('Borrowed list response is invalid');
        }

        const serialNumbers = borrowedJson.serialNumbers
            .map(sn => (sn || '').trim().toUpperCase())
            .filter(sn => sn);

        if (!serialNumbers.length) {
            locationFoundEl.textContent = '0';
            locationMissingEl.textContent = '0';
            return;
        }

        const locationFound = new Set();
        const locationMissing = new Set();
        const foundDetails = new Map();
        const missingDetails = new Map();

        for (let i = 0; i < serialNumbers.length; i += BORROWED_LOCATION_CHUNK_SIZE) {
            const chunk = serialNumbers.slice(i, i + BORROWED_LOCATION_CHUNK_SIZE);
            const locationResponse = await fetch(`${API_BASE_URL}/api/Search/FindLocations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chunk)
            });

            if (!locationResponse.ok) {
                throw new Error(`FindLocations failed with status ${locationResponse.status}`);
            }

            const locationJson = await locationResponse.json();
            if (!locationJson.success || !Array.isArray(locationJson.data)) {
                throw new Error('FindLocations response is invalid');
            }

            locationJson.data.forEach(item => {
                const serialNumber = (item.serialNumber || item.SerialNumber || '').trim().toUpperCase();
                if (!serialNumber) return;

                const normalizedLocation = (item.location || '').trim();
                const detail = {
                    serialNumber,
                    warehouse: item.warehouse || '',
                    location: normalizedLocation,
                    productLine: item.productLine || '',
                    modelName: item.modelName || ''
                };

                if (normalizedLocation && normalizedLocation.toLowerCase() !== 'borrowed') {
                    locationFound.add(serialNumber);
                    foundDetails.set(serialNumber, detail);
                    missingDetails.delete(serialNumber);
                } else {
                    locationMissing.add(serialNumber);
                    missingDetails.set(serialNumber, {
                        ...detail,
                        location: normalizedLocation || 'Borrowed'
                    });
                }
            });

            if (Array.isArray(locationJson.notFoundSerialNumbers)) {
                locationJson.notFoundSerialNumbers.forEach(sn => {
                    if (sn) {
                        const normalizedSn = sn.trim().toUpperCase();
                        locationMissing.add(normalizedSn);
                        missingDetails.set(normalizedSn, {
                            serialNumber: normalizedSn,
                            warehouse: '',
                            location: 'Không tìm thấy',
                            productLine: '',
                            modelName: ''
                        });
                    }
                });
            }
        }

        serialNumbers.forEach(sn => {
            if (!locationFound.has(sn) && !locationMissing.has(sn)) {
                locationMissing.add(sn);
                missingDetails.set(sn, {
                    serialNumber: sn,
                    warehouse: '',
                    location: 'Borrowed',
                    productLine: '',
                    modelName: ''
                });
            }
        });

        borrowedLocationData.found = Array.from(locationFound).map(sn => {
            const detail = foundDetails.get(sn) || missingDetails.get(sn);
            return detail ? { ...detail, location: detail.location === 'Borrowed' ? '' : detail.location } : {
                serialNumber: sn,
                warehouse: '',
                location: '',
                productLine: '',
                modelName: ''
            };
        });

        borrowedLocationData.missing = Array.from(locationMissing).map(sn => {
            const detail = missingDetails.get(sn) || foundDetails.get(sn);
            if (!detail) {
                return {
                    serialNumber: sn,
                    warehouse: '',
                    location: '',
                    productLine: '',
                    modelName: ''
                };
            }
            return detail.location ? detail : { ...detail, location: '' };
        });

        locationFoundEl.textContent = locationFound.size.toLocaleString('vi-VN');
        locationMissingEl.textContent = locationMissing.size.toLocaleString('vi-VN');
    } catch (error) {
        console.error('Error updating borrowed location stats:', error);
        locationFoundEl.textContent = 'Error';
        locationMissingEl.textContent = 'Error';
        borrowedLocationData.found = [];
        borrowedLocationData.missing = [];
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const foundEl = document.getElementById('borrowed-location-found');
    const missingEl = document.getElementById('borrowed-location-missing');

    if (foundEl) {
        foundEl.addEventListener('click', () => openBorrowedLocationModal('found'));
    }

    if (missingEl) {
        missingEl.addEventListener('click', () => openBorrowedLocationModal('missing'));
    }
});

document.addEventListener("DOMContentLoaded", function () {
    Promise.all([
        fetch(`${API_BASE_URL}/api/product/total`).then(response => response.json()),
        fetch(`${API_BASE_URL}/api/KhoScrap/totalKhoOk`).then(response => response.json()),
        fetch(`${API_BASE_URL}/api/KhoScrap/totalKhoScrap`).then(response => response.json()),
        fetch(`${API_BASE_URL}/api/product/borrowed/count`).then(response => response.json())
    ]).then(async ([repairData, okData, scrapData, borrowedData]) => {
        let repairCount = 0, okCount = 0, scrapCount = 0, borrowedCount = 0;

        if (repairData.success) {
            repairCount = repairData.totalCount;
            document.getElementById("total-repair").textContent = repairCount.toLocaleString('vi-VN');
        } else {
            console.error("API Error (Repair):", repairData.message);
            document.getElementById("total-repair").textContent = "Error";
        }

        if (okData.success) {
            okCount = okData.totalCount;
            document.getElementById("kho-ok-count").textContent = okCount.toLocaleString('vi-VN');
        } else {
            console.error("API Error (OK):", okData.message);
            document.getElementById("kho-ok-count").textContent = "Error";
        }

        if (scrapData.success) {
            scrapCount = scrapData.totalCount;
            document.getElementById("kho-scrap-count").textContent = scrapCount.toLocaleString('vi-VN');
        } else {
            console.error("API Error (Scrap):", scrapData.message);
            document.getElementById("kho-scrap-count").textContent = "Error";
        }

        if (borrowedData.success) {
            borrowedCount = borrowedData.borrowedCount;
            document.getElementById("borrowed-count").textContent = borrowedCount.toLocaleString('vi-VN');
            await updateBorrowedLocationStats(borrowedCount);
        } else {
            console.error("API Error (Borrowed):", borrowedData.message);
            document.getElementById("borrowed-count").textContent = "Error";
            ["borrowed-location-found", "borrowed-location-missing"].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = "Error";
                }
            });
        }

        document.getElementById("total-repair-scrap").textContent = (repairCount + scrapCount).toLocaleString('vi-VN');
    }).catch(error => {
        console.error("Fetch Error:", error);
        ["total-repair-scrap", "total-repair", "kho-ok-count", "kho-scrap-count", "borrowed-count"].forEach(id => {
            document.getElementById(id).textContent = "Error";
        });
        ["borrowed-location-found", "borrowed-location-missing"].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = "Error";
            }
        });
    });
});

function removeBackdrop() {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
}

document.addEventListener("DOMContentLoaded", () => {
    const exportButtons = [
        { id: "export-repair-btn", endpoint: "api/Search/ExportAllDataToExcel", filename: "RepairData" },
        { id: "export-kho-ok-btn", endpoint: "api/Search/ExportExcelKhoOk", filename: "KhoOk" },
        { id: "export-kho-scrap-btn", endpoint: "api/Search/ExportExcelScrap", filename: "KhoScrap" }
    ];

    exportButtons.forEach(({ id, endpoint, filename }) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener("click", async () => {
                try {
                    showSpinner();
                    button.disabled = true;
                    button.textContent = "Đang xuất...";

                    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
                        method: 'GET',
                        headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
                    });

                    if (!response.ok) {
                        if (response.status === 404) {
                            throw new Error(`Điểm cuối API ${endpoint} không tồn tại. Vui lòng kiểm tra cấu hình API.`);
                        }
                        throw new Error(`Không thể xuất dữ liệu từ ${endpoint}. Trạng thái: ${response.status}`);
                    }
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                    showSuccess("Xuất Excel thành công!");
                } catch (error) {
                    console.error(`Lỗi khi xuất Excel (${filename}):`, error.message);
                    showError(`Lỗi khi xuất Excel: ${error.message}`);
                } finally {
                    hideSpinner();
                    button.disabled = false;
                    button.textContent = "Xuất All";
                }
            });
        } else {
            console.error(`Không tìm thấy nút xuất dữ liệu với ID '${id}'`);
        }
    });

    const exportTotalButton = document.getElementById("export-total-btn");
    if (exportTotalButton) {
        exportTotalButton.addEventListener("click", async () => {
            try {
                showSpinner();
                exportTotalButton.disabled = true;
                exportTotalButton.textContent = "Đang xuất...";

                const response = await fetch(`${API_BASE_URL}/api/Search/ExportCombinedDataToExcel`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error(`Điểm cuối API ExportCombinedDataToExcel không tồn tại. Vui lòng kiểm tra cấu hình API.`);
                    }
                    throw new Error(`Không thể xuất dữ liệu. Trạng thái: ${response.status}`);
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `CombinedData-${new Date().toISOString().slice(0, 10)}.xlsx`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);

                showSuccess("Xuất Excel thành công!");
            } catch (error) {
                console.error("Lỗi khi xuất Excel:", error.message);
                showError(`Lỗi khi xuất Excel: ${error.message}`);
            } finally {
                hideSpinner();
                exportTotalButton.disabled = false;
                exportTotalButton.textContent = "Xuất All";
            }
        });
    } else {
        console.error("Không tìm thấy nút xuất dữ liệu với ID 'export-total-btn'");
    }
});

//TỔNG SỐ LƯỢNG CHECK IN RE
document.addEventListener("DOMContentLoaded", () => {
    fetch(`${API_BASE_URL}/api/SAP?page=1&pageSize=1`)
        .then(response => {
            if (!response.ok) throw new Error(`Lỗi HTTP! Trạng thái: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data && typeof data.totalCount === 'number') {
                document.getElementById("total-stock-re").textContent = data.totalCount.toLocaleString('vi-VN');
            } else {
                throw new Error("Định dạng phản hồi API không hợp lệ");
            }
        })
        .catch(error => {
            console.error("Lỗi khi gọi API:", error.message);
            document.getElementById("total-stock-re").textContent = "Lỗi";
            showError("Không thể tải số lượng");
        });

    const exportButton = document.getElementById("export-all-re-btn");
    if (exportButton) {
        exportButton.addEventListener("click", async () => {
            try {
                showSpinner();
                exportButton.disabled = true;
                exportButton.textContent = "Đang xuất...";

                const initialResponse = await fetch(`${API_BASE_URL}/api/SAP?page=1&pageSize=1`);
                if (!initialResponse.ok) throw new Error(`Lỗi HTTP! Trạng thái: ${initialResponse.status}`);
                const initialData = await initialResponse.json();
                if (!initialData || typeof initialData.totalCount !== 'number') throw new Error("Định dạng phản hồi API không hợp lệ");

                const totalCount = initialData.totalCount;
                const totalPages = Math.ceil(totalCount / PAGE_SIZE);
                const allData = [];

                for (let page = 1; page <= totalPages; page++) {
                    const response = await fetch(`${API_BASE_URL}/api/SAP?page=${page}&pageSize=${PAGE_SIZE}`);
                    if (!response.ok) throw new Error(`Lỗi HTTP khi lấy trang ${page}! Trạng thái: ${response.status}`);
                    const data = await response.json();
                    if (data && Array.isArray(data.data)) {
                        allData.push(...data.data);
                    } else {
                        throw new Error(`Dữ liệu trang ${page} không hợp lệ`);
                    }
                }

                const mappedData = allData.map(item => {
                    const mappedItem = {};
                    for (const key in item) {
                        if (COLUMN_MAPPING[key]) {
                            mappedItem[COLUMN_MAPPING[key]] = item[key];
                        } else {
                            mappedItem[key] = item[key];
                        }
                    }
                    return mappedItem;
                });

                if (typeof XLSX === 'undefined') throw new Error("Thư viện XLSX chưa được tải");
                const worksheet = XLSX.utils.json_to_sheet(mappedData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

                const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `AllData_Check_In-${new Date().toISOString().slice(0, 10)}.xlsx`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                showSuccess("Xuất Excel thành công!");
            } catch (error) {
                console.error("Lỗi khi xuất Excel:", error.message);
                showError(`Lỗi khi xuất Excel: ${error.message}`);
            } finally {
                hideSpinner();
                exportButton.disabled = false;
                exportButton.textContent = "Xuất All";
            }
        });
    }
});

//CHECKING B36R
document.addEventListener("DOMContentLoaded", function () {
    let table = $('#dataTable').DataTable({
        destroy: true,
        data: [],
        columns: [
            { data: 'sn' },
            { data: 'productLine' },
            { data: 'modelName' },
            { data: 'moNumber' },
            { data: 'exportDate', type: 'date' },
            { data: 'status' },
            { data: 'linkTime', type: 'date' }
        ],
        dom: '<"top d-flex align-items-center"flB>rt<"bottom"ip>',
        lengthChange: true,
        lengthMenu: [15, 25, 50, 100],
        pageLength: 15,
        buttons: [{
            extend: 'excelHtml5',
            text: '<img src="/assets/img/excel.png" alt="Excel Icon" class="excel-icon excel-button">',
            title: 'CHECK_B36R',
            exportOptions: { columns: [0, 1, 2, 3, 4, 5, 6] },
            customize: function (xlsx) {
                const sheet = xlsx.xl.worksheets['sheet1.xml'];
                const rowCount = table.rows().count();
                const start = startInput.value ? startInput.value.replace('T', ' ') : '';
                const end = endInput.value ? endInput.value.replace('T', ' ') : '';
                const summary = `Số lượng serial_number (${start} - ${end}): ${rowCount}`;
                const sheetData = $('sheetData', sheet);
                const lastRow = $('row', sheet).length;
                sheetData.append(`<row r="${lastRow + 1}"><c t="inlineStr" r="A${lastRow + 1}"><is><t>${summary}</t></is></c></row>`);
            }
        }]
    });


    // Bấm icon lịch thì hiện SweetAlert2 để chọn khoảng thời gian
    const startInput = document.getElementById("cioStartDate");
    const endInput = document.getElementById("cioEndDate");
    const pickBtn = document.getElementById("pickDateBtn");
    if (pickBtn) {
        pickBtn.addEventListener("click", async () => {
            const { value: formValues } = await Swal.fire({
                title: "Chọn khoảng thời gian",
                html: `
                  <label>Từ:</label>
                  <input id="swalStart" type="datetime-local" class="swal2-input" value="${startInput.value}"></br>
                  <label>Đến:</label>
                  <input id="swalEnd" type="datetime-local" class="swal2-input" value="${endInput.value}">
                `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: "OK",
                preConfirm: () => {
                    return [
                        document.getElementById("swalStart").value,
                        document.getElementById("swalEnd").value
                    ];
                }
            });

            if (formValues) {
                startInput.value = formValues[0];
                endInput.value = formValues[1];
                loadCounts();
            }
        });
    }

    function buildUrl() {
        const params = [];
        if (startInput.value) params.push(`startDate=${encodeURIComponent(startInput.value)}`);
        if (endInput.value) params.push(`endDate=${encodeURIComponent(endInput.value)}`);
        return `${API_BASE_URL}/checking-b36r${params.length ? "?" + params.join("&") : ""}`;
    }

    function toRows(arr) {
        return (arr || []).map(item => ({
            sn: item.sn || "N/A",
            productLine: item.productLine || "N/A",
            modelName: item.modelName || "N/A",
            moNumber: item.moNumber || "N/A",
            exportDate: item.exportDate || "N/A",
            linkTime: item.linkTime || "N/A",
            status: item.status || "N/A"
        }));
    }

    function loadCounts() {
        fetch(buildUrl())
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    document.getElementById("totaL-linked-mo").textContent = data.linkCount ?? 0;
                    document.getElementById("total-waiting-link-mo").textContent = data.awaitingLinkCount ?? 0;
                } else {
                    console.error("API Error:", data.message);
                    document.getElementById("totaL-linked-mo").textContent = "Error";
                    document.getElementById("total-waiting-link-mo").textContent = "Error";
                }
            })
            .catch(err => {
                console.error("Fetch Error:", err);
                document.getElementById("totaL-linked-mo").textContent = "Error";
                document.getElementById("total-waiting-link-mo").textContent = "Error";
            });
    }
    loadCounts();

    document.getElementById("totaL-linked-mo").addEventListener("click", function () {
        fetch(buildUrl())
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    const linkedData = toRows(data.linked);
                    if (linkedData.length === 0) {
                        alert("Không có dữ liệu MO đã link để hiển thị.");
                        return;
                    }
                    table.clear();
                    table.rows.add(linkedData).draw();
                    $('#dataModal').modal('show');
                    document.getElementById("dataModalLabel").textContent = "Danh sách MO đã link";
                } else {
                    console.error("API Error:", data.message);
                }
            })
            .catch(err => console.error("Fetch Error:", err));
    });

    document.getElementById("total-waiting-link-mo").addEventListener("click", function () {
        fetch(buildUrl())
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    const awaitingData = toRows(data.awaiting);
                    if (awaitingData.length === 0) {
                        alert("Không có dữ liệu MO chờ link để hiển thị.");
                        return;
                    }
                    table.clear();
                    table.rows.add(awaitingData).draw();
                    $('#dataModal').modal('show');
                    document.getElementById("dataModalLabel").textContent = "Danh sách MO chờ link";
                } else {
                    console.error("API Error:", data.message);
                }
            })
            .catch(err => console.error("Fetch Error:", err));
    });
});

//CHECKING AGING >3 DAYS
document.addEventListener("DOMContentLoaded", function () {
    const table = $('#dataTable-aging-3').DataTable({
        destroy: true,
        data: [],
        pageLength: 5,
        dom: '<"top d-flex align-items-center"flB>rt<"bottom"ip>',
        columns: [
            { data: 'seriaL_NUMBER' },
            { data: 'producT_LINE' },
            { data: 'modeL_NAME' },
            { data: 'mO_NUMBER' },
            { data: 'erroR_FLAG' },
            { data: 'worK_FLAG' },
            { data: 'wiP_GROUP' },
            { data: 'statioN_NAME' },
            {
                data: 'tesT_TIME',
                render: data => data ? new Date(data).toLocaleString() : ''
            },
            { data: 'erroR_CODE' },
            { data: 'erroR_DESC' },
            { data: 'aginG_HOURS'}
        ],
        buttons: [
            {
                extend: 'csvHtml5',
                text: '📄',
                title: null,
                filename: () => `dataNoLocation{new Date().toISOString().slice(0, 10)}`
            },
            {
                extend: 'excelHtml5',
                text: '📥',
                title: null,
                filename: () => `dataNoLocation_${new Date().toISOString().slice(0, 10)}`
            }
        ]
    });

    // Gọi API lấy dữ liệu
    async function loadLackLocation() {
        const countEl = document.getElementById("checkin-3days-count");
        try {
            const response = await fetch(`${API_BASE_URL}/api/CheckInOut/getCheckInRepair`);
            if (!response.ok) {
                throw new Error(`getCheckInRepair failed with status ${response.status}`);
            }

            const payload = await response.json();
            if (!payload || !Array.isArray(payload.data)) {
                throw new Error("API không trả dữ liệu hợp lệ");
            }

            const serialNumbers = payload.data
                .map(item => (item?.SERIAL_NUMBER || item?.seriaL_NUMBER || "").toString().trim().toUpperCase())
                .filter(sn => sn);

            let filteredData = payload.data;

            if (serialNumbers.length) {
                try {
                    const locationResponse = await fetch(`${API_BASE_URL}/api/Search/FindLocations`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(serialNumbers)
                    });

                    if (!locationResponse.ok) {
                        throw new Error(`FindLocations failed with status ${locationResponse.status}`);
                    }

                    const locationPayload = await locationResponse.json();
                    if (!locationPayload || locationPayload.success === false) {
                        throw new Error('FindLocations response is invalid');
                    }

                    const missingSet = new Set(serialNumbers);

                    if (Array.isArray(locationPayload.data)) {
                        locationPayload.data.forEach(item => {
                            const sn = (item?.serialNumber || item?.SerialNumber || "").toString().trim().toUpperCase();
                            if (!sn) return;
                            const location = (item?.location || "").toString().trim();
                            if (location && location.toLowerCase() !== 'borrowed') {
                                missingSet.delete(sn);
                            } else {
                                missingSet.add(sn);
                            }
                        });
                    }

                    if (Array.isArray(locationPayload.notFoundSerialNumbers)) {
                        locationPayload.notFoundSerialNumbers.forEach(sn => {
                            if (!sn) return;
                            missingSet.add(sn.toString().trim().toUpperCase());
                        });
                    }

                    filteredData = payload.data.filter(item => {
                        const sn = (item?.SERIAL_NUMBER || item?.seriaL_NUMBER || "").toString().trim().toUpperCase();
                        return sn && missingSet.has(sn);
                    });
                } catch (locationErr) {
                    console.error('FindLocations error', locationErr);
                    filteredData = payload.data;
                }
            }

            table.clear();
            table.rows.add(filteredData).draw();
            if (countEl) {
                countEl.textContent = filteredData.length.toString();
            }
        } catch (err) {
            console.error("Fetch Error:", err);
            table.clear().draw();
            if (countEl) {
                countEl.textContent = "NULL";
            }
        }
    }
    // Load ngay khi mở trang
    loadLackLocation();
});


//Config checking B36R
document.addEventListener("DOMContentLoaded", function () {
    const settingsBtn = document.getElementById('b36r-settings');
    if (!settingsBtn) return;

    const searchInput = document.getElementById('export-search-input');
    const searchBtn = document.getElementById('export-search-btn');

    const table = $('#exportTable').DataTable({
        destroy: true,
        data: [],
        dom: '<"top d-flex align-items-center"flB>rt<"bottom"ip>',
        columns: [
            { data: 'serialNumber' },
            { data: 'productLine' },
            { data: 'modelName' },
            {
                data: 'exportDate',
                render: data => data ? new Date(data).toLocaleString() : ''
            },
            {
                data: null,
                orderable: false,
                render: () => `<button class="btn btn-sm btn-danger btn-delete">Delete</button>`
            }
        ],
        buttons: [
            {
                extend: 'copyHtml5',
                text: '📋 Copy',
                title: null // bỏ tiêu đề mặc định
            },
            {
                extend: 'csvHtml5',
                text: '📄 CSV',
                title: null,
                filename: function () {
                    const d = new Date();
                    return `ExportB36R_${d.toISOString().slice(0, 10)}`;
                }
            },
            {
                extend: 'excelHtml5',
                text: '📥 Excel',
                title: null,
                filename: function () {
                    const d = new Date();
                    return `ExportB36R_${d.toISOString().slice(0, 10)}`;
                }
            }
        ]
    });

    async function loadData(serialNumbers) {
        let url = `${API_BASE_URL}/api/Export`;
        if (serialNumbers && serialNumbers.length) {
            const query = serialNumbers.map(sn => `serialNumbers=${encodeURIComponent(sn)}`).join('&');
            url += `?${query}`;
        }
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
            table.clear();
            table.rows.add(json.data);
            table.draw();
        }
    }

    settingsBtn.addEventListener('click', function () {
        searchInput.value = '';
        loadData([]);
        $('#exportModal').modal('show');
    });

    searchBtn.addEventListener('click', function () {
        const sns = searchInput.value.split(/\s+/).map(s => s.trim()).filter(s => s);
        loadData(sns);
    });

    $('#exportTable').on('click', '.btn-delete', async function () {
        const data = table.row($(this).parents('tr')).data();
        if (!confirm('Xóa Serial Number này?')) return;
        await fetch(`${API_BASE_URL}/api/Export/${data.id}`, { method: 'DELETE' });
        const sns = searchInput.value.split(/\s+/).map(s => s.trim()).filter(s => s);
        loadData(sns);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('warehouse-search-btn');
    const input = document.getElementById('warehouse-sn-input');
    const createListBtn = document.getElementById('create-list-btn');
    let warehouseNotFound = [];
    let warehouseListItems = [];

    let warehouseTable = $('#warehouseTable').DataTable({
        destroy: true,
        data: [],
        columns: [
            { title: 'Serial Number' },
            { title: 'Kho' },
            { title: 'Vị trí' },
            { title: 'Product Line' },
            { title: 'Model' }
        ],
        dom: '<"top d-flex align-items-center"flB>rt<"bottom"ip>',
        buttons: [{
            extend: 'excel',
            text: '<img src="/assets/img/excel.png" class="excel-icon"/>',
            className: 'excel-button',
            title: 'WarehouseSearchResults'
        }]
    });

    if (btn && input) {
        btn.addEventListener('click', async () => {
            const sns = input.value.split(/\s+/).map(s => s.trim().toUpperCase()).filter(s => s);
            if (!sns.length) return;
            try {
                const res = await fetch(`${API_BASE_URL}/api/Search/FindLocations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sns)
                });
                const data = await res.json();
                warehouseTable.clear();

                if (data.success) {
                    const borrowedSerials = [];
                    const noPositionSerials = [];

                    data.data.forEach(d => {
                        warehouseTable.row.add([
                            d.serialNumber,
                            d.warehouse,
                            d.location || '',
                            d.productLine || '',
                            d.modelName || ''
                        ]);
                        if (d.borrowStatus === 'Borrowed') borrowedSerials.push(d.serialNumber);
                        if (!d.location) noPositionSerials.push(d.serialNumber);
                    });

                    warehouseNotFound = data.notFoundSerialNumbers || [];
                    warehouseListItems = [...warehouseNotFound, ...borrowedSerials, ...noPositionSerials];

                    if (warehouseNotFound.length) {
                        warehouseNotFound.forEach(sn => {
                            warehouseTable.row.add([sn, 'Not found', '', '', '']);
                        });
                    }
                    if (createListBtn) {
                        createListBtn.style.display = warehouseListItems.length ? 'inline-block' : 'none';
                    }
                } else {
                    warehouseNotFound = [];
                    warehouseListItems = [];
                    if (createListBtn) createListBtn.style.display = 'none';
                }

                warehouseTable.draw();
                $('#warehouseModal').modal('show');
            } catch (err) {
                console.error('FindLocations error', err);
            }
        });
    }

    if (createListBtn) {
        createListBtn.addEventListener('click', async () => {
            const currentUser = document.getElementById('entryPerson').value;
            if (!warehouseListItems.length) {
                showError('Không có Serial Number không tìm thấy!');
                return;
            }
            $('#warehouseModal').modal('hide');
            Swal.fire({
                title: 'Tạo danh sách tìm kiếm',
                input: 'text',
                inputLabel: 'Tên danh sách',
                inputPlaceholder: 'Nhập tên danh sách',
                showCancelButton: true,
                confirmButtonText: 'Lưu',
                cancelButtonText: 'Hủy',
                showLoaderOnConfirm: true,
                preConfirm: async (listName) => {
                    if (!listName || listName.trim() === '') {
                        Swal.showValidationMessage('Vui lòng nhập tên danh sách!');
                        return false;
                    }
                    try {
                        showSpinner();
                        const response = await fetch(`${API_BASE_URL}/api/Search/SaveSearchList`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                listName: listName.trim(),
                                createdBy: currentUser,
                                foundItems: [],
                                notFoundItems: warehouseListItems.map(sn => ({
                                    serialNumber: sn || '',
                                    modelName: '',
                                    location: ''
                                }))
                            })
                        });
                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.message || 'Không thể lưu danh sách!');
                        }
                        return { success: true };
                    } catch (error) {
                        Swal.showValidationMessage(`Lỗi: ${error.message}`);
                        return false;
                    } finally {
                        hideSpinner();
                    }
                },
                allowOutsideClick: () => !Swal.isLoading()
            }).then(result => {
                if (result.isConfirmed && result.value.success) {
                    showSuccess('Success!!');
                }
                $('#warehouseModal').modal('show');
            });
        });
    }
});
