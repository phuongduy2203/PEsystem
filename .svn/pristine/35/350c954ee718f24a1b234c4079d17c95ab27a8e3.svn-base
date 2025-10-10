// Biến toàn cục
let statusModalInstance = null;
let statusModalElement = null;
let cioModalInstance = null;
let cioModalElement = null;
let allModalData = []; // Lưu toàn bộ dữ liệu từ API
let cioModalData = []; // Lưu dữ liệu chi tiết Check In/Out
let cioNoLocationData = []; // Dữ liệu tồn kho chưa có vị trí
let cioNoLocationTableInstance = null; // Tham chiếu DataTable tồn kho chưa có vị trí
let noLocationTrendDetails = []; // Dữ liệu biểu đồ tồn kho chưa có vị trí 3 ngày gần nhất
let previousDayNoLocationRecords = []; // Danh sách SN chưa có vị trí của ngày hôm trước

const RECEIVING_STATUS_URL = 'http://10.220.130.119:9090/api/RepairStatus/receiving-status';

// Hàm cắt bớt chuỗi
function truncateText(text, maxLength) {
    return (text && typeof text === 'string' && text.length > maxLength)
        ? text.substring(0, maxLength) + "..."
        : text || "";
}

function getValueIgnoreCase(item, key, defaultValue = "") {
    if (!item || !key) return defaultValue;
    if (Object.prototype.hasOwnProperty.call(item, key)) {
        const direct = item[key];
        if (direct !== undefined && direct !== null && direct !== "") {
            return direct;
        }
    }

    const lowerKey = key.toString().toLowerCase();
    for (const prop in item) {
        if (!Object.prototype.hasOwnProperty.call(item, prop)) continue;
        if (prop.toString().toLowerCase() === lowerKey) {
            const value = item[prop];
            if (value !== undefined && value !== null && value !== "") {
                return value;
            }
        }
    }

    return defaultValue;
}

function getSerialForLocation(item) {
    if (!item) return "";
    const source = (item.__sourceType || "").toString().toLowerCase();
    if (source === "after") {
        return (getValueIgnoreCase(item, "SFG") || getValueIgnoreCase(item, "FG") || "").toString();
    }
    return (getValueIgnoreCase(item, "SERIAL_NUMBER") || getValueIgnoreCase(item, "FG") || "").toString();
}

async function fetchLocationMapBySerials(serials = [], options = {}) {
    const uniqueSerials = [...new Set((serials || []).filter(sn => sn))];
    if (!uniqueSerials.length) {
        return {};
    }

    try {
        const response = await fetch('http://10.220.130.119:9090/api/Search/FindLocations', {
        //const response = await fetch('http://localhost:5025/api/Search/FindLocations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(uniqueSerials)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (payload?.success && Array.isArray(payload.data)) {
            return payload.data.reduce((acc, entry) => {
                const key = (entry.serialNumber || '').toString().trim().toUpperCase();
                if (!key) return acc;
                acc[key] = {
                    location: entry.location || '',
                    warehouse: entry.warehouse || '',
                    borrowStatus: entry.borrowStatus || ''
                };
                return acc;
            }, {});
        }
    } catch (error) {
        if (!options.silent) {
            console.error('FindFG error:', error);
        }
    }

    return {};
}

async function attachLocationInfo(items = [], options = {}) {
    const normalized = Array.isArray(items) ? items.map(item => ({ ...item })) : [];
    const lookupSerials = [];

    normalized.forEach(item => {
        const key = getSerialForLocation(item).trim().toUpperCase();
        item.__lookupKey = key;
        if (key) {
            lookupSerials.push(key);
        }
    });

    const locationMap = await fetchLocationMapBySerials(lookupSerials, options);

    normalized.forEach(item => {
        const existingLocation = (getValueIgnoreCase(item, 'LOCATION') || getValueIgnoreCase(item, 'DATA18') || '').toString().trim();
        if (existingLocation) {
            item.location = existingLocation;
        } else if (item.__lookupKey) {
            const locInfo = locationMap[item.__lookupKey];
            if (locInfo && (locInfo.location || locInfo.warehouse)) {
                item.location = [locInfo.warehouse, locInfo.location].filter(Boolean).join(' - ');
                if (!item.borrowStatus) {
                    item.borrowStatus = locInfo.borrowStatus || getValueIgnoreCase(item, 'BORROW_STATUS');
                }
                if (!item.datA18 && locInfo.location) {
                    item.datA18 = locInfo.location;
                }
            } else {
                item.location = '';
            }
        } else {
            item.location = existingLocation;
        }
    });

    return { items: normalized, locationMap };
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
            destroy: true,
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: '📥 Xuất Excel',
                    title: 'SerialNumbers',
                    exportOptions: { columns: ':visible' }
                }
            ]
        }).on('draw.dt', () => console.log("DataTable drawn successfully"))
            .on('error.dt', (e, settings, techNote, message) => console.error("DataTable error:", message));

        return true;
    } catch (error) {
        console.error("Lỗi khi cập nhật DataTable:", error);
        return false;
    }
}

function renderNoLocationTable(items = []) {
    try {
        const section = document.getElementById('cioNoLocationSection');
        const table = document.getElementById('cio-no-location-table');
        const exportBtn = document.getElementById('exportNoLocationExcelBtn');
        if (!section || !table) {
            return;
        }

        const tbody = table.querySelector('tbody');
        if (!tbody) {
            return;
        }

        if (cioNoLocationTableInstance && $.fn.DataTable.isDataTable('#cio-no-location-table')) {
            cioNoLocationTableInstance.clear().destroy();
            cioNoLocationTableInstance = null;
        }

        if (!Array.isArray(items) || items.length === 0) {
            section.style.display = 'none';
            tbody.innerHTML = '';
            cioNoLocationData = [];
            if (exportBtn) {
                exportBtn.disabled = true;
            }
            return;
        }

        section.style.display = '';
        tbody.innerHTML = '';
        cioNoLocationData = items;
        if (exportBtn) {
            exportBtn.disabled = false;
        }

        items.forEach((item) => {
            const row = document.createElement('tr');

            const type = (getValueIgnoreCase(item, 'TYPE') || '').toString();
            const serial = (getValueIgnoreCase(item, 'SFG') || getValueIgnoreCase(item, 'SERIAL_NUMBER') || '').toString();
            const model = (getValueIgnoreCase(item, 'MODEL_NAME') || '').toString();
            const productLine = (getValueIgnoreCase(item, 'PRODUCT_LINE') || '').toString();
            const locationTextRaw = (item.location || getValueIgnoreCase(item, 'DATA18') || getValueIgnoreCase(item, 'LOCATION') || '').toString();
            const errorFlag = (getValueIgnoreCase(item, 'ERROR_FLAG') || '').toString();
            const workFlag = (getValueIgnoreCase(item, 'WORK_FLAG') || '').toString();
            const wipGroup = (getValueIgnoreCase(item, 'WIP_GROUP') || '').toString();
            const checkInCell = (getValueIgnoreCase(item, 'AGING_HOURS') || '').toString();

            const typeCell = document.createElement('td');
            typeCell.textContent = truncateText(type, 30);
            typeCell.title = type;
            row.appendChild(typeCell);

            const serialCell = document.createElement('td');
            serialCell.textContent = truncateText(serial, 30);
            serialCell.title = serial;
            row.appendChild(serialCell);

            const modelCell = document.createElement('td');
            modelCell.textContent = truncateText(model, 30);
            modelCell.title = model;
            row.appendChild(modelCell);

            const productLineCell = document.createElement('td');
            productLineCell.textContent = truncateText(productLine, 30);
            productLineCell.title = productLine;
            row.appendChild(productLineCell);

            const locationCell = document.createElement('td');
            locationCell.dataset.role = 'location';
            locationCell.textContent = truncateText(locationTextRaw, 30);
            locationCell.title = locationTextRaw;
            row.appendChild(locationCell);

            const agingCell = document.createElement('td');
            agingCell.textContent = truncateText(checkInCell, 30);
            agingCell.title = checkInCell;
            row.appendChild(agingCell);

            const wipCell = document.createElement('td');
            wipCell.textContent = truncateText(wipGroup, 30);
            wipCell.title = wipGroup;
            row.appendChild(wipCell);

            const errorCell = document.createElement('td');
            errorCell.textContent = truncateText(errorFlag, 30);
            errorCell.title = errorFlag;
            row.appendChild(errorCell);

            const workCell = document.createElement('td');
            workCell.textContent = truncateText(workFlag, 30);
            workCell.title = workFlag;
            row.appendChild(workCell);

            tbody.appendChild(row);
        });

        cioNoLocationTableInstance = $('#cio-no-location-table').DataTable({
            paging: true,
            searching: true,
            ordering: true,
            scrollX: true,
            autoWidth: false,
            destroy: true
        });
    } catch (error) {
        console.error('renderNoLocationTable error:', error);
    }
}

async function updateNoLocationInventory(items = []) {
    try {
        if (!Array.isArray(items) || items.length === 0) {
            cioNoLocationData = [];
            renderNoLocationTable([]);
            return;
        }

        const { items: enrichedItems } = await attachLocationInfo(items);
        const noLocationItems = enrichedItems.filter(item => !item.location);

        cioNoLocationData = noLocationItems;
        renderNoLocationTable(noLocationItems);
    } catch (error) {
        console.error('updateNoLocationInventory error:', error);
        cioNoLocationData = [];
        renderNoLocationTable([]);
    }
}

// Hiển thị bảng chi tiết Check In/Out BEFORE/AFTER KANBAN
async function showCioModal(data, title, options = {}) {
    try {
        const tableBody = document.querySelector('#cio-modal-table tbody');
        if (!tableBody) {
            console.error('Không tìm thấy tbody của bảng CheckInOut!');
            return;
        }

        tableBody.innerHTML = '';

        const normalizedData = Array.isArray(data) ? data.map(item => ({ ...item })) : [];
        const { items: enrichedData } = await attachLocationInfo(normalizedData, { silent: true });
        cioModalData = enrichedData;

        const shouldShowNoLocation = (options?.type || '').toString().toLowerCase() === 'tonkho';
        const noLocationItems = shouldShowNoLocation ? enrichedData.filter(item => !item.location) : [];

        if ($.fn.DataTable.isDataTable('#cio-modal-table')) {
            $('#cio-modal-table').DataTable().clear().destroy();
        }

        enrichedData.forEach(item => {
            const locationText = item.location || '';
            const row = document.createElement('tr');
            const sn = getValueIgnoreCase(item, 'SFG') || getValueIgnoreCase(item, 'SERIAL_NUMBER') || '';
            row.innerHTML = `
                <td>${sn || ''}</td>
                <td>${getValueIgnoreCase(item, 'FG') || ''}</td>
                <td>${getValueIgnoreCase(item, 'MO_NUMBER') || ''}</td>
                <td>${getValueIgnoreCase(item, 'MODEL_NAME') || ''}</td>
                <td>${getValueIgnoreCase(item, 'PRODUCT_LINE') || ''}</td>
                <td>${getValueIgnoreCase(item, 'WORK_FLAG') || ''}</td>
                <td>${getValueIgnoreCase(item, 'ERROR_FLAG') || ''}</td>
                <td>${locationText}</td>
                <td>${getValueIgnoreCase(item, 'AGING_HOURS') || ''}</td>
                <td>${getValueIgnoreCase(item, 'P_SENDER') || ''}</td>
                <td>${getValueIgnoreCase(item, 'IN_DATETIME') || ''}</td>
                <td>${getValueIgnoreCase(item, 'OUT_DATETIME') || ''}</td>
                <td>${getValueIgnoreCase(item, 'REPAIRER') || ''}</td>
                <td>${getValueIgnoreCase(item, 'STATION_NAME') || ''}</td>
                <td>${getValueIgnoreCase(item, 'ERROR_CODE') || ''}</td>
                <td>${getValueIgnoreCase(item, 'ERROR_DESC') || ''}</td>
                <td>${getValueIgnoreCase(item, 'CHECKIN_STATUS') || getValueIgnoreCase(item, 'TYPE') }</td>`;
            tableBody.appendChild(row);
        });

        if (normalizedData.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = "<td colspan='17'>Không có dữ liệu</td>";
            tableBody.appendChild(emptyRow);
        }

        if (shouldShowNoLocation) {
            renderNoLocationTable(noLocationItems);
        }

        $('#cio-modal-table').DataTable({
            paging: true,
            searching: true,
            ordering: false,
            scrollX: true,
            autoWidth: false,
            destroy: true
        });

        const titleEl = document.getElementById('cioModalLabel');
        if (titleEl) titleEl.textContent = title;
        if (cioModalInstance) cioModalInstance.show();
    } catch (error) {
        console.error('Lỗi hiển thị bảng CheckInOut:', error);
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

// Format datetime cho input type="datetime-local"
function formatDateTime(dt) {
    const pad = (n) => n.toString().padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

// Hàm vẽ biểu đồ CHECK IN/ CHECKOUT BEFORE/AFTER
async function loadCheckInOutChart() {
    const startInput = document.getElementById("cioStartDate");
    const endInput = document.getElementById("cioEndDate");
    if (!startInput || !endInput) {
        console.error("Không tìm thấy input ngày");
        return;
    }

    try {
        // Lấy giá trị chung
        const startDate = startInput.value;
        const endDate = endInput.value;

        // === API Before Kanban ===
        const urlBefore = new URL('http://10.220.130.119:9090/api/CheckInOut/GetCheckInOutBeforeKanban');
        urlBefore.searchParams.append('startDate', startDate);
        urlBefore.searchParams.append('endDate', endDate);

        const resBefore = await fetch(urlBefore);
        if (!resBefore.ok) throw new Error("API Before error");
        const dataBefore = await resBefore.json();

        const checkInBefore = (dataBefore?.checkIn?.data || []).map(item => ({ ...item, __sourceType: 'before' }));
        const checkOutTon = (dataBefore?.checkOut?.tonKhoCu?.data || []).map(item => ({ ...item, __sourceType: 'before' }));
        const checkOutTrongNgay = (dataBefore?.checkOut?.trongNgay?.data || []).map(item => ({ ...item, __sourceType: 'before' }));
        const tonKhoTrongNgay = (dataBefore?.tonKhoTrongNgay?.data || []).map(item => ({ ...item, __sourceType: 'before' }));

        // === API After Kanban ===
        const urlAfter = new URL('http://10.220.130.119:9090/api/CheckInOut/GetCheckInAfterKanBan');
        urlAfter.searchParams.append('startDate', startDate);
        urlAfter.searchParams.append('endDate', endDate);

        const resAfter = await fetch(urlAfter);
        if (!resAfter.ok) throw new Error("API After error");
        const dataAfter = await resAfter.json();

        const checkInAfter = (dataAfter?.data || []).map(item => ({ ...item, __sourceType: 'after' }));

        let tonKhoSummaryBefore = [];
        let tonKhoSummaryAfter = [];
        try {
            const tonKhoUrl = new URL('http://10.220.130.119:9090/api/CheckInOut/GetTonKhoSummary');
            tonKhoUrl.searchParams.append('startDate', startDate);
            tonKhoUrl.searchParams.append('endDate', endDate);

            const tonKhoRes = await fetch(tonKhoUrl);
            if (tonKhoRes.ok) {
                const tonKhoJson = await tonKhoRes.json();
                tonKhoSummaryBefore = (tonKhoJson?.beforeKanban?.data || []).map(item => ({ ...item, __sourceType: 'before' }));
                tonKhoSummaryAfter = (tonKhoJson?.afterKanban?.data || []).map(item => ({ ...item, __sourceType: 'after' }));
            }
        } catch (err) {
            console.error('Lỗi khi gọi API tồn kho:', err);
        }

        const tonKhoCombined = [...tonKhoSummaryBefore, ...tonKhoSummaryAfter];
        await updateNoLocationInventory(tonKhoCombined);

        // === Chart Before vs After ===
        Highcharts.chart('checkInBeforeAfer', {
            chart: { type: 'column', backgroundColor: '#ffffff' },
            title: { text: null },
            xAxis: { categories: ['CheckIn Before', 'CheckIn After', 'Tồn kho'] },
            yAxis: { title: { text: 'Số lượng' } },
            plotOptions: {
                column: {
                    cursor: 'pointer',
                    dataLabels: { enabled: true },
                    point: {
                        events: {
                            click: function () {
                                if (this.custom && this.custom.records) {
                                    showCioModal(this.custom.records, this.custom.title || '', this.custom);
                                }
                            }
                        }
                    }
                }
            },
            series: [{
                name: 'Số lượng',
                data: [
                    { y: checkInBefore.length, color: '#00E5FF', custom: { records: checkInBefore, title: 'Danh sách Check In Before', type: 'before' } },
                    { y: checkInAfter.length, color: '#FF5722', custom: { records: checkInAfter, title: 'Danh sách Check In After', type: 'after' } },
                    { y: tonKhoCombined.length, color: '#4CAF50', custom: { records: tonKhoCombined, title: 'Danh sách tồn kho', type: 'tonKho' } }
                ]
            }]
        });

        // === Chart CheckIn/Out Before ===
        Highcharts.chart('checkInOutChart', {
            chart: { type: 'column', backgroundColor: '#ffffff' },
            title: { text: null },
            xAxis: { categories: ['Check In', 'Check Out tồn', 'Check Out trong ngày', 'Tồn kho trong ngày'] },
            yAxis: { title: { text: 'Số lượng' } },
            plotOptions: {
                column: {
                    cursor: 'pointer',
                    dataLabels: { enabled: true },
                    point: {
                        events: {
                            click: function () {
                                if (this.custom && this.custom.records) {
                                    showCioModal(this.custom.records, this.custom.title || '', this.custom);
                                }
                            }
                        }
                    }
                }
            },
            series: [{
                name: 'Số lượng',
                data: [
                    { y: checkInBefore.length, color: '#00E5FF', custom: { records: checkInBefore, title: 'Danh sách Check In', type: 'before' } },
                    { y: checkOutTon.length, color: '#FF5722', custom: { records: checkOutTon, title: 'Check Out hàng tồn', type: 'before' } },
                    { y: checkOutTrongNgay.length, color: '#FF9800', custom: { records: checkOutTrongNgay, title: 'Check Out trong ngày', type: 'before' } },
                    { y: tonKhoTrongNgay.length, color: '#4CAF50', custom: { records: tonKhoTrongNgay, title: 'Tồn kho trong ngày', type: 'before' } }
                ]
            }]
        });

    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu Check In/Out:", error);
        renderNoLocationTable([]);
    }
}

function formatDisplayRange(start, end) {
    if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start) || isNaN(end)) {
        return '';
    }

    const pad = (n) => n.toString().padStart(2, '0');
    const format = (date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    return `${format(start)} - ${format(end)}`;
}

async function fetchTonKhoNoLocationRange(start, end) {
    const url = new URL('http://10.220.130.119:9090/api/CheckInOut/GetTonKhoSummary');
    url.searchParams.append('startDate', formatDateTime(start));
    url.searchParams.append('endDate', formatDateTime(end));

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`GetTonKhoSummary error: ${response.status}`);
    }

    const tonKhoJson = await response.json();
    const before = (tonKhoJson?.beforeKanban?.data || []).map(item => ({ ...item, __sourceType: 'before' }));
    const after = (tonKhoJson?.afterKanban?.data || []).map(item => ({ ...item, __sourceType: 'after' }));
    const combined = [...before, ...after];

    const { items: enrichedItems } = await attachLocationInfo(combined, { silent: true });
    const noLocationItems = enrichedItems.filter(item => !item.location);

    return { enrichedItems, noLocationItems };
}

async function loadNoLocationTrendChart() {
    const chartElement = document.getElementById('noLocationTrendChart');
    if (!chartElement) {
        return;
    }

    try {
        const now = new Date();
        const anchorToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 30, 0, 0);
        const dayMs = 24 * 60 * 60 * 1000;

        const startDay1 = new Date(anchorToday.getTime() - dayMs * 3);
        const startDay2 = new Date(anchorToday.getTime() - dayMs * 2);
        const startDay3 = new Date(anchorToday.getTime() - dayMs * 1);

        const windows = [
            { start: startDay1, end: new Date(startDay2) },
            { start: startDay2, end: new Date(startDay3) },
            { start: startDay3, end: new Date(anchorToday) },
            {start: anchorToday, end: now}
        ];

        noLocationTrendDetails = [];

        const categories = [];
        const seriesData = [];

        for (const window of windows) {
            const { noLocationItems } = await fetchTonKhoNoLocationRange(window.start, window.end);
            const label = formatDisplayRange(window.start, window.end);
            categories.push(label);
            noLocationTrendDetails.push({
                label,
                start: new Date(window.start),
                end: new Date(window.end),
                items: noLocationItems
            });
            seriesData.push({
                y: noLocationItems.length,
                color: '#F44336',
                custom: {
                    records: noLocationItems,
                    title: `Tồn kho chưa có vị trí (${label})`,
                    type: 'tonKho'
                }
            });
        }

        Highcharts.chart('noLocationTrendChart', {
            chart: { type: 'column', backgroundColor: '#ffffff' },
            title: { text: null },
            xAxis: {
                categories,
                labels: {
                    style: { color: '#000000', fontSize: '10px' }
                }
            },
            yAxis: {
                min: 0,
                title: { text: 'Số lượng' }
            },
            tooltip: {
                formatter: function () {
                    const category = categories[this.point.index] || '';
                    return `<b>${category}</b><br/>Số lượng: <b>${this.y}</b>`;
                }
            },
            plotOptions: {
                column: {
                    cursor: 'pointer',
                    dataLabels: { enabled: true },
                    point: {
                        events: {
                            click: function () {
                                if (this.custom && this.custom.records) {
                                    showCioModal(this.custom.records, this.custom.title || '', this.custom);
                                }
                            }
                        }
                    }
                }
            },
            series: [{
                name: 'Chưa có vị trí',
                data: seriesData
            }]
        });
    } catch (error) {
        console.error('loadNoLocationTrendChart error:', error);
    }
}

async function loadPreviousDayReport() {
    const rangeElement = document.getElementById('previousDayReportRange');
    const checkInElement = document.getElementById('previousDayCheckInCount');
    const hasLocationElement = document.getElementById('previousDayHasLocationCount');
    const noLocationElement = document.getElementById('previousDayNoLocationCount');
    const viewButton = document.getElementById('previousDayNoLocationBtn');

    if (!rangeElement || !checkInElement || !hasLocationElement || !noLocationElement || !viewButton) {
        return;
    }

    try {
        const now = new Date();
        const anchorToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 30, 0, 0);
        let reportEnd = new Date(anchorToday);
        if (now < anchorToday) {
            reportEnd = new Date(anchorToday);
        }
        const reportStart = new Date(reportEnd.getTime() - 24 * 60 * 60 * 1000);

        rangeElement.textContent = formatDisplayRange(reportStart, reportEnd);

        const beforeUrl = new URL('http://10.220.130.119:9090/api/CheckInOut/GetCheckInOutBeforeKanban');
        beforeUrl.searchParams.append('startDate', formatDateTime(reportStart));
        beforeUrl.searchParams.append('endDate', formatDateTime(reportEnd));

        const afterUrl = new URL('http://10.220.130.119:9090/api/CheckInOut/GetCheckInAfterKanBan');
        afterUrl.searchParams.append('startDate', formatDateTime(reportStart));
        afterUrl.searchParams.append('endDate', formatDateTime(reportEnd));

        const [beforeResponse, afterResponse] = await Promise.all([fetch(beforeUrl), fetch(afterUrl)]);

        const beforeJson = beforeResponse.ok ? await beforeResponse.json() : null;
        const afterJson = afterResponse.ok ? await afterResponse.json() : null;

        const checkInBefore = (beforeJson?.checkIn?.data || []).map(item => ({ ...item, __sourceType: 'before' }));
        const checkInAfter = (afterJson?.data || []).map(item => ({ ...item, __sourceType: 'after' }));

        const combinedRecords = [...checkInBefore, ...checkInAfter];
        const { items: enrichedRecords } = await attachLocationInfo(combinedRecords, { silent: true });

        const uniqueRecords = new Map();
        enrichedRecords.forEach(item => {
            const key = getSerialForLocation(item).trim().toUpperCase();
            if (!key) return;
            if (!uniqueRecords.has(key)) {
                uniqueRecords.set(key, item);
            }
        });

        let hasLocationCount = 0;
        let noLocationCount = 0;
        const noLocationRecords = [];

        uniqueRecords.forEach(item => {
            if ((item.location || '').trim()) {
                hasLocationCount += 1;
            } else {
                noLocationCount += 1;
                noLocationRecords.push(item);
            }
        });

        previousDayNoLocationRecords = noLocationRecords;

        checkInElement.textContent = uniqueRecords.size.toString();
        hasLocationElement.textContent = hasLocationCount.toString();
        noLocationElement.textContent = noLocationCount.toString();
        viewButton.disabled = noLocationCount === 0;
    } catch (error) {
        console.error('loadPreviousDayReport error:', error);
        previousDayNoLocationRecords = [];
        rangeElement.textContent = 'Không có dữ liệu';
        checkInElement.textContent = '0';
        hasLocationElement.textContent = '0';
        noLocationElement.textContent = '0';
        if (viewButton) {
            viewButton.disabled = true;
        }
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
    cioModalElement = document.getElementById('cioModal');
    if (cioModalElement && !cioModalInstance) {
        cioModalInstance = new bootstrap.Modal(cioModalElement, { backdrop: true, keyboard: true });
    }

    // Gọi API và vẽ biểu đồ
    loadStatusChart().catch(error => console.error("Error loading status chart:", error));
    fetchChartData().catch(error => console.error("Error loading model chart:", error));
    loadNoLocationTrendChart().catch(error => console.error('Error loading no-location trend chart:', error));
    loadPreviousDayReport().catch(error => console.error('Error loading previous day report:', error));

    const now = new Date();
    const shift1Start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 30, 0);
    const shift1End = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 30, 0);
    let start, end;
    if (now >= shift1Start && now < shift1End) {
        start = shift1Start;
        end = shift1End;
    } else if (now >= shift1End) {
        start = shift1End;
        end = new Date(shift1Start.getTime() + 24 * 60 * 60 * 1000);
    } else {
        start = new Date(shift1End.getTime() - 24 * 60 * 60 * 1000);
        end = shift1Start;
    }

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
                "SERIAL_NUMBER": getValueIgnoreCase(item, 'SERIAL_NUMBER'),
                "PRODUCT_LINE": getValueIgnoreCase(item, 'PRODUCT_LINE'),
                "MODEL_NAME": getValueIgnoreCase(item, 'MODEL_NAME'),
                "WIP_GROUP": getValueIgnoreCase(item, 'WIP_GROUP'),
                "TEST_GROUP": getValueIgnoreCase(item, 'TEST_GROUP'),
                "ERROR_CODE": getValueIgnoreCase(item, 'TEST_CODE'),
                "ERROR_DESC": getValueIgnoreCase(item, 'DATA1'),
                "STATUS_FA": getValueIgnoreCase(item, 'DATA11'),
                "PERSON_CONFIRM": getValueIgnoreCase(item, 'TESTER'),
                "TIME_CONFIRM": getValueIgnoreCase(item, 'DATE3'),
                "HANDLER": getValueIgnoreCase(item, 'DATA13'),
                "LOCATION": getValueIgnoreCase(item, 'DATA18') || getValueIgnoreCase(item, 'LOCATION'),
                "BORROW_STATUS": getValueIgnoreCase(item, 'BORROW_STATUS')
            }));

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, "SerialNumbers");
            XLSX.writeFile(workbook, `SerialNumbers_${new Date().toISOString().slice(0, 10)}.xlsx`);
            console.log("Excel exported successfully with all data");
        });
    }

    const exportNoLocationExcelBtn = document.getElementById('exportNoLocationExcelBtn');
    if (exportNoLocationExcelBtn) {
        exportNoLocationExcelBtn.addEventListener('click', () => {
            if (cioNoLocationData.length === 0) {
                showError('Không có dữ liệu để xuất!');
                return;
            }

            const worksheetData = cioNoLocationData.map(item => ({
                "TYPE": getValueIgnoreCase(item, 'TYPE'),
                "SERIAL_NUMBER": getValueIgnoreCase(item, 'SFG') || getValueIgnoreCase(item, 'SERIAL_NUMBER'),
                "MODEL_NAME": getValueIgnoreCase(item, 'MODEL_NAME'),
                "PRODUCT_LINE": getValueIgnoreCase(item, 'PRODUCT_LINE'),
                "LOCATION": getValueIgnoreCase(item, 'DATA18') || getValueIgnoreCase(item, 'LOCATION'),
                "WIP_GROUP": getValueIgnoreCase(item, 'WIP_GROUP') || getValueIgnoreCase(item, 'WIP_GROUP'),
                "ERROR_FLAG": getValueIgnoreCase(item, 'ERROR_FLAG') || getValueIgnoreCase(item, 'ERROR_FLAG'),
                "WORK_FLAG": getValueIgnoreCase(item, 'WORK_FLAG') || getValueIgnoreCase(item, 'WORK_FLAG')
            }));

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'TonKhoNoLocation');
            XLSX.writeFile(workbook, `TonKhoNoLocation_${new Date().toISOString().slice(0, 10)}.xlsx`);
        });
    }

    const exportCioExcelBtn = document.getElementById("exportCioExcelBtn");
    if (exportCioExcelBtn) {
        exportCioExcelBtn.addEventListener("click", () => {
            if (cioModalData.length === 0) {
                console.error("Không có dữ liệu để xuất Excel!");
                showError("Không có dữ liệu để xuất!");
                return;
            }

            const worksheetData = cioModalData.map(item => ({
                "SERIAL_NUMBER": getValueIgnoreCase(item, 'SERIAL_NUMBER') || getValueIgnoreCase(item, 'SFG'),
                "MODEL_NAME": getValueIgnoreCase(item, 'MODEL_NAME'),
                "PRODUCT_LINE": getValueIgnoreCase(item, 'PRODUCT_LINE'),
                "LOCATION": getValueIgnoreCase(item, 'LOCATION'),
                "PERSON_IN": getValueIgnoreCase(item, 'P_SENDER'),
                "IN_DATE": getValueIgnoreCase(item, 'IN_DATETIME'),
                "WIP_GROUP": getValueIgnoreCase(item, 'WIP_GROUP'),
                "ERROR_FLAG": getValueIgnoreCase(item, 'ERROR_FLAG'),
                "WORK_FLAG": getValueIgnoreCase(item, 'WORK_FLAG'),
                "OUT_DATE": getValueIgnoreCase(item, 'OUT_DATETIME'),
                "REPAIRER": getValueIgnoreCase(item, 'REPAIRER'),
                "STATION": getValueIgnoreCase(item, 'STATION_NAME'),
                "ERROR_CODE": getValueIgnoreCase(item, 'ERROR_CODE'),
                "ERROR_DESC": getValueIgnoreCase(item, 'ERROR_DESC'),
                "TYPE": getValueIgnoreCase(item, 'CHECKIN_STATUS') || item.__sourceType || ''
            }));

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, "CheckInOut");
            XLSX.writeFile(workbook, `CheckInOut_${new Date().toISOString().slice(0, 10)}.xlsx`);
            console.log("Excel exported successfully with Check In/Out data");
        });
    }

    const previousDayNoLocationBtn = document.getElementById('previousDayNoLocationBtn');
    if (previousDayNoLocationBtn) {
        previousDayNoLocationBtn.addEventListener('click', () => {
            if (!previousDayNoLocationRecords.length) {
                return;
            }
            showCioModal(previousDayNoLocationRecords, 'Danh sách SN chưa có vị trí - Báo cáo ngày hôm trước', { type: 'reportNoLocation' });
        });
    }

    const startInput = document.getElementById("cioStartDate");
    const endInput = document.getElementById("cioEndDate");

    // Bấm icon lịch thì hiện SweetAlert2 để chọn khoảng thời gian
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
                loadCheckInOutChart();
            }
        });
    }

    if (startInput && endInput) {
        const now = new Date();
        const yesterday730 = new Date(now);
        yesterday730.setDate(now.getDate());
        yesterday730.setHours(7, 30, 0, 0);

        startInput.value = formatDateTime(yesterday730);
        endInput.value = formatDateTime(now);

        // Gọi lần đầu
        loadCheckInOutChart();
    }
});