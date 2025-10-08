// Hiển thị spinner
function showSpinner() {
    document.getElementById("spinner-overlay").style.display = "flex";
}
// Ẩn spinner
function hideSpinner() {
    document.getElementById("spinner-overlay").style.display = "none";
    removeBackdrop()
}
const API_BASE_URL = 'http://10.220.130.119:9090';
const PAGE_SIZE = 2000; // Kích thước trang, khớp với API mặc định
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

document.addEventListener("DOMContentLoaded", function () {
    fetch("http://10.220.130.119:9090/api/product/total") // Đường dẫn API
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById("total-stock").textContent = data.totalCount.toLocaleString('vi-VN');
            } else {
                console.error("API Error:", data.message);
                document.getElementById("total-stock").textContent = "Error";
            }
        })
        .catch(error => {
            console.error("Fetch Error:", error);
            document.getElementById("total-stock").textContent = "Error";
        });

    fetch("http://10.220.130.119:9090/api/product/borrowed/count")
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById("borrowed-count").textContent = data.borrowedCount.toLocaleString('vi-VN');
            }
        })
        .catch(err => console.error('Borrowed count error', err));
});

function removeBackdrop() {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
}

document.addEventListener("DOMContentLoaded", () => {
    const exportButton = document.getElementById("export-all-btn");
    if (exportButton) {
        exportButton.addEventListener("click", async () => {
            try {
                showSpinner();
                exportButton.disabled = true; // Vô hiệu hóa nút trong khi xử lý
                exportButton.textContent = "Đang xuất...";

                const response = await fetch('http://10.220.130.119:9090/api/Search/ExportAllDataToExcel', {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    }
                });

                if (!response.ok) {
                    throw new Error("Không thể xuất dữ liệu!");
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);

                // Tạo link download
                const link = document.createElement('a');
                link.href = url;
                link.download = `AllData-${new Date().toISOString()}.xlsx`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                hideSpinner(); //Hide Spinner
                showSuccess("Success!")
            } catch (error) {
                hideSpinner();
                console.error("Lỗi khi xuất Excel:", error.message);
                showError("Error!");
            } finally {
                hideSpinner();
                exportButton.disabled = false; // Kích hoạt lại nút
                exportButton.textContent = "Xuất All";
            }
        });
    } else {
        console.error("Không tìm thấy nút xuất dữ liệu với ID 'export-all-btn'");
    }
});


document.addEventListener("DOMContentLoaded", () => {
    // Lấy totalCount và hiển thị
    fetch(`${API_BASE_URL}/api/SAP?page=1&pageSize=1`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Lỗi HTTP! Trạng thái: ${response.status}`);
            }
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

    // Xuất toàn bộ dữ liệu ra Excel
    const exportButton = document.getElementById("export-all-re-btn");
    if (exportButton) {
        exportButton.addEventListener("click", async () => {
            try {
                showSpinner();
                exportButton.disabled = true;
                exportButton.textContent = "Đang xuất...";

                // Lấy totalCount để tính số trang
                const initialResponse = await fetch(`${API_BASE_URL}/api/SAP?page=1&pageSize=1`);
                if (!initialResponse.ok) {
                    throw new Error(`Lỗi HTTP! Trạng thái: ${initialResponse.status}`);
                }
                const initialData = await initialResponse.json();
                if (!initialData || typeof initialData.totalCount !== 'number') {
                    throw new Error("Định dạng phản hồi API không hợp lệ");
                }

                const totalCount = initialData.totalCount;
                const totalPages = Math.ceil(totalCount / PAGE_SIZE);
                const allData = [];

                // Gọi API cho từng trang
                for (let page = 1; page <= totalPages; page++) {
                    const response = await fetch(`${API_BASE_URL}/api/SAP?page=${page}&pageSize=${PAGE_SIZE}`);
                    if (!response.ok) {
                        throw new Error(`Lỗi HTTP khi lấy trang ${page}! Trạng thái: ${response.status}`);
                    }
                    const data = await response.json();
                    if (data && Array.isArray(data.data)) {
                        allData.push(...data.data);
                    } else {
                        throw new Error(`Dữ liệu trang ${page} không hợp lệ`);
                    }
                }

                // Chuyển dữ liệu thành Excel
                if (typeof XLSX === 'undefined') {
                    throw new Error("Thư viện XLSX chưa được tải");
                }

                // Ánh xạ tên cột
                const mappedData = allData.map(item => {
                    const mappedItem = {};
                    for (const key in item) {
                        if (COLUMN_MAPPING[key]) {
                            mappedItem[COLUMN_MAPPING[key]] = item[key];
                        } else {
                            mappedItem[key] = item[key]; // Giữ nguyên nếu không có ánh xạ
                        }
                    }
                    return mappedItem;
                });


                const worksheet = XLSX.utils.json_to_sheet(mappedData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Data");


                // Xuất file Excel
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
    } else {
        console.error("Không tìm thấy nút xuất dữ liệu với ID 'export-all-re-btn'");
    }
});


async function fetchTopModelsChart() {
    const response = await fetch("http://10.220.130.119:9090/api/product/top_models");
    const data = await response.json();

    if (!data.success || !Array.isArray(data.topModels)) {
        console.error("Lỗi dữ liệu API:", data);
        document.getElementById("top-model-chart").innerHTML = "<p>Không có dữ liệu.</p>";
        return;
    }

    const categories = data.topModels.map(item => item.modelName);
    const values = data.topModels.map(item => item.count);

    const option = {
        grid: {
            left: "5%",   // ✅ Tăng khoảng cách lề trái
            right: "5%",  // ✅ Tránh cột bị tràn ra ngoài
            bottom: "10%"
        },
        legend: { bottom: 0 },
        tooltip: { trigger: "axis" },
        xAxis: {
            type: "category",
            data: categories,
            axisLabel: {
                rotate: 0,        // ✅ Xoay chữ nhẹ cho dễ đọc
                fontSize: 10,
                color: "#000000",
                formatter: function (value) {
                    return value.length > 10 ? value.substring(0, 10) + "..." : value;
                }
            }
        },
        yAxis: { name: "Số lượng" },
        series: [
            {
                type: "bar",
                name: "Số lượng",
                color: "#2eca6a",
                barWidth: "45%",  // ✅ Điều chỉnh độ rộng cột để có khoảng cách
                barCategoryGap: "30%", // ✅ Giãn khoảng cách giữa các cột
                data: values,
                itemStyle: { borderRadius: [5, 5, 5, 5] }, // ✅ Bo tròn góc trên
                label: { show: true, position: "top", color: "#000", fontWeight: "bold" }
            }
        ]
    };

    // ✅ Vẽ biểu đồ & tự động thu nhỏ theo màn hình
    const chartContainer = document.getElementById("top-model-chart");
    const chart = echarts.init(chartContainer, null, { responsive: true });
    chart.setOption(option);

    // ✅ Đảm bảo biểu đồ tự động resize khi thu nhỏ màn hình
    window.addEventListener("resize", function () {
        chart.resize();
    });
}

document.addEventListener("DOMContentLoaded", fetchTopModelsChart);

document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById("top-models-container");
    if (!container) {
        console.error("Lỗi: Không tìm thấy phần tử 'top-models-container'!");
        return;
    }

    // Hiển thị loader trước khi fetch
    const loader = document.createElement("div");
    loader.className = "loader";
    container.appendChild(loader);

    fetch("http://10.220.130.119:9090/api/product/top_models")
        .then(response => response.json())
        .then(data => {
            loader.style.display = "none"; // Ẩn loader khi có dữ liệu

            if (data.success && Array.isArray(data.topModels)) {
                container.innerHTML = ""; // Xóa nội dung cũ
                data.topModels.forEach((model, index) => {
                    const activityItem = `
                        <div class="activity-item d-flex align-items-center p-3 shadow-sm mb-3">
                            <div class="activite-label display-5 fw-bold">${index + 1}</div>
                            <i class="bi bi-star-fill activity-badge text-warning align-self-center mx-3"></i>
                            <div class="activity-content d-flex justify-content-between align-items-center w-100">
                                <span class="model-name fs-4 fw-bold">${model.modelName}</span>
                                <span class="badge bg-primary fs-5 ms-auto">${model.count}</span>
                            </div>
                        </div>
                    `;
                    container.innerHTML += activityItem;
                });
            } else {
                container.innerHTML = "<p>Không có dữ liệu.</p>";
            }
        })
        .catch(error => {
            console.error("Fetch Error:", error);
            loader.style.display = "none";
            container.innerHTML = "<p>Đã xảy ra lỗi khi tải dữ liệu.</p>";
        });
});

//CHECK B36R
document.addEventListener("DOMContentLoaded", function () {
    // Khởi tạo DataTable
    // Khởi tạo DataTable
    let table = $('#dataTable').DataTable({
        destroy: true,
        data: [],
        columns: [
            { data: 'sn' },
            { data: 'productLine' },
            { data: 'modelName' },
            {
                data: 'exportDate',
                type: 'date' // Đảm bảo cột này được coi là kiểu ngày giờ
            },
            { data: 'status' }
        ],
        dom: 'lBfrtip', // Bao gồm 'B' để hiển thị buttons
        lengthChange: true,
        lengthMenu: [15, 25, 50, 100],
        pageLength: 15,
        buttons: [
            {
                extend: 'excelHtml5',
                text: '<img src = "/assets/img/excel.png" alt = "Excel Icon" style = "width:28px; height:28px;" >', // Sử dụng thẻ img
                title: 'CHECK_B36R', // Tên file Excel
                exportOptions: {
                    columns: [0, 1, 2, 3, 4] // Xuất tất cả các cột
                },
                customize: function (xlsx) {
                    // Tùy chỉnh file Excel nếu cần
                    var sheet = xlsx.xl.worksheets['sheet1.xml'];
                    // Có thể thêm logic tùy chỉnh ở đây
                }
            }
        ]
    });
    // Gọi API để lấy số lượng ban đầu
    fetch("http://10.220.130.119:9090/checking-b36r")
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById("totaL-linked-mo").textContent = data.linkCount;
                document.getElementById("total-waiting-link-mo").textContent = data.awaitingLinkCount;
            } else {
                console.error("API Error:", data.message);
                document.getElementById("totaL-linked-mo").textContent = "Error";
                document.getElementById("total-waiting-link-mo").textContent = "Error";
            }
        })
        .catch(error => {
            console.error("Fetch Error:", error);
            document.getElementById("totaL-linked-mo").textContent = "Error";
            document.getElementById("total-waiting-link-mo").textContent = "Error";
        });

    // Xử lý sự kiện click cho "Đã link"
    document.getElementById("totaL-linked-mo").addEventListener("click", function () {
        fetch("http://10.220.130.119:9090/checking-b36r")
            .then(response => response.json())
            .then(data => {
                if (data.success && data.data) {
                    const linkedData = data.data
                        .filter(item => item.status === "Đã link MO")
                        .map(item => ({
                            sn: item.sn || "N/A",
                            productLine: item.productLine || "N/A",
                            modelName: item.modelName || "N/A",
                            exportDate: item.exportDate || "N/A",
                            status: item.status || "N/A"
                        }));
                    if (linkedData.length === 0) {
                        alert("Không có dữ liệu MO đã link để hiển thị.");
                        return;
                    }
                    table.clear();
                    table.rows.add(linkedData);
                    table.draw();
                    $('#dataModal').modal('show');
                    document.getElementById("dataModalLabel").textContent = "Danh sách MO đã link";
                } else {
                    console.error("API Error:", data.message);
                }
            })
            .catch(error => console.error("Fetch Error:", error));
    });

    // Xử lý sự kiện click cho "Chờ link"
    document.getElementById("total-waiting-link-mo").addEventListener("click", function () {
        fetch("http://10.220.130.119:9090/checking-b36r")
            .then(response => response.json())
            .then(data => {
                if (data.success && data.data) {
                    const awaitingData = data.data
                        .filter(item => item.status === "Chờ Link MO")
                        .map(item => ({
                            sn: item.sn || "N/A",
                            productLine: item.productLine || "N/A",
                            modelName: item.modelName || "N/A",
                            exportDate: item.exportDate || "N/A",
                            status: item.status || "N/A"
                        }));
                    if (awaitingData.length === 0) {
                        alert("Không có dữ liệu MO chờ link để hiển thị.");
                        return;
                    }
                    table.clear();
                    table.rows.add(awaitingData);
                    table.draw();
                    $('#dataModal').modal('show');
                    document.getElementById("dataModalLabel").textContent = "Danh sách MO chờ link";
                } else {
                    console.error("API Error:", data.message);
                }
            })
            .catch(error => console.error("Fetch Error:", error));
    });
});

// Quản lý Export B36R
document.addEventListener("DOMContentLoaded", function () {
    const settingsBtn = document.getElementById('b36r-settings');
    if (!settingsBtn) return;

    const searchInput = document.getElementById('export-search-input');
    const searchBtn = document.getElementById('export-search-btn');
    const addBtn = document.getElementById('export-add-btn');

    const table = $('#exportTable').DataTable({
        destroy: true,
        data: [],
        columns: [
            { data: 'serialNumber' },
            { data: 'productLine' },
            { data: 'modelName' },
            {
                data: 'exportDate',
                render: function (data) {
                    return data ? new Date(data).toLocaleString() : '';
                }
            },
            {
                data: null,
                orderable: false,
                render: function () {
                    return `<button class="btn btn-sm btn-primary btn-edit">Edit</button>
                            <button class="btn btn-sm btn-danger btn-delete">Delete</button>`;
                }
            }
        ]
    });

    async function loadData(query) {
        const url = query ? `${API_BASE_URL}/api/Export?serialNumber=${encodeURIComponent(query)}` : `${API_BASE_URL}/api/Export`;
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
        loadData('');
        $('#exportModal').modal('show');
    });

    searchBtn.addEventListener('click', function () {
        loadData(searchInput.value.trim());
    });

    addBtn.addEventListener('click', async function () {
        const sn = prompt('Nhập Serial Number mới');
        if (!sn) return;
        await fetch(`${API_BASE_URL}/api/Export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serialNumber: sn })
        });
        loadData(searchInput.value.trim());
    });

    $('#exportTable').on('click', '.btn-edit', async function () {
        const data = table.row($(this).parents('tr')).data();
        const newSn = prompt('Chỉnh sửa Serial Number', data.serialNumber);
        if (!newSn) return;
        await fetch(`${API_BASE_URL}/api/Export/${data.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serialNumber: newSn })
        });
        loadData(searchInput.value.trim());
    });

    $('#exportTable').on('click', '.btn-delete', async function () {
        const data = table.row($(this).parents('tr')).data();
        if (!confirm('Xóa Serial Number này?')) return;
        await fetch(`${API_BASE_URL}/api/Export/${data.id}`, { method: 'DELETE' });
        loadData(searchInput.value.trim());
    });
});
