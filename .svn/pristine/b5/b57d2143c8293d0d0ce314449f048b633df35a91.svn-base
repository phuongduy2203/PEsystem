// Biến toàn cục
let statusModalInstance = null;
let statusModalElement = null;
let allModalData = []; // Lưu toàn bộ dữ liệu từ API

// Hàm cắt bớt chuỗi
function truncateText(text, maxLength) {
    return (text && typeof text === 'string' && text.length > maxLength)
        ? text.substring(0, maxLength) + "..."
        : text || "";
}

// Hàm cập nhật DataTable trong modal với lưu toàn bộ dữ liệu
async function updateModalSNTable(data) {
    try {
        const tableBody = document.querySelector("#modal-sn-table tbody");
        if (!tableBody) {
            console.error("Không tìm thấy tbody của bảng modal!");
            return false;
        }

        tableBody.innerHTML = "";

        // Xóa DataTable cũ nếu đã khởi tạo
        if ($.fn.DataTable.isDataTable('#modal-sn-table')) {
            $('#modal-sn-table').DataTable().clear().destroy();
        }

        // Kiểm tra dữ liệu
        if (!Array.isArray(data) || data.length === 0) {
            tableBody.innerHTML = "<tr><td colspan='18'>Không có dữ liệu</td></tr>";
            allModalData = []; // Xóa dữ liệu cũ nếu rỗng
            console.warn("Dữ liệu rỗng hoặc không phải mảng:", data);
            return false;
        }

        // Lưu toàn bộ dữ liệu
        allModalData = [...data];

        // Tạo các hàng cho bảng (chỉ render phần hiển thị)
        data.forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td title="${item.seriaL_NUMBER || ''}">${truncateText(item.seriaL_NUMBER || '', 20)}</td>
                <td title="${item.productLine || ''}">${truncateText(item.productLine || '', 20)}</td>
                <td title="${item.modeL_NAME || ''}">${truncateText(item.modeL_NAME || '', 20)}</td>
                <td>${item.wiP_GROUP || ''}</td>
                <td title="${item.tesT_GROUP || ''}">${truncateText(item.tesT_GROUP || '', 20)}</td>
                <td title="${item.tesT_CODE || ''}">${truncateText(item.tesT_CODE || '', 20)}</td>
                <td title="${item.datA1 || ''}">${truncateText(item.datA1 || '', 20)}</td>
                <td title="${item.datA11 || ''}">${item.datA11 || ''}</td>
                <td>${item.tester || ''}</td>
                <td title="${item.datE3 || ''}">${truncateText(item.datE3 || '', 20)}</td>
                <td>${item.datA13 || ''}</td>
                <td>${item.datA18 || ''}</td>
                <td>${item.shelfCode || ''}</td>
                <td>${item.columnNumber || ''}</td>
                <td>${item.levelNumber || ''}</td>
                <td>${item.trayNumber || ''}</td>
                <td>${item.positionInTray || ''}</td>
                <td>${item.borrowStatus || ''}</td>`;
            tableBody.appendChild(row);
        });

        // Khởi tạo DataTable
        $('#modal-sn-table').DataTable({
            paging: true,
            searching: true,
            ordering: false,
            scrollX: true,
            autoWidth: false,
            destroy: true
        }).on('draw.dt', () => console.log("DataTable drawn successfully"))
            .on('error.dt', (e, settings, techNote, message) => console.error("DataTable error:", message));

        return true;
    } catch (error) {
        console.error("Lỗi khi cập nhật DataTable:", error);
        return false;
    }
}

// Hàm gọi API và vẽ biểu đồ trạng thái
async function loadStatusChart() {
    try {
        const response = await fetch("http://10.220.130.119:9090/api/SearchFA/get-status-counts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify("ALL")
        });

        if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);

        const result = await response.json();
        console.log("Dữ liệu API (Status):", result);

        if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
            const categories = result.data.map(item => item.status);
            const seriesData = result.data.map(item => item.count);
            const lineData = seriesData.map(value => Number(((value / result.totalCount) * 100).toFixed(2)));

            if (!document.getElementById("statusChart")) {
                console.error("Lỗi: Không tìm thấy thẻ có ID 'statusChart'");
                return;
            }

            Highcharts.chart('statusChart', {
                chart: { zoomType: 'xy', height: null, backgroundColor: '#ffffff' },
                xAxis: {
                    categories: categories,
                    labels: {
                        style: { color: '#000000', fontSize: '10px' },
                        formatter: function () {
                            return this.value.length > 6 ? this.value.substring(0, 6) + '...' : this.value;
                        }
                    }
                },
                yAxis: [{
                    title: { text: 'Số lượng', style: { color: '#000000' } },
                    labels: { style: { color: '#000000' } },
                    tickInterval: 500
                }, {
                    title: { text: 'Tỷ lệ (%)', style: { color: '#000000' } },
                    labels: { style: { color: '#000000' }, format: '{value}%' },
                    opposite: true,
                    min: 0,
                    max: 100,
                    tickInterval: 10
                }],
                tooltip: {
                    shared: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    style: { color: '#FFFFFF' },
                    formatter: function () {
                        let s = `<b>${this.x}</b><br/>`;
                        this.points.forEach(point => {
                            s += `<span style="color:${point.color}">\u25CF</span> ${point.series.name}: <b>${point.y}${point.series.name === 'Tỷ lệ' ? '%' : ''}</b><br/>`;
                        });
                        return s;
                    }
                },
                legend: { enabled: false },
                plotOptions: {
                    column: {
                        borderRadius: 5,
                        pointWidth: 25,
                        groupPadding: 0.1,
                        dataLabels: {
                            enabled: true,
                            style: { color: '#000000', fontWeight: 'bold' },
                            formatter: function () { return Highcharts.numberFormat(this.y, 0); }
                        },
                        pointPadding: 0.1,
                        point: {
                            events: {
                                click: async function () {
                                    const selectedStatus = this.category;
                                    try {
                                        const payload = { serialNumbers: [], modelName: '', testCode: '', status: selectedStatus, data1: '', handoverStatus: '', location: '' };
                                        const searchResponse = await fetch("http://10.220.130.119:9090/api/SearchFA/search", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify(payload)
                                        });

                                        if (!searchResponse.ok) throw new Error(`API Error: ${searchResponse.status} ${searchResponse.statusText}`);
                                        const searchResult = await searchResponse.json();

                                        if (searchResult.success && searchResult.data && Array.isArray(searchResult.data) && searchResult.data.length > 0) {
                                            const success = await updateModalSNTable(searchResult.data);
                                            if (success && statusModalInstance) statusModalInstance.show();
                                            else showError("Không thể cập nhật DataTable!");
                                        } else {
                                            showError(`No data for status: ${selectedStatus}`);
                                        }
                                    } catch (error) {
                                        console.error("Lỗi khi gọi API search:", error);
                                        showError("Lỗi khi gọi API search: " + (error.message || "Không xác định"));
                                    }
                                }
                            }
                        }
                    },
                    spline: {
                        dataLabels: {
                            enabled: true,
                            style: { color: '#000000', fontWeight: 'bold' },
                            formatter: function () { return `${Highcharts.numberFormat(this.y, 2)}%`; }
                        },
                        marker: { enabled: true, symbol: 'circle', radius: 4 },
                        lineWidth: 2,
                        color: '#00E5FF',
                        point: {
                            events: {
                                click: async function () {
                                    const selectedStatus = this.category;
                                    try {
                                        const payload = { serialNumbers: [], modelName: '', testCode: '', status: selectedStatus, data1: '', handoverStatus: '', location: '' };
                                        const searchResponse = await fetch("http://10.220.130.119:9090/api/SearchFA/search", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify(payload)
                                        });

                                        if (!searchResponse.ok) throw new Error(`API Error: ${searchResponse.status} ${searchResponse.statusText}`);
                                        const searchResult = await searchResponse.json();

                                        if (searchResult.success && searchResult.data && Array.isArray(searchResult.data) && searchResult.data.length > 0) {
                                            const success = await updateModalSNTable(searchResult.data);
                                            if (success && statusModalInstance) statusModalInstance.show();
                                            else showError("Không thể cập nhật DataTable!");
                                        } else {
                                            showError(`No data for status: ${selectedStatus}`);
                                        }
                                    } catch (error) {
                                        console.error("Lỗi khi gọi API search:", error);
                                        showError("Lỗi khi gọi API search: " + (error.message || "Không xác định"));
                                    }
                                }
                            }
                        }
                    }
                },
                series: [{
                    name: "Số lượng",
                    type: 'column',
                    data: seriesData,
                    color: '#FF9800'
                }, {
                    name: "Tỷ lệ",
                    type: 'spline',
                    data: lineData,
                    yAxis: 1
                }]
            });
        } else {
            console.error("Dữ liệu API không hợp lệ hoặc rỗng!");
        }
    } catch (error) {
        console.error("Lỗi khi gọi API hoặc vẽ biểu đồ:", error);
    }
}

// Hàm gọi API và vẽ biểu đồ TOP MODEL
async function fetchChartData() {
    try {
        const response = await fetch("http://10.220.130.119:9090/api/DataChart/getCountModelName");
        if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);

        const data = await response.json();
        console.log("Dữ liệu API (Model):", data);

        if (!data || !data.models || !Array.isArray(data.models)) {
            console.error("API không trả về dữ liệu hợp lệ", data);
            return;
        }

        const categories = data.models.map(item => item.modelName);
        const seriesData = data.models.map(item => item.totalCount);
        const totalAllModels = data.totalAllModels || 1;
        const lineData = seriesData.map(value => parseFloat(((value / totalAllModels) * 100).toFixed(2)));

        Highcharts.chart('container', {
            chart: { zoomType: 'xy', height: null, backgroundColor: '#ffffff' },
            xAxis: {
                categories: categories,
                labels: {
                    style: { color: '#000000', fontSize: '10px' },
                    formatter: function () {
                        return this.value.length > 6 ? this.value.substring(0, 6) + '...' : this.value;
                    }
                }
            },
            yAxis: [{
                title: { text: 'Số lượng', style: { color: '#000000' } },
                labels: { style: { color: '#000000' } },
                tickInterval: 500
            }, {
                title: { text: 'Tỷ lệ (%)', style: { color: '#000000' } },
                labels: { style: { color: '#000000' }, format: '{value}%' },
                opposite: true,
                min: 0,
                max: 100,
                tickInterval: 10
            }],
            tooltip: { shared: true, backgroundColor: 'rgba(0, 0, 0, 0.8)', style: { color: '#FFFFFF' } },
            legend: { enabled: false },
            plotOptions: {
                column: {
                    borderRadius: 5,
                    pointWidth: 25,
                    dataLabels: { enabled: true, style: { color: '#000000' } },
                    pointPadding: 0.1,
                    groupPadding: 0.1,
                    borderRadiusBottomLeft: 10,
                    borderRadiusBottomRight: 10
                },
                spline: {
                    dataLabels: {
                        enabled: true,
                        style: { color: '#000000' },
                        formatter: function () { return this.y.toFixed(2) + "%"; }
                    },
                    marker: { enabled: true, symbol: 'circle', radius: 4 },
                    lineWidth: 2,
                    color: '#00E5FF'
                }
            },
            series: [{
                name: "Số lượng",
                type: 'column',
                data: seriesData,
                color: '#FF9800'
            }, {
                name: "Tỷ lệ (%)",
                type: 'spline',
                data: lineData,
                yAxis: 1
            }]
        });
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);
    }
}

// Hàm khởi chạy khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", () => {
    // Khởi tạo modal
    statusModalElement = document.getElementById("statusModal");
    if (statusModalElement && !statusModalInstance) {
        statusModalInstance = new bootstrap.Modal(statusModalElement, { backdrop: true, keyboard: true });
        statusModalElement.addEventListener('shown.bs.modal', () => console.log("Modal shown"));
        statusModalElement.addEventListener('hidden.bs.modal', () => console.log("Modal closed"));
    }

    // Gọi API và vẽ biểu đồ
    loadStatusChart().catch(error => console.error("Error loading status chart:", error));
    fetchChartData().catch(error => console.error("Error loading model chart:", error));

    // Gắn sự kiện xuất Excel
    const exportExcelBtn = document.getElementById("exportExcelBtn");
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener("click", () => {
            if (allModalData.length === 0) {
                console.error("Không có dữ liệu để xuất Excel!");
                showError("Không có dữ liệu để xuất!");
                return;
            }

            const worksheetData = allModalData.map(item => ({
                "Serial Number": item.seriaL_NUMBER || "",
                "Product Line": item.productLine || "",
                "Model Name": item.modeL_NAME || "",
                "WIP Group": item.wiP_GROUP || "",
                "Test Group": item.tesT_GROUP || "",
                "Test Code": item.tesT_CODE || "",
                "Data1": item.datA1 || "",
                "Data11": item.datA11 || "",
                "Tester": item.tester || "",
                "Date3": item.datE3 || "",
                "Data13": item.datA13 || "",
                "Data18": item.datA18 || "",
                "Shelf Code": item.shelfCode || "",
                "Column Number": item.columnNumber || "",
                "Level Number": item.levelNumber || "",
                "Tray Number": item.trayNumber || "",
                "Position In Tray": item.positionInTray || "",
                "Borrow Status": item.borrowStatus || ""
            }));

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, "SerialNumbers");
            XLSX.writeFile(workbook, `SerialNumbers_${new Date().toISOString().slice(0, 10)}.xlsx`);
            console.log("Excel exported successfully with all data");
        });
    }
});