(() => {
    const state = {
        statusModalInstance: null,
        statusModalElement: null,
        cioModalInstance: null,
        cioModalElement: null,
        allModalData: [],
        cioModalData: [],
        cioNoLocationData: [],
        cioNoLocationTableInstance: null,
        noLocationTrendDetails: [],
        previousDayNoLocationRecords: [],
        sapInOutRecords: [],
        sapChartInstance: null,
        cioModalExportType: 'default',
        inventoryStatusChartInstance: null,
        inventoryStatusDetailsMap: {}
    };

    const config = {
        RECEIVING_STATUS_URL: 'http://10.220.130.119:9090/api/SearchFA/get-unique-status',
        INVENTORY_STATUS_KEYS: ['FA', 'CHECK_LIST', 'VI-RE', 'THAY LIỆU', 'RETEST', 'PROCESS', 'KHÓ SỬA', 'CHỜ TRẢ'],
        INVENTORY_STATUS_COLORS: {
            'FA': '#1976D2',
            'CHECK_LIST': '#7B1FA2',
            'VI-RE': '#F57C00',
            'THAY LIỆU': '#388E3C',
            'RETEST': '#E88E3C',
            'PROCESS': '#3F8E3C',
            'KHÓ SỬA': '#5F8E3C',
            'CHỜ TRẢ': '#2F8E3C',
            'KHÁC': '#546E7A'
        }
    };

    const utils = {
        hasDataTable() {
            return Boolean(window.$ && $.fn && $.fn.DataTable);
        },
        destroyDataTable(selector) {
            if (!this.hasDataTable()) return;
            if ($.fn.DataTable.isDataTable(selector)) {
                const instance = $(selector).DataTable();
                instance.clear();
                instance.destroy();
            }
        },
        initializeDataTable(selector, config = {}) {
            if (!this.hasDataTable()) return null;
            const defaultConfig = {
                paging: true,
                searching: true,
                ordering: false,
                scrollX: true,
                autoWidth: false
            };
            return $(selector).DataTable({ ...defaultConfig, ...config });
        },
        truncateText(text, maxLength) {
            return (text && typeof text === 'string' && text.length > maxLength)
                ? `${text.substring(0, maxLength)}...`
                : text || '';
        },
        getValueIgnoreCase(item, key, defaultValue = '') {
            if (!item || !key) return defaultValue;
            if (Object.prototype.hasOwnProperty.call(item, key)) {
                const direct = item[key];
                if (direct !== undefined && direct !== null && direct !== '') {
                    return direct;
                }
            }
            const lowerKey = key.toString().toLowerCase();
            for (const prop in item) {
                if (!Object.prototype.hasOwnProperty.call(item, prop)) continue;
                if (prop.toString().toLowerCase() === lowerKey) {
                    const value = item[prop];
                    if (value !== undefined && value !== null && value !== '') {
                        return value;
                    }
                }
            }
            return defaultValue;
        },
        getTextValue(item, keys, fallback = '') {
            if (!item) return fallback;
            const keyList = Array.isArray(keys) ? keys : [keys];
            for (const key of keyList) {
                const value = this.getValueIgnoreCase(item, key);
                if (value !== undefined && value !== null && value !== '') {
                    return value.toString();
                }
            }
            return fallback;
        },
        createCell(row, value, maxLength = 30, titleValue) {
            const cell = document.createElement('td');
            const text = (value ?? '').toString();
            cell.textContent = this.truncateText(text, maxLength);
            cell.title = titleValue ?? text;
            row.appendChild(cell);
            return cell;
        },
        safeParseDate(value) {
            if (!value) return null;
            if (value instanceof Date) {
                return isNaN(value) ? null : value;
            }
            const parsed = new Date(value);
            return isNaN(parsed) ? null : parsed;
        },
        calculateStatusAging(value) {
            const date = this.safeParseDate(value);
            if (!date) {
                return { hours: '', display: '' };
            }
            const now = new Date();
            let diffMs = now.getTime() - date.getTime();
            if (diffMs < 0) {
                diffMs = 0;
            }
            const hours = diffMs / 36e5;
            const totalMinutes = Math.floor(diffMs / 60000);
            const days = Math.floor(totalMinutes / (60 * 24));
            const hoursPart = Math.floor((totalMinutes - days * 24 * 60) / 60);
            const minutes = totalMinutes % 60;
            const parts = [];
            if (days) parts.push(`${days}d`);
            if (hoursPart) parts.push(`${hoursPart}h`);
            if (minutes || parts.length === 0) parts.push(`${minutes}m`);
            return {
                hours: hours.toFixed(2),
                display: parts.join(' ')
            };
        },
        formatDateTime(dt) {
            const pad = (n) => n.toString().padStart(2, '0');
            return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
        },
        formatDateTimeDisplay(value) {
            const date = this.safeParseDate(value);
            if (!date) {
                return value || '';
            }
            const pad = (n) => n.toString().padStart(2, '0');
            return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
        },
        formatDisplayRange(start, end) {
            if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start) || isNaN(end)) {
                return '';
            }
            const pad = (n) => n.toString().padStart(2, '0');
            const format = (date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
            return `${format(start)} - ${format(end)}`;
        },
        resolveInventoryStatusValue(item) {
            const status = this.getValueIgnoreCase(item, 'STATUS_FA')
                || this.getValueIgnoreCase(item, 'STATUS_DATA11')
                || this.getValueIgnoreCase(item, 'DATA11')
                || '';
            return status ? status.toString().trim() : '';
        },
        getSerialForLocation(item) {
            if (!item) return '';
            const source = (item.__sourceType || '').toString().toLowerCase();
            if (source === 'after') {
                return (this.getValueIgnoreCase(item, 'SFG') || this.getValueIgnoreCase(item, 'FG') || '').toString();
            }
            return (this.getValueIgnoreCase(item, 'SFG') || this.getValueIgnoreCase(item, 'FG') || this.getValueIgnoreCase(item, 'SERIAL_NUMBER') || '').toString();
        }
    };
    const columns = {
        modalSN: [
            { getter: item => utils.getTextValue(item, ['SERIAL_NUMBER', 'FG']), maxLength: 20 },
            { getter: item => utils.getTextValue(item, 'PRODUCT_LINE'), maxLength: 20 },
            { getter: item => utils.getTextValue(item, 'MODEL_NAME'), maxLength: 20 },
            { getter: item => utils.getTextValue(item, 'WIP_GROUP'), maxLength: 20 },
            { getter: item => utils.getTextValue(item, 'TEST_GROUP'), maxLength: 20 },
            { getter: item => utils.getTextValue(item, ['TEST_CODE', 'ERROR_CODE']), maxLength: 20 },
            { getter: item => utils.getTextValue(item, ['DATA1', 'ERROR_DESC']), maxLength: 30 },
            { getter: item => utils.getTextValue(item, ['STATUS_FA', 'INVENTORY_STATUS']), maxLength: 20 },
            {
                getter: item => utils.getTextValue(item, 'STATUS_AGING_DISPLAY'),
                maxLength: 20,
                getTitle: item => {
                    const display = utils.getTextValue(item, 'STATUS_AGING_DISPLAY');
                    const hours = utils.getTextValue(item, 'STATUS_AGING_HOURS');
                    return display && hours ? `${display} (${hours}h)` : display;
                }
            },
            { getter: item => utils.getTextValue(item, 'TESTER'), maxLength: 20 },
            { getter: item => utils.formatDateTimeDisplay(utils.getValueIgnoreCase(item, 'DATE3')), maxLength: 20 },
            { getter: item => utils.getTextValue(item, 'DATA13'), maxLength: 20 },
            { getter: item => utils.getTextValue(item, ['DATA18', 'LOCATION']), maxLength: 20 },
            { getter: item => utils.getTextValue(item, 'BORROW_STATUS'), maxLength: 20 }
        ],
        cioModal: {
            default: [
                { header: 'SFG', getter: item => utils.getTextValue(item, ['SFG', 'SERIAL_NUMBER']) },
                { header: 'FG', getter: item => utils.getTextValue(item, 'FG') },
                { header: 'MO_NUMBER', getter: item => utils.getTextValue(item, 'MO_NUMBER') },
                { header: 'MODEL_NAME', getter: item => utils.getTextValue(item, 'MODEL_NAME') },
                { header: 'PRODUCT_LINE', getter: item => utils.getTextValue(item, 'PRODUCT_LINE') },
                { header: 'WORK_FLAG', getter: item => utils.getTextValue(item, 'WORK_FLAG') },
                { header: 'ERROR_FLAG', getter: item => utils.getTextValue(item, 'ERROR_FLAG') },
                { header: 'LOCATION', getter: item => item.location || utils.getTextValue(item, ['DATA18', 'LOCATION']) },
                { header: 'AGING_HOURS', getter: item => utils.getTextValue(item, 'AGING_HOURS') },
                { header: 'P_SENDER', getter: item => utils.getTextValue(item, 'P_SENDER') },
                { header: 'IN_DATETIME', getter: item => utils.formatDateTimeDisplay(utils.getValueIgnoreCase(item, 'IN_DATETIME')) },
                { header: 'OUT_DATETIME', getter: item => utils.formatDateTimeDisplay(utils.getValueIgnoreCase(item, 'OUT_DATETIME')) },
                { header: 'REPAIRER', getter: item => utils.getTextValue(item, 'REPAIRER') },
                { header: 'STATION_NAME', getter: item => utils.getTextValue(item, 'STATION_NAME') },
                { header: 'ERROR_CODE', getter: item => utils.getTextValue(item, 'ERROR_CODE') },
                { header: 'ERROR_DESC', getter: item => utils.getTextValue(item, 'ERROR_DESC') },
                { header: 'TYPE', getter: item => utils.getTextValue(item, ['CHECKIN_STATUS', 'TYPE']) }
            ],
            sap: [
                { header: 'SERIAL_NUMBER', getter: item => utils.getTextValue(item, 'SERIAL_NUMBER') },
                { header: 'GROUP_NAME', getter: item => utils.getTextValue(item, 'GROUP_NAME') },
                { header: 'MODEL_NAME', getter: item => utils.getTextValue(item, 'MODEL_NAME') },
                { header: 'PRODUCT_LINE', getter: item => utils.getTextValue(item, 'PRODUCT_LINE') },
                { header: 'MO_NUMBER', getter: item => utils.getTextValue(item, 'MO_NUMBER') },
                { header: 'IN_STATION_TIME', getter: item => utils.formatDateTimeDisplay(utils.getValueIgnoreCase(item, 'IN_STATION_TIME')) },
                { header: 'KEY_PART_NO', getter: item => utils.getTextValue(item, 'KEY_PART_NO') },
                { header: 'SHIPPING_SN2', getter: item => utils.getTextValue(item, 'SHIPPING_SN2') },
                { header: 'MSN', getter: item => utils.getTextValue(item, 'MSN') },
                { header: 'ATE_STATION_NO', getter: item => utils.getTextValue(item, 'ATE_STATION_NO') },
                { header: 'EMP_NO', getter: item => utils.getTextValue(item, 'EMP_NO') },
                { header: 'WIP_GROUP', getter: item => utils.getTextValue(item, 'WIP_GROUP') },
                { header: 'LOCATION', getter: item => item.location || utils.getTextValue(item, 'LOCATION') }
            ]
        }
    };
    const services = {
        async fetchLocationMapBySerials(serials = [], options = {}) {
            const uniqueSerials = [...new Set((serials || []).filter(sn => sn))];
            if (!uniqueSerials.length) {
                return {};
            }
            try {
                const response = await fetch('http://10.220.130.119:9090/api/Search/FindLocations', {
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
        },
        async attachLocationInfo(items = [], options = {}) {
            const normalized = Array.isArray(items) ? items.map(item => ({ ...item })) : [];
            const lookupSerials = [];
            normalized.forEach(item => {
                const key = utils.getSerialForLocation(item).trim().toUpperCase();
                item.__lookupKey = key;
                if (key) {
                    lookupSerials.push(key);
                }
            });
            const locationMap = await this.fetchLocationMapBySerials(lookupSerials, options);
            normalized.forEach(item => {
                const existingLocation = (utils.getValueIgnoreCase(item, 'LOCATION') || utils.getValueIgnoreCase(item, 'DATA18') || '').toString().trim();
                if (existingLocation) {
                    item.location = existingLocation;
                } else if (item.__lookupKey) {
                    const locInfo = locationMap[item.__lookupKey];
                    if (locInfo && (locInfo.location || locInfo.warehouse)) {
                        item.location = [locInfo.warehouse, locInfo.location].filter(Boolean).join(' - ');
                        if (!item.borrowStatus) {
                            item.borrowStatus = locInfo.borrowStatus || utils.getValueIgnoreCase(item, 'BORROW_STATUS');
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
        },
        async fetchSapInOutData(startDate, endDate) {
            const result = { records: [], total: 0 };
            try {
                const url = new URL('http://10.220.130.119:9090/api/CheckInOut/GetSAPInOut');
                if (startDate) url.searchParams.append('startDate', startDate);
                if (endDate) url.searchParams.append('endDate', endDate);
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`GetSAPInOut error: ${response.status}`);
                }
                const data = await response.json();
                const groups = data?.groups || data?.Groups || [];
                const records = [];
                groups.forEach(group => {
                    const groupName = group?.GroupName || group?.groupName || '';
                    const details = group?.Details || group?.details || [];
                    (details || []).forEach(detail => {
                        records.push({
                            ...detail,
                            GROUP_NAME: utils.getValueIgnoreCase(detail, 'GROUP_NAME') || groupName
                        });
                    });
                });
                result.records = records;
                result.total = typeof data?.total === 'number' ? data.total : records.length;
            } catch (error) {
                console.error('fetchSapInOutData error:', error);
            }
            return result;
        },
        async fetchRepairTasksBySerials(serials = [], options = {}) {
            const uniqueSerials = [...new Set((serials || []).map(sn => (sn || '').toString().trim()).filter(Boolean))];
            if (!uniqueSerials.length) {
                return [];
            }
            const chunkSize = Number.isInteger(options.chunkSize) && options.chunkSize > 0 ? options.chunkSize : 80;
            const aggregated = [];
            for (let index = 0; index < uniqueSerials.length; index += chunkSize) {
                const chunk = uniqueSerials.slice(index, index + chunkSize);
                try {
                    const response = await fetch('http://10.220.130.119:9090/api/SearchFA/search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ serialNumbers: chunk })
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    const payload = await response.json();
                    if (Array.isArray(payload?.data)) {
                        aggregated.push(...payload.data);
                    }
                } catch (error) {
                    if (!options.silent) {
                        console.error('fetchRepairTasksBySerials error:', error);
                    }
                    throw error;
                }
            }
            return aggregated;
        },
        async fetchTonKhoNoLocationRange(start, end) {
            const url = new URL('http://10.220.130.119:9090/api/CheckInOut/GetTonKhoSummary');
            url.searchParams.append('startDate', utils.formatDateTime(start));
            url.searchParams.append('endDate', utils.formatDateTime(end));
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`GetTonKhoSummary error: ${response.status}`);
            }
            const tonKhoJson = await response.json();
            const before = (tonKhoJson?.beforeKanban?.data || []).map(item => ({ ...item, __sourceType: 'before' }));
            const after = (tonKhoJson?.afterKanban?.data || []).map(item => ({ ...item, __sourceType: 'after' }));
            const combined = [...before, ...after];
            const { items: enrichedItems } = await this.attachLocationInfo(combined, { silent: true });
            const noLocationItems = enrichedItems.filter(item => !item.location);
            return { enrichedItems, noLocationItems };
        }
    };
    const tables = {
        async updateModalSNTable(data) {
            try {
                const tableElement = document.getElementById('modal-sn-table');
                const tableBody = tableElement?.querySelector('tbody');
                const tableHead = tableElement?.querySelector('thead');
                if (!tableBody) {
                    console.error('Không tìm thấy tbody của bảng modal!');
                    return false;
                }
                utils.destroyDataTable('#modal-sn-table');
                tableBody.innerHTML = '';
                const columnCount = tableHead?.querySelectorAll('th').length || columns.modalSN.length || 1;
                if (!Array.isArray(data) || data.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan='${columnCount}'>Không có dữ liệu</td></tr>`;
                    state.allModalData = [];
                    console.warn('Dữ liệu rỗng hoặc không phải mảng:', data);
                    return false;
                }
                const normalizedData = data.map(item => {
                    const resolvedStatus = utils.resolveInventoryStatusValue(item);
                    const agingInfo = utils.calculateStatusAging(utils.getValueIgnoreCase(item, 'DATE3'));
                    const statusFA = utils.getValueIgnoreCase(item, 'STATUS_FA');
                    return {
                        ...item,
                        STATUS_FA: statusFA || resolvedStatus,
                        STATUS_DATA11: resolvedStatus,
                        INVENTORY_STATUS: resolvedStatus,
                        STATUS_AGING_HOURS: agingInfo.hours,
                        STATUS_AGING_DISPLAY: agingInfo.display
                    };
                });
                state.allModalData = [...normalizedData];
                const fragment = document.createDocumentFragment();
                normalizedData.forEach(item => {
                    const row = document.createElement('tr');
                    columns.modalSN.forEach(column => {
                        const value = column.getter(item) || '';
                        const title = column.getTitle ? column.getTitle(item) : undefined;
                        utils.createCell(row, value, column.maxLength, title);
                    });
                    fragment.appendChild(row);
                });
                tableBody.appendChild(fragment);
                const dataTable = utils.initializeDataTable('#modal-sn-table', {
                    dom: 'Bfrtip',
                    buttons: [
                        {
                            extend: 'excelHtml5',
                            text: '📥 Xuất Excel',
                            title: 'SerialNumbers',
                            exportOptions: { columns: ':visible' }
                        }
                    ]
                });
                if (dataTable) {
                    dataTable
                        .on('draw.dt', () => console.log('DataTable drawn successfully'))
                        .on('error.dt', (e, settings, techNote, message) => console.error('DataTable error:', message));
                }
                return true;
            } catch (error) {
                console.error('Lỗi khi cập nhật DataTable:', error);
                return false;
            }
        },
        renderNoLocationTable(items = []) {
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
                utils.destroyDataTable('#cio-no-location-table');
                state.cioNoLocationTableInstance = null;
                if (!Array.isArray(items) || items.length === 0) {
                    section.style.display = 'none';
                    tbody.innerHTML = '';
                    state.cioNoLocationData = [];
                    if (exportBtn) {
                        exportBtn.disabled = true;
                    }
                    return;
                }
                section.style.display = '';
                tbody.innerHTML = '';
                state.cioNoLocationData = items;
                if (exportBtn) {
                    exportBtn.disabled = false;
                }
                const columnConfig = [
                    { getter: item => utils.getTextValue(item, 'TYPE') },
                    { getter: item => utils.getTextValue(item, ['SFG', 'SERIAL_NUMBER']) },
                    { getter: item => utils.getTextValue(item, 'MODEL_NAME') },
                    { getter: item => utils.getTextValue(item, 'PRODUCT_LINE') },
                    {
                        getter: item => item.location || utils.getTextValue(item, ['DATA18', 'LOCATION']),
                        onCreate: (cell) => { cell.dataset.role = 'location'; }
                    },
                    { getter: item => utils.getTextValue(item, 'AGING_HOURS') },
                    { getter: item => utils.getTextValue(item, 'WIP_GROUP') },
                    { getter: item => utils.getTextValue(item, 'ERROR_FLAG') },
                    { getter: item => utils.getTextValue(item, 'WORK_FLAG') }
                ];
                const fragment = document.createDocumentFragment();
                items.forEach((item) => {
                    const row = document.createElement('tr');
                    columnConfig.forEach(column => {
                        const cell = utils.createCell(row, column.getter(item), 30);
                        if (typeof column.onCreate === 'function') {
                            column.onCreate(cell, item);
                        }
                    });
                    fragment.appendChild(row);
                });
                tbody.appendChild(fragment);
                state.cioNoLocationTableInstance = utils.initializeDataTable('#cio-no-location-table', { ordering: true });
            } catch (error) {
                console.error('renderNoLocationTable error:', error);
            }
        },
        async updateNoLocationInventory(items = []) {
            try {
                if (!Array.isArray(items) || items.length === 0) {
                    state.cioNoLocationData = [];
                    this.renderNoLocationTable([]);
                    return;
                }
                const { items: enrichedItems } = await services.attachLocationInfo(items);
                const noLocationItems = enrichedItems.filter(item => !item.location);
                state.cioNoLocationData = noLocationItems;
                this.renderNoLocationTable(noLocationItems);
            } catch (error) {
                console.error('updateNoLocationInventory error:', error);
                state.cioNoLocationData = [];
                this.renderNoLocationTable([]);
            }
        }
    };
    const charts = {
        aggregateSapRecordsByDate(records = []) {
            const pad = (n) => n.toString().padStart(2, '0');
            const map = new Map();
            (records || []).forEach(item => {
                const groupName = (utils.getValueIgnoreCase(item, 'GROUP_NAME') || '').toString().toUpperCase();
                if (!['B28M', 'B30M', 'B36R'].includes(groupName)) {
                    return;
                }
                const date = utils.safeParseDate(utils.getValueIgnoreCase(item, 'IN_STATION_TIME'));
                if (!date) {
                    return;
                }
                const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
                if (!map.has(key)) {
                    map.set(key, { date, B28M: 0, B30M: 0, B36R: 0 });
                }
                const entry = map.get(key);
                entry[groupName] = (entry[groupName] || 0) + 1;
            });
            return Array.from(map.values()).sort((a, b) => a.date - b.date);
        },
        renderSapInOutChart(records = [], options = {}) {
            const chartElement = document.getElementById('sapInOutChart');
            if (!chartElement) {
                return;
            }
            if (state.sapChartInstance) {
                state.sapChartInstance.destroy();
                state.sapChartInstance = null;
            }
            const aggregated = this.aggregateSapRecordsByDate(records);
            if (!aggregated.length) {
                chartElement.innerHTML = "<div class='text-center text-muted py-5'>Không có dữ liệu SAP In/Out</div>";
                return;
            }
            const categories = aggregated.map(entry => utils.formatDateTimeDisplay(entry.date));
            const series = [
                { name: 'B28M', data: aggregated.map(entry => entry.B28M || 0) },
                { name: 'B30M', data: aggregated.map(entry => entry.B30M || 0) },
                { name: 'B36R', data: aggregated.map(entry => entry.B36R || 0) }
            ];
            chartElement.innerHTML = '';
            state.sapChartInstance = Highcharts.chart('sapInOutChart', {
                chart: { type: 'column', backgroundColor: '#ffffff' },
                title: { text: options.title || 'SAP In/Out' },
                xAxis: { categories },
                yAxis: { min: 0, title: { text: 'Số lượng' } },
                tooltip: { shared: true },
                series
            });
        },
        resetInventoryStatusSummary(total = 0, message = '') {
            const summaryElement = document.getElementById('inventoryStatusSummary');
            if (summaryElement) {
                summaryElement.textContent = total ? `Tổng: ${total}` : message || 'Tổng: 0';
            }
        },
        async renderInventoryStatusChart(records = []) {
            const chartElement = document.getElementById('inventoryStatusChart');
            if (!chartElement) {
                return;
            }
            if (state.inventoryStatusChartInstance) {
                state.inventoryStatusChartInstance.destroy();
                state.inventoryStatusChartInstance = null;
            }
            state.inventoryStatusDetailsMap = {};
            if (!Array.isArray(records) || records.length === 0) {
                chartElement.innerHTML = "<div class='text-center text-muted py-5'>Không có dữ liệu tồn kho</div>";
                this.resetInventoryStatusSummary(0);
                return;
            }
            const tonKhoSerialMap = new Map();
            (records || []).forEach(item => {
                const rawSerial = (utils.getValueIgnoreCase(item, 'FG')
                    || utils.getValueIgnoreCase(item, 'SFG')
                    || utils.getValueIgnoreCase(item, 'SERIAL_NUMBER')
                    || '')
                    .toString()
                    .trim();
                if (!rawSerial) {
                    return;
                }
                const key = rawSerial.toUpperCase();
                if (!tonKhoSerialMap.has(key)) {
                    tonKhoSerialMap.set(key, {
                        serial: rawSerial,
                        record: { ...item }
                    });
                }
            });
            const fgSerials = [...tonKhoSerialMap.values()].map(entry => entry.serial).filter(Boolean);
            if (!fgSerials.length) {
                chartElement.innerHTML = "<div class='text-center text-muted py-5'>Không tìm thấy Serial Number hợp lệ</div>";
                this.resetInventoryStatusSummary(0);
                return;
            }
            let repairTasks = [];
            try {
                repairTasks = await services.fetchRepairTasksBySerials(fgSerials);
            } catch (error) {
                chartElement.innerHTML = "<div class='text-center text-danger py-5'>Không thể tải dữ liệu trạng thái tồn kho</div>";
                this.resetInventoryStatusSummary(0, '');
                return;
            }
            const statusMap = {};
            config.INVENTORY_STATUS_KEYS.forEach(status => { statusMap[status] = []; });
            statusMap['KHÁC'] = [];
            const inventorySerialKeys = new Set(tonKhoSerialMap.keys());
            const latestRepairTaskBySerial = new Map();
            (repairTasks || []).forEach(item => {
                const rawSerial = (utils.getValueIgnoreCase(item, 'SERIAL_NUMBER')
                    || utils.getValueIgnoreCase(item, 'FG')
                    || utils.getValueIgnoreCase(item, 'SFG')
                    || '')
                    .toString()
                    .trim();
                if (!rawSerial) {
                    return;
                }
                const key = rawSerial.toUpperCase();
                if (!inventorySerialKeys.has(key)) {
                    return;
                }
                const candidateDate = utils.safeParseDate(utils.getValueIgnoreCase(item, 'DATE3'));
                if (!latestRepairTaskBySerial.has(key)) {
                    latestRepairTaskBySerial.set(key, { item, candidateDate });
                    return;
                }
                const current = latestRepairTaskBySerial.get(key);
                if (!current.candidateDate && candidateDate) {
                    latestRepairTaskBySerial.set(key, { item, candidateDate });
                    return;
                }
                if (candidateDate && current.candidateDate && candidateDate >= current.candidateDate) {
                    latestRepairTaskBySerial.set(key, { item, candidateDate });
                }
            });
            tonKhoSerialMap.forEach((entry, key) => {
                const baseRecord = entry?.record || {};
                const repairEntry = latestRepairTaskBySerial.get(key);
                const repairItem = repairEntry?.item;
                const combined = { ...baseRecord, ...(repairItem || {}) };
                if (!combined.FG && !combined.fg) {
                    combined.FG = entry.serial;
                }
                if (!combined.SERIAL_NUMBER && !combined.serial_number) {
                    combined.SERIAL_NUMBER = entry.serial;
                }
                const resolvedStatus = utils.resolveInventoryStatusValue(repairItem || baseRecord);
                const normalized = resolvedStatus.toUpperCase();
                const bucket = config.INVENTORY_STATUS_KEYS.includes(normalized) ? normalized : 'KHÁC';
                const displayStatus = resolvedStatus || bucket;
                const agingInfo = utils.calculateStatusAging(utils.getValueIgnoreCase(repairItem || baseRecord, 'DATE3'));
                statusMap[bucket].push({
                    ...combined,
                    STATUS_FA: utils.getValueIgnoreCase(repairItem, 'STATUS_FA')
                        || utils.getValueIgnoreCase(baseRecord, 'STATUS_FA')
                        || displayStatus,
                    STATUS_DATA11: resolvedStatus || (bucket === 'KHÁC' ? '' : bucket),
                    INVENTORY_STATUS: displayStatus,
                    STATUS_AGING_HOURS: agingInfo.hours,
                    STATUS_AGING_DISPLAY: agingInfo.display
                });
            });
            state.inventoryStatusDetailsMap = statusMap;
            const categories = [...config.INVENTORY_STATUS_KEYS];
            if ((statusMap['KHÁC'] || []).length > 0) {
                categories.push('KHÁC');
            }
            const totalCount = categories.reduce((sum, status) => sum + (statusMap[status]?.length || 0), 0);
            if (!totalCount) {
                chartElement.innerHTML = "<div class='text-center text-muted py-5'>Không tìm thấy dữ liệu trạng thái</div>";
                this.resetInventoryStatusSummary(0);
                return;
            }
            const seriesData = categories.map(status => ({
                y: statusMap[status]?.length || 0,
                color: config.INVENTORY_STATUS_COLORS[status] || config.INVENTORY_STATUS_COLORS['KHÁC'],
                custom: {
                    status,
                    statusLabel: status,
                    records: statusMap[status] || []
                }
            }));
            chartElement.innerHTML = '';
            state.inventoryStatusChartInstance = Highcharts.chart('inventoryStatusChart', {
                chart: { type: 'column', backgroundColor: '#ffffff' },
                title: { text: null },
                xAxis: { categories },
                yAxis: { min: 0, title: { text: 'Số lượng' } },
                tooltip: {
                    formatter: function () {
                        const percent = ((this.y / totalCount) * 100).toFixed(2);
                        return `<b>${this.x}</b><br/>Số lượng: ${this.y}<br/>Tỷ lệ: ${percent}%`;
                    }
                },
                plotOptions: {
                    column: {
                        cursor: 'pointer',
                        dataLabels: { enabled: true },
                        point: {
                            events: {
                                click: function () { handlers.handleInventoryStatusPointClick(this); }
                            }
                        }
                    }
                },
                legend: { enabled: false },
                series: [{
                    name: 'Số lượng',
                    data: seriesData
                }]
            });
            this.resetInventoryStatusSummary(totalCount);
        }
    };
    const modals = {
        ensureInstances() {
            if (!state.statusModalInstance) {
                state.statusModalElement = document.getElementById('statusModal');
                if (state.statusModalElement) {
                    state.statusModalInstance = new bootstrap.Modal(state.statusModalElement);
                }
            }
            if (!state.cioModalInstance) {
                state.cioModalElement = document.getElementById('cioModal');
                if (state.cioModalElement) {
                    state.cioModalInstance = new bootstrap.Modal(state.cioModalElement);
                }
            }
        },
        async showCioModal(data, title, options = {}) {
            try {
                const tableElement = document.getElementById('cio-modal-table');
                if (!tableElement) return console.error('Không tìm thấy bảng CheckInOut!');
                const tableHead = tableElement.querySelector('thead');
                const tableBody = tableElement.querySelector('tbody');
                if (!tableHead || !tableBody) return console.error('Không tìm thấy cấu trúc bảng CheckInOut!');
                utils.destroyDataTable('#cio-modal-table');
                tableHead.innerHTML = '';
                tableBody.innerHTML = '';
                const type = options.type === 'sap' ? 'sap' : 'default';
                const columnConfig = columns.cioModal[type];
                const headerRow = document.createElement('tr');
                columnConfig.forEach(column => {
                    const th = document.createElement('th');
                    th.textContent = column.header;
                    headerRow.appendChild(th);
                });
                tableHead.appendChild(headerRow);
                const dataSource = Array.isArray(data) ? data : [];
                if (!dataSource.length) {
                    const emptyRow = document.createElement('tr');
                    const emptyCell = document.createElement('td');
                    emptyCell.colSpan = columnConfig.length;
                    emptyCell.className = 'text-center';
                    emptyCell.textContent = 'Không có dữ liệu';
                    emptyRow.appendChild(emptyCell);
                    tableBody.appendChild(emptyRow);
                } else {
                    const fragment = document.createDocumentFragment();
                    dataSource.forEach(item => {
                        const row = document.createElement('tr');
                        columnConfig.forEach(column => {
                            utils.createCell(row, column.getter(item) || '', 30);
                        });
                        fragment.appendChild(row);
                    });
                    tableBody.appendChild(fragment);
                }
                const headerTitle = document.getElementById('cioModalLabel');
                if (headerTitle) {
                    headerTitle.textContent = title || 'Chi tiết Check In/Out';
                }
                state.cioModalData = [...dataSource];
                state.cioModalExportType = type;
                state.cioModalInstance?.show();
                utils.initializeDataTable('#cio-modal-table', { ordering: true, pageLength: 25 });
            } catch (error) {
                console.error('showCioModal error:', error);
                showError('Không thể hiển thị dữ liệu chi tiết!');
            }
        }
    };
    const handlers = {
        async handleInventoryStatusPointClick(point) {
            try {
                const custom = point?.options?.custom || {};
                const statusLabel = custom.statusLabel || custom.status || point?.category || '';
                const records = Array.isArray(custom.records) ? custom.records : [];
                if (!records.length) {
                    showError('Không có dữ liệu chi tiết cho trạng thái này!');
                    return;
                }
                const success = await tables.updateModalSNTable(records);
                if (success && state.statusModalInstance) {
                    const titleEl = document.getElementById('statusModalLabel');
                    if (titleEl) {
                        titleEl.textContent = `Danh sách tồn kho - ${statusLabel}`;
                    }
                    state.statusModalInstance.show();
                } else if (!success) {
                    showError('Không thể cập nhật DataTable!');
                }
            } catch (error) {
                console.error('handleInventoryStatusPointClick error:', error);
                showError('Không thể hiển thị dữ liệu chi tiết!');
            }
        },
        async loadStatusChart() {
            try {
                const response = await fetch("http://10.220.130.119:9090/api/SearchFA/get-status-counts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify("ALL")
                });
                const result = await response.json();
                if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
                    const categories = result.data.map(item => item.status);
                    const seriesData = result.data.map(item => item.count);
                    const lineData = seriesData.map(value => Number(((value / result.totalCount) * 100).toFixed(2)));
                    if (!document.getElementById('statusChart')) {
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
                                                const searchResponse = await fetch('http://10.220.130.119:9090/api/SearchFA/search', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(payload)
                                                });
                                                if (!searchResponse.ok) throw new Error(`API Error: ${searchResponse.status} ${searchResponse.statusText}`);
                                                const searchResult = await searchResponse.json();
                                                if (searchResult.success && searchResult.data && Array.isArray(searchResult.data) && searchResult.data.length > 0) {
                                                    const success = await tables.updateModalSNTable(searchResult.data);
                                                    if (success && state.statusModalInstance) state.statusModalInstance.show();
                                                    else showError('Không thể cập nhật DataTable!');
                                                } else {
                                                    showError(`No data for status: ${selectedStatus}`);
                                                }
                                            } catch (error) {
                                                console.error('Lỗi khi gọi API search:', error);
                                                showError('Lỗi khi gọi API search: ' + (error.message || 'Không xác định'));
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
                                                const searchResponse = await fetch('http://10.220.130.119:9090/api/SearchFA/search', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(payload)
                                                });
                                                if (!searchResponse.ok) throw new Error(`API Error: ${searchResponse.status} ${searchResponse.statusText}`);
                                                const searchResult = await searchResponse.json();
                                                if (searchResult.success && searchResult.data && Array.isArray(searchResult.data) && searchResult.data.length > 0) {
                                                    const success = await tables.updateModalSNTable(searchResult.data);
                                                    if (success && state.statusModalInstance) state.statusModalInstance.show();
                                                    else showError('Không thể cập nhật DataTable!');
                                                } else {
                                                    showError(`No data for status: ${selectedStatus}`);
                                                }
                                            } catch (error) {
                                                console.error('Lỗi khi gọi API search:', error);
                                                showError('Lỗi khi gọi API search: ' + (error.message || 'Không xác định'));
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        series: [{
                            name: 'Số lượng',
                            type: 'column',
                            data: seriesData,
                            color: '#FF9800'
                        }, {
                            name: 'Tỷ lệ',
                            type: 'spline',
                            data: lineData,
                            yAxis: 1
                        }]
                    });
                } else {
                    console.error('Dữ liệu API không hợp lệ hoặc rỗng!');
                }
            } catch (error) {
                console.error('Lỗi khi gọi API hoặc vẽ biểu đồ:', error);
            }
        },
        async loadCheckInOutChart() {
            const startInput = document.getElementById('cioStartDate');
            const endInput = document.getElementById('cioEndDate');
            if (!startInput || !endInput) {
                console.error('Không tìm thấy input ngày');
                return;
            }
            try {
                const startDate = startInput.value;
                const endDate = endInput.value;
                const urlBefore = new URL('http://10.220.130.119:9090/api/CheckInOut/GetCheckInOutBeforeKanban');
                urlBefore.searchParams.append('startDate', startDate);
                urlBefore.searchParams.append('endDate', endDate);
                const resBefore = await fetch(urlBefore);
                if (!resBefore.ok) throw new Error('API Before error');
                const dataBefore = await resBefore.json();
                const checkInBefore = (dataBefore?.checkIn?.data || []).map(item => ({ ...item, __sourceType: 'before' }));
                const checkOutTon = (dataBefore?.checkOut?.tonKhoCu?.data || []).map(item => ({ ...item, __sourceType: 'before' }));
                const checkOutTrongNgay = (dataBefore?.checkOut?.trongNgay?.data || []).map(item => ({ ...item, __sourceType: 'before' }));
                const tonKhoTrongNgay = (dataBefore?.tonKhoTrongNgay?.data || []).map(item => ({ ...item, __sourceType: 'before' }));
                const urlAfter = new URL('http://10.220.130.119:9090/api/CheckInOut/GetCheckInAfterKanBan');
                urlAfter.searchParams.append('startDate', startDate);
                urlAfter.searchParams.append('endDate', endDate);
                const resAfter = await fetch(urlAfter);
                if (!resAfter.ok) throw new Error('API After error');
                const dataAfter = await resAfter.json();
                const checkInAfter = (dataAfter?.data || []).map(item => ({ ...item, __sourceType: 'after' }));
                const urlTonKho = new URL('http://10.220.130.119:9090/api/CheckInOut/GetTonKhoSummary');
                urlTonKho.searchParams.append('startDate', startDate);
                urlTonKho.searchParams.append('endDate', endDate);
                let tonKhoSummaryBefore = [];
                let tonKhoSummaryAfter = [];
                try {
                    const tonKhoRes = await fetch(urlTonKho);
                    if (tonKhoRes.ok) {
                        const tonKhoJson = await tonKhoRes.json();
                        tonKhoSummaryBefore = (tonKhoJson?.beforeKanban?.data || []).map(item => ({ ...item, __sourceType: 'before' }));
                        tonKhoSummaryAfter = (tonKhoJson?.afterKanban?.data || []).map(item => ({ ...item, __sourceType: 'after' }));
                    }
                } catch (err) {
                    console.error('Lỗi khi gọi API tồn kho:', err);
                }
                const tonKhoCombined = [...tonKhoSummaryBefore, ...tonKhoSummaryAfter];
                await tables.updateNoLocationInventory(tonKhoCombined);
                await charts.renderInventoryStatusChart(tonKhoCombined);
                const sapResult = await services.fetchSapInOutData(startDate, endDate);
                state.sapInOutRecords = Array.isArray(sapResult.records) ? [...sapResult.records] : [];
                charts.renderSapInOutChart(state.sapInOutRecords, { startDate, endDate });
                const sapTotal = typeof sapResult.total === 'number' ? sapResult.total : state.sapInOutRecords.length;
                Highcharts.chart('checkInBeforeAfer', {
                    chart: { type: 'column', backgroundColor: '#ffffff' },
                    title: { text: null },
                    xAxis: { categories: ['CheckIn Before', 'CheckIn After', 'Tồn kho', 'SAP In'] },
                    yAxis: { title: { text: 'Số lượng' } },
                    plotOptions: {
                        column: {
                            cursor: 'pointer',
                            dataLabels: { enabled: true },
                            point: {
                                events: {
                                    click: function () {
                                        if (this.custom && this.custom.records) {
                                            modals.showCioModal(this.custom.records, this.custom.title || '', this.custom);
                                        }
                                    }
                                }
                            }
                        }
                    },
                    series: [{
                        name: 'Số lượng',
                        data: [
                            { y: checkInBefore.length, color: '#00E5FF', custom: { records: checkInBefore, title: 'Danh sách Check In Before', type: 'default' } },
                            { y: checkInAfter.length, color: '#FF5722', custom: { records: checkInAfter, title: 'Danh sách Check In After', type: 'default' } },
                            { y: tonKhoCombined.length, color: '#4CAF50', custom: { records: tonKhoCombined, title: 'Danh sách tồn kho', type: 'default' } },
                            { y: sapTotal, color: '#673AB7', custom: { records: state.sapInOutRecords, title: 'Danh sách SN vào SAP', type: 'sap' } }
                        ]
                    }]
                });
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
                                            modals.showCioModal(this.custom.records, this.custom.title || '', this.custom);
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
                console.error('Lỗi khi lấy dữ liệu Check In/Out:', error);
                tables.renderNoLocationTable([]);
            }
        },
        async loadNoLocationTrendChart() {
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
                    { start: anchorToday, end: now }
                ];
                state.noLocationTrendDetails = [];
                const categories = [];
                const seriesData = [];
                for (const window of windows) {
                    const { noLocationItems } = await services.fetchTonKhoNoLocationRange(window.start, window.end);
                    const label = utils.formatDisplayRange(window.start, window.end);
                    categories.push(label);
                    state.noLocationTrendDetails.push({
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
                                            modals.showCioModal(this.custom.records, this.custom.title || '', this.custom);
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
        },
        async loadPreviousDayReport() {
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
                rangeElement.textContent = utils.formatDisplayRange(reportStart, reportEnd);

                const beforeUrl = new URL('http://10.220.130.119:9090/api/CheckInOut/GetCheckInOutBeforeKanban');
                beforeUrl.searchParams.append('startDate', utils.formatDateTime(reportStart));
                beforeUrl.searchParams.append('endDate', utils.formatDateTime(reportEnd));

                const afterUrl = new URL('http://10.220.130.119:9090/api/CheckInOut/GetCheckInAfterKanBan');
                afterUrl.searchParams.append('startDate', utils.formatDateTime(reportStart));
                afterUrl.searchParams.append('endDate', utils.formatDateTime(reportEnd));

                const [beforeResponse, afterResponse] = await Promise.all([fetch(beforeUrl), fetch(afterUrl)]);
                if (!beforeResponse.ok || !afterResponse.ok) {
                    throw new Error('Report API error');
                }

                const beforeData = await beforeResponse.json();
                const afterData = await afterResponse.json();

                const checkInRecords = (beforeData?.checkIn?.data || []).map(item => ({ ...item, __sourceType: 'before' }));
                const tonKhoRecords = (beforeData?.tonKhoTrongNgay?.data || []).map(item => ({ ...item, __sourceType: 'before' }));
                const afterRecords = (afterData?.data || []).map(item => ({ ...item, __sourceType: 'after' }));

                const tonKhoCombined = [...tonKhoRecords, ...afterRecords];
                const { items: enrichedItems, noLocationItems } = await services.attachLocationInfo(tonKhoCombined);
                const uniqueRecords = new Map();
                enrichedItems.forEach(item => {
                    const key = utils.getSerialForLocation(item).trim().toUpperCase();
                    if (key && !uniqueRecords.has(key)) {
                        uniqueRecords.set(key, item);
                    }
                });

                const hasLocationCount = [...uniqueRecords.values()].filter(item => (item.location || '').trim()).length;
                const noLocationRecords = [...uniqueRecords.values()].filter(item => !(item.location || '').trim());

                checkInElement.textContent = uniqueRecords.size.toString();
                hasLocationElement.textContent = hasLocationCount.toString();
                noLocationElement.textContent = noLocationRecords.length.toString();
                state.previousDayNoLocationRecords = [...noLocationRecords];
                viewButton.disabled = noLocationRecords.length === 0;
            } catch (error) {
                console.error('loadPreviousDayReport error:', error);
                rangeElement.textContent = 'Không có dữ liệu';
                checkInElement.textContent = '0';
                hasLocationElement.textContent = '0';
                noLocationElement.textContent = '0';
                state.previousDayNoLocationRecords = [];
                viewButton.disabled = true;
            }
        }
    };
    const exporter = {
        exportModalData() {
            if (state.allModalData.length === 0) {
                console.error('Không có dữ liệu để xuất Excel!');
                showError('Không có dữ liệu để xuất!');
                return;
            }
            const worksheetData = state.allModalData.map(item => {
                const resolvedStatus = utils.resolveInventoryStatusValue(item);
                return {
                    'SERIAL_NUMBER': utils.getValueIgnoreCase(item, 'SERIAL_NUMBER') || utils.getValueIgnoreCase(item, 'FG'),
                    'PRODUCT_LINE': utils.getValueIgnoreCase(item, 'PRODUCT_LINE'),
                    'MODEL_NAME': utils.getValueIgnoreCase(item, 'MODEL_NAME'),
                    'WIP_GROUP': utils.getValueIgnoreCase(item, 'WIP_GROUP'),
                    'TEST_GROUP': utils.getValueIgnoreCase(item, 'TEST_GROUP'),
                    'ERROR_CODE': utils.getValueIgnoreCase(item, 'TEST_CODE'),
                    'ERROR_DESC': utils.getValueIgnoreCase(item, 'DATA1'),
                    'STATUS_FA': utils.getValueIgnoreCase(item, 'STATUS_FA') || resolvedStatus,
                    'STATUS_AGING_HOURS': utils.getValueIgnoreCase(item, 'STATUS_AGING_HOURS'),
                    'STATUS_AGING_DISPLAY': utils.getValueIgnoreCase(item, 'STATUS_AGING_DISPLAY'),
                    'PERSON_CONFIRM': utils.getValueIgnoreCase(item, 'TESTER'),
                    'TIME_CONFIRM': utils.formatDateTimeDisplay(utils.getValueIgnoreCase(item, 'DATE3')),
                    'HANDLER': utils.getValueIgnoreCase(item, 'DATA13'),
                    'LOCATION': utils.getValueIgnoreCase(item, 'DATA18') || utils.getValueIgnoreCase(item, 'LOCATION'),
                    'BORROW_STATUS': utils.getValueIgnoreCase(item, 'BORROW_STATUS')
                };
            });
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'SerialNumbers');
            XLSX.writeFile(workbook, `SerialNumbers_${new Date().toISOString().slice(0, 10)}.xlsx`);
            console.log('Excel exported successfully with all data');
        },
        exportNoLocationData() {
            if (state.cioNoLocationData.length === 0) {
                showError('Không có dữ liệu để xuất!');
                return;
            }
            const worksheetData = state.cioNoLocationData.map(item => ({
                'TYPE': utils.getValueIgnoreCase(item, 'TYPE'),
                'SERIAL_NUMBER': utils.getValueIgnoreCase(item, 'SFG') || utils.getValueIgnoreCase(item, 'SERIAL_NUMBER'),
                'MODEL_NAME': utils.getValueIgnoreCase(item, 'MODEL_NAME'),
                'PRODUCT_LINE': utils.getValueIgnoreCase(item, 'PRODUCT_LINE'),
                'LOCATION': utils.getValueIgnoreCase(item, 'DATA18') || utils.getValueIgnoreCase(item, 'LOCATION'),
                'WIP_GROUP': utils.getValueIgnoreCase(item, 'WIP_GROUP'),
                'ERROR_FLAG': utils.getValueIgnoreCase(item, 'ERROR_FLAG'),
                'WORK_FLAG': utils.getValueIgnoreCase(item, 'WORK_FLAG')
            }));
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'TonKhoNoLocation');
            XLSX.writeFile(workbook, `TonKhoNoLocation_${new Date().toISOString().slice(0, 10)}.xlsx`);
        },
        exportCioData() {
            if (state.cioModalData.length === 0) {
                console.error('Không có dữ liệu để xuất Excel!');
                showError('Không có dữ liệu để xuất!');
                return;
            }
            let worksheetData = [];
            let sheetName = 'CheckInOut';
            let filePrefix = 'CheckInOut';
            if (state.cioModalExportType === 'sap') {
                worksheetData = state.cioModalData.map(item => ({
                    'SERIAL_NUMBER': utils.getValueIgnoreCase(item, 'SERIAL_NUMBER') || '',
                    'GROUP_NAME': utils.getValueIgnoreCase(item, 'GROUP_NAME') || '',
                    'MODEL_NAME': utils.getValueIgnoreCase(item, 'MODEL_NAME') || '',
                    'PRODUCT_LINE': utils.getValueIgnoreCase(item, 'PRODUCT_LINE') || '',
                    'MO_NUMBER': utils.getValueIgnoreCase(item, 'MO_NUMBER') || '',
                    'IN_STATION_TIME': utils.formatDateTimeDisplay(utils.getValueIgnoreCase(item, 'IN_STATION_TIME')),
                    'KEY_PART_NO': utils.getValueIgnoreCase(item, 'KEY_PART_NO') || '',
                    'SHIPPING_SN2': utils.getValueIgnoreCase(item, 'SHIPPING_SN2') || '',
                    'MSN': utils.getValueIgnoreCase(item, 'MSN') || '',
                    'ATE_STATION_NO': utils.getValueIgnoreCase(item, 'ATE_STATION_NO') || '',
                    'EMP_NO': utils.getValueIgnoreCase(item, 'EMP_NO') || '',
                    'WIP_GROUP': utils.getValueIgnoreCase(item, 'WIP_GROUP') || '',
                    'LOCATION': utils.getValueIgnoreCase(item, 'LOCATION') || ''
                }));
                sheetName = 'SAPInOut';
                filePrefix = 'SAPInOut';
            } else {
                worksheetData = state.cioModalData.map(item => ({
                    'SERIAL_NUMBER': utils.getValueIgnoreCase(item, 'SERIAL_NUMBER') || utils.getValueIgnoreCase(item, 'SFG'),
                    'FG': utils.getValueIgnoreCase(item, 'FG'),
                    'MODEL_NAME': utils.getValueIgnoreCase(item, 'MODEL_NAME'),
                    'PRODUCT_LINE': utils.getValueIgnoreCase(item, 'PRODUCT_LINE'),
                    'LOCATION': utils.getValueIgnoreCase(item, 'LOCATION'),
                    'PERSON_IN': utils.getValueIgnoreCase(item, 'P_SENDER'),
                    'IN_DATE': utils.formatDateTimeDisplay(utils.getValueIgnoreCase(item, 'IN_DATETIME')),
                    'WIP_GROUP': utils.getValueIgnoreCase(item, 'WIP_GROUP'),
                    'ERROR_FLAG': utils.getValueIgnoreCase(item, 'ERROR_FLAG'),
                    'WORK_FLAG': utils.getValueIgnoreCase(item, 'WORK_FLAG'),
                    'OUT_DATE': utils.formatDateTimeDisplay(utils.getValueIgnoreCase(item, 'OUT_DATETIME')),
                    'REPAIRER': utils.getValueIgnoreCase(item, 'REPAIRER'),
                    'STATION': utils.getValueIgnoreCase(item, 'STATION_NAME'),
                    'ERROR_CODE': utils.getValueIgnoreCase(item, 'ERROR_CODE'),
                    'ERROR_DESC': utils.getValueIgnoreCase(item, 'ERROR_DESC'),
                    'TYPE': utils.getValueIgnoreCase(item, 'CHECKIN_STATUS') || item.__sourceType || ''
                }));
            }
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            XLSX.writeFile(workbook, `${filePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
            console.log(`Excel exported successfully with ${sheetName} data`);
        }
    };
    function registerEventHandlers() {
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => exporter.exportModalData());
        }
        const exportNoLocationExcelBtn = document.getElementById('exportNoLocationExcelBtn');
        if (exportNoLocationExcelBtn) {
            exportNoLocationExcelBtn.addEventListener('click', () => exporter.exportNoLocationData());
        }
        const exportCioExcelBtn = document.getElementById('exportCioExcelBtn');
        if (exportCioExcelBtn) {
            exportCioExcelBtn.addEventListener('click', () => exporter.exportCioData());
        }
        const previousDayNoLocationBtn = document.getElementById('previousDayNoLocationBtn');
        if (previousDayNoLocationBtn) {
            previousDayNoLocationBtn.addEventListener('click', () => {
                if (!state.previousDayNoLocationRecords.length) {
                    return;
                }
                modals.showCioModal(
                    state.previousDayNoLocationRecords,
                    'Danh sách SN chưa có vị trí - Báo cáo ngày hôm trước',
                    { type: 'reportNoLocation' }
                );
            });
        }
        const startInput = document.getElementById('cioStartDate');
        const endInput = document.getElementById('cioEndDate');
        const pickBtn = document.getElementById('pickDateBtn');
        if (pickBtn && startInput && endInput) {
            pickBtn.addEventListener('click', async () => {
                const { value: formValues } = await Swal.fire({
                    title: 'Chọn khoảng thời gian',
                    html: `
                      <label>Từ:</label>
                      <input id="swalStart" type="datetime-local" class="swal2-input" value="${startInput.value}"></br>
                      <label>Đến:</label>
                      <input id="swalEnd" type="datetime-local" class="swal2-input" value="${endInput.value}">
                    `,
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: 'OK',
                    preConfirm: () => [
                        document.getElementById('swalStart').value,
                        document.getElementById('swalEnd').value
                    ]
                });
                if (formValues) {
                    startInput.value = formValues[0];
                    endInput.value = formValues[1];
                    handlers.loadCheckInOutChart();
                }
            });
        }
    }

    function initializeDateRange() {
        const startInput = document.getElementById('cioStartDate');
        const endInput = document.getElementById('cioEndDate');
        if (!startInput || !endInput) {
            return;
        }
        const now = new Date();
        const yesterday730 = new Date(now);
        yesterday730.setHours(7, 30, 0, 0);
        startInput.value = utils.formatDateTime(yesterday730);
        endInput.value = utils.formatDateTime(now);
    }

    function initializeDashboard() {
        modals.ensureInstances();
        registerEventHandlers();
        handlers.loadStatusChart().catch(error => console.error('Error loading status chart:', error));
        handlers.loadNoLocationTrendChart().catch(error => console.error('Error loading no-location trend chart:', error));
        handlers.loadPreviousDayReport().catch(error => console.error('Error loading previous day report:', error));
        initializeDateRange();
        handlers.loadCheckInOutChart().catch(error => console.error('Error loading CheckIn/Out chart:', error));
    }

    document.addEventListener('DOMContentLoaded', initializeDashboard);

    window.SmartFADashboard = {
        state,
        utils,
        tables,
        charts,
        handlers,
        exporter,
        showCioModal: modals.showCioModal
    };
})();
