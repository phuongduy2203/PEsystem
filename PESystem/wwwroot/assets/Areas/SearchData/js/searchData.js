document.addEventListener('DOMContentLoaded', () => {
    const scanEl = document.getElementById('scan-log');
    const foundEl = document.getElementById('repairCount');
    const fromInput = document.getElementById('fromTime');
    const toInput = document.getElementById('toTime');
    const applyBtn = document.getElementById('applyTime');
    const spinner = document.getElementById('spinner-overlay');
    const listTitle = document.getElementById('listDetailTitle');
    const detailModalEl = document.getElementById('listDetailModal');
    const summaryModalEl = document.getElementById('scanSummaryModal');
    const summaryTitleEl = document.getElementById('scanSummaryTitle');
    const totalScanBtn = document.getElementById('view-total-scan');
    const foundScanBtn = document.getElementById('view-found-scan');
    const searchBtn = document.getElementById('search-btn');
    const textarea = document.getElementById('serialNumber');
    const modal = new bootstrap.Modal(document.getElementById('serialModal'));

    let listsTable;
    let itemsTable;
    let summaryTable;
    let activeSummaryFilter = 'total';
    const detailModal = detailModalEl && typeof bootstrap !== 'undefined'
        ? new bootstrap.Modal(detailModalEl)
        : null;
    const summaryModal = summaryModalEl && typeof bootstrap !== 'undefined'
        ? new bootstrap.Modal(summaryModalEl)
        : null;
    const summaryApiUrl = 'http://10.220.130.119:9090/api/scan/summary';
    let summaryCache = { key: '', items: [], total: 0, found: 0, loaded: false };
    let summaryPromise = null;

    function toggleSpinner(show) {
        if (!spinner) return;
        spinner.style.display = show ? 'flex' : 'none';
    }


    function formatLocalDateTime(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
        const pad = n => String(n).padStart(2, '0');
        const Y = date.getFullYear();
        const M = pad(date.getMonth() + 1);
        const D = pad(date.getDate());
        const h = pad(date.getHours());
        const m = pad(date.getMinutes());
        // datetime-local expects "YYYY-MM-DDTHH:MM"
        return `${Y}-${M}-${D}T${h}:${m}`;
    }


    function buildRangeParams() {
        const params = new URLSearchParams();
        if (fromInput?.value) {
            // Gửi đúng định dạng local, không timezone
            const fromStr = `${fromInput.value}:00`;
            params.append('from', fromStr);
        }
        if (toInput?.value) {
            const toStr = `${toInput.value}:00`;
            params.append('to', toStr);
        }
        console.log("⏰ Sending params (no timezone):", params.toString());
        return params;
    }




    function setDefaultRange() {
        if (!fromInput || !toInput) return;
        const now = new Date();
        const start = new Date(now.getTime());
        start.setDate(start.getDate() - 1);
        start.setHours(7, 30, 0, 0);
        fromInput.value = formatLocalDateTime(start);
        toInput.value = formatLocalDateTime(now);
    }

    function getRangeKey(params) {
        return params.toString();
    }

    function extractNumber(sources, keys) {
        for (const source of sources) {
            if (!source || typeof source !== 'object' || Array.isArray(source)) {
                continue;
            }
            for (const key of keys) {
                if (!(key in source)) {
                    continue;
                }
                const raw = source[key];
                if (raw === undefined || raw === null || raw === '') {
                    continue;
                }
                const rawValue = typeof raw === 'string' ? raw.replace(/,/g, '').trim() : raw;
                const num = Number(rawValue);
                if (!Number.isNaN(num)) {
                    return num;
                }
            }
        }
        return null;
    }

    function extractSummaryData(payload) {
        if (!payload || typeof payload !== 'object') {
            return { items: [], total: 0, found: 0 };
        }

        let items = [];

        // Nếu API có trả foundItems / scannedItems
        if (Array.isArray(payload.foundItems) || Array.isArray(payload.scannedItems)) {
            const foundItems = (payload.foundItems || []).map(r => ({
                ...r,
                isFound: true
            }));
            const scannedItems = (payload.scannedItems || []).map(r => ({
                ...r,
                isFound: false
            }));
            items = [...foundItems, ...scannedItems].map(normalizeSummaryRecord);
        } else {
            // fallback: dò các key cũ
            const collectionKeys = [
                'items', 'data', 'list', 'lists', 'rows',
                'records', 'result', 'results'
            ];
            let rawItems = Array.isArray(payload) ? payload : [];
            if (!rawItems.length) {
                for (const key of collectionKeys) {
                    const value = payload[key];
                    if (Array.isArray(value)) {
                        rawItems = value;
                        break;
                    }
                }
            }
            items = Array.isArray(rawItems) ? rawItems.map(normalizeSummaryRecord) : [];
        }

        // Tính tổng số và số đã tìm thấy
        const total = payload.scanCount ?? payload.total ?? items.length;
        const found = payload.foundCount ?? payload.found ?? items.filter(x => x.isFound).length;

        return { items, total, found };
    }

    function renderTable(data) {
        const tbody = document.querySelector('#serialTable tbody');
        tbody.innerHTML = '';
        currentData = data; // lưu lại dữ liệu

        if (!data.length) {
            const toast = new bootstrap.Toast(document.getElementById('noDataToast'));
            toast.show();
            return;
        }

        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
            <td>${item.serialNumber || ''}</td>
            <td>${item.createdAt || ''}</td>
        `;
            tbody.appendChild(tr);
        });

        modal.show();
    }

    // Xuất Excel
    document.getElementById('exportExcelBtn')?.addEventListener('click', () => {
        if (!currentData.length) {
            alert("Không có dữ liệu để xuất!");
            return;
        }

        // Chuyển dữ liệu thành worksheet
        const wsData = currentData.map(item => ({
            "Serial Number": item.serialNumber,
            "Created At": item.createdAt
        }));

        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Serials");

        // Xuất file
        XLSX.writeFile(wb, "serial_numbers.xlsx");
    });

    async function fetchSummary(params) {
        const query = params.toString();
        const url = query ? `${summaryApiUrl}?${query}` : summaryApiUrl;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch summary');
        }
        const payload = await response.json();
        return extractSummaryData(payload);
    }

    async function ensureSummary(forceRefresh = false) {
        const params = buildRangeParams();
        const key = getRangeKey(params);
        if (!forceRefresh && summaryCache.loaded && summaryCache.key === key) {
            return summaryCache;
        }
        if (!summaryPromise || forceRefresh || summaryCache.key !== key) {
            const paramsCopy = new URLSearchParams(params);
            const keyCopy = key;
            const fetchPromise = (async () => {
                const data = await fetchSummary(paramsCopy);
                summaryCache = {
                    key: keyCopy,
                    items: data.items,
                    total: data.total,
                    found: data.found,
                    loaded: true
                };
                return summaryCache;
            })();
            summaryPromise = fetchPromise;
            fetchPromise.finally(() => {
                if (summaryPromise === fetchPromise) {
                    summaryPromise = null;
                }
            });
        }
        try {
            return await summaryPromise;
        } catch (error) {
            summaryCache = { key: '', items: [], total: 0, found: 0, loaded: false };
            throw error;
        }
    }

    async function updateCounts(forceRefresh = false) {
        if (!scanEl || !foundEl) return;
        try {
            const summary = await ensureSummary(forceRefresh);
            scanEl.textContent = summary.total ?? 0;
            foundEl.textContent = summary.found ?? 0;
            if (summaryModalEl?.classList.contains('show')) {
                const items = activeSummaryFilter === 'found'
                    ? summary.items.filter(item => item.isFound)
                    : summary.items;
                renderSummaryTable(items);
            }
        } catch {
            scanEl.textContent = 'N/A';
            foundEl.textContent = 'N/A';
            if (summaryModalEl?.classList.contains('show')) {
                renderSummaryTable([]);
            }
        }
    }

    function isFoundValue(value) {
        if (value === undefined || value === null) {
            return false;
        }
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'number') {
            return value !== 0;
        }
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (normalized === '' || normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'n') {
                return false;
            }
            return ['1', 'true', 'yes', 'y', 'found'].includes(normalized);
        }
        return Boolean(value);
    }

    function renderSearchLists(data) {
        const lists = Array.isArray(data)
            ? data.slice().sort((a, b) => {
                const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
            })
            : [];
        if (!listsTable) {
            listsTable = $('#searchListsTable').DataTable({
                data: lists,
                dom: '<"top d-flex align-items-center"fB>rt<"bottom"ip>',
                buttons: [
                    {
                        extend: 'excelHtml5',
                        text: '<img src="/assets/img/excel.png" style="height:32px; margin:5px;">',
                        title: 'Search List',
                        exportOptions: {
                            columns: ':visible:not(:last-child)'
                        }
                    }
                ],
                columns: [
                    { data: 'listName', title: 'List Name', defaultContent: '' },
                    {
                        data: 'totalItems',
                        title: 'Tổng SN',
                        render: value => (value ?? 0)
                    },
                    {
                        data: 'foundItems',
                        title: 'Đã tìm thấy',
                        render: value => (value ?? 0)
                    },
                    { data: 'createdBy', title: 'Người tạo', defaultContent: '' },
                    {
                        data: 'createdAt',
                        title: 'Ngày tạo',
                        render: (value, type) => {
                            if (!value) {
                                return '';
                            }
                            const date = new Date(value);
                            if (Number.isNaN(date.getTime())) {
                                return '';
                            }
                            if (type === 'sort' || type === 'type') {
                                return date.getTime();
                            }
                            return date.toLocaleString();
                        },
                        defaultContent: ''
                    },
                    {
                        data: null,
                        title: 'Chi tiết',
                        orderable: false,
                        searchable: false,
                        className: 'text-center',
                        defaultContent: '',
                        render: () => '<button type="button" class="btn btn-link detail-link p-0" data-action="detail">Detail</button>'
                    }
                ],
                order: [[4, 'desc']],
                language: {
                    emptyTable: 'Không có dữ liệu'
                }
            });

            $('#searchListsTable tbody').on('click', 'button[data-action="detail"]', function () {
                const rowData = listsTable.row($(this).closest('tr')).data();
                if (rowData) {
                    showListItems(rowData);
                }
            });
        } else {
            listsTable.clear().rows.add(lists);
        }
        listsTable.order([4, 'desc']);
        listsTable.draw();
    }

    function renderListItems(items) {
        const data = Array.isArray(items) ? items : [];
        if (!itemsTable) {
            itemsTable = $('#listItemsTable').DataTable({
                data,
                dom: '<"top d-flex align-items-center"fB>rt<"bottom"ip>',
                buttons: [
                    {
                        extend: 'excelHtml5',
                        text: '<img src="/assets/img/excel.png" style="height:32px; margin:5px;">',
                        title: () => (listTitle?.textContent?.trim() || 'Danh sách SerialNumber')
                    }
                ],
                columns: [
                    { data: 'serialNumber', title: 'Serial Number', defaultContent: '' },
                    {
                        data: 'isFound',
                        title: 'Đã tìm thấy',
                        render: value => (isFoundValue(value) ? 'Có' : 'Không')
                    },
                    {
                        data: 'scanTime',
                        title: 'Thời gian scan',
                        render: (value, type) => {
                            if (!value) {
                                return '';
                            }
                            const date = new Date(value);
                            if (Number.isNaN(date.getTime())) {
                                return '';
                            }
                            if (type === 'sort' || type === 'type') {
                                return date.getTime();
                            }
                            return date.toLocaleString();
                        }
                    }
                ],
                order: [[0, 'asc']],
                language: {
                    emptyTable: 'Không có dữ liệu'
                },
                rowCallback: (row, rowData) => {
                    if (rowData && isFoundValue(rowData.isFound)) {
                        row.classList.add('table-success');
                    } else {
                        row.classList.remove('table-success');
                    }
                }
            });
        } else {
            itemsTable.clear().rows.add(data);
            itemsTable.order([0, 'asc']);
            itemsTable.draw();
        }
    }

    function showListItems(listData) {
        if (!listData) return;
        if (listTitle) {
            const name = listData.listName ?? '';
            listTitle.textContent = name ? `Danh sách SerialNumber - ${name}` : 'Danh sách SerialNumber';
        }
        const items = Array.isArray(listData.items)
            ? listData.items
            : Array.isArray(listData.serials)
                ? listData.serials
                : Array.isArray(listData.serialNumbers)
                    ? listData.serialNumbers
                    : [];
        renderListItems(items);
        if (detailModal) {
            detailModal.show();
        }
    }

    function normalizeSummaryRecord(record) {
        if (!record || typeof record !== 'object') {
            return {
                serialNumber: '',
                listName: '',
                isFound: false,
                scanTime: ''
            };
        }
        const serialNumber = record.serialNumber ?? record.serial ?? record.serial_number ?? '';
        const listName = record.listName ?? record.list ?? record.list_name ?? '';
        const scanTime = record.scanTime ?? record.scan_time ?? record.createdAt ?? record.updatedAt ?? '';
        const isFoundRaw = record.isFound ?? record.found ?? record.is_found ?? record.status;
        return {
            serialNumber,
            listName,
            isFound: isFoundValue(isFoundRaw),
            scanTime
        };
    }

    function renderSummaryTable(items) {
        const data = Array.isArray(items) ? items : [];
        if (!summaryTable) {
            summaryTable = $('#scanSummaryTable').DataTable({
                data,
                dom: '<"top d-flex align-items-center"fB>rt<"bottom"ip>',
                buttons: [
                    {
                        extend: 'excelHtml5',
                        text: '<img src="/assets/img/excel.png" style="height:32px; margin:5px;">',
                        title: () => (summaryTitleEl?.textContent?.trim() || 'Dữ liệu Scan')
                    }
                ],
                columns: [
                    { data: 'serialNumber', title: 'SerialNumber', defaultContent: '' },
                    { data: 'listName', title: 'List Name', defaultContent: '' },
                    {
                        data: 'isFound',
                        title: 'Đã tìm thấy',
                        render: value => (isFoundValue(value) ? 'Có' : 'Không')
                    },
                    {
                        data: 'scanTime',
                        title: 'Thời gian scan',
                        render: (value, type) => {
                            if (!value) {
                                return '';
                            }
                            const date = new Date(value);
                            if (Number.isNaN(date.getTime())) {
                                return '';
                            }
                            if (type === 'sort' || type === 'type') {
                                return date.getTime();
                            }
                            return date.toLocaleString();
                        }
                    }
                ],
                order: [[3, 'desc']],
                language: {
                    emptyTable: 'Không có dữ liệu'
                },
                rowCallback: (row, rowData) => {
                    if (rowData && isFoundValue(rowData.isFound)) {
                        row.classList.add('table-success');
                    } else {
                        row.classList.remove('table-success');
                    }
                }
            });
        } else {
            summaryTable.clear().rows.add(data);
            summaryTable.order([3, 'desc']);
            summaryTable.draw();
        }
    }

    async function openSummaryModal(filterType) {
        toggleSpinner(true);
        activeSummaryFilter = filterType;
        if (summaryTitleEl) {
            summaryTitleEl.textContent = filterType === 'found'
                ? 'Danh sách Serial Number đã tìm thấy'
                : 'Danh sách Serial Number đã scan';
        }
        try {
            const summary = await ensureSummary();
            const filtered = filterType === 'found'
                ? summary.items.filter(item => item.isFound)
                : summary.items;
            renderSummaryTable(filtered);
        } catch {
            renderSummaryTable([]);
        }
        if (summaryModal) {
            summaryModal.show();
        }
        toggleSpinner(false);
    }

    async function loadSearchLists() {
        toggleSpinner(true);
        try {
            const resp = await fetch('http://10.220.130.119:9090/api/scan/search-lists/details');
            if (!resp.ok) {
                renderSearchLists([]);
                return;
            }
            const payload = await resp.json();
            renderSearchLists(payload?.lists ?? []);
        } catch {
            renderSearchLists([]);
        } finally {
            toggleSpinner(false);
        }
    }


    async function searchSerials() {
        const lines = textarea.value
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(Boolean);

        try {
            const resp = await fetch('http://10.220.130.119:9090/api/scan/SearchBySN', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serialNumber: lines })
            });

            if (resp.ok) {
                const data = await resp.json();
                renderTable(Array.isArray(data) ? data : []);
            } else if (resp.status === 404) {
                // API trả về 404
                alert("⚠️ Không tìm thấy dữ liệu Serial Number!");
                renderTable([]);
            } else {
                alert("⚠️ Lỗi server (" + resp.status + ")");
                renderTable([]);
            }
        } catch (err) {
            console.error("Fetch error:", err);
            alert("⚠️ Không thể kết nối tới API!");
            renderTable([]);
        }
    }


searchBtn?.addEventListener('click', e => {
    e.preventDefault();
    searchSerials();
});

    applyBtn?.addEventListener('click', e => {
        e.preventDefault();
        updateCounts(true);
    });

    totalScanBtn?.addEventListener('click', e => {
        e.preventDefault();
        openSummaryModal('total');
    });

    foundScanBtn?.addEventListener('click', e => {
        e.preventDefault();
        openSummaryModal('found');
    });

    detailModalEl?.addEventListener('shown.bs.modal', () => {
        if (itemsTable) {
            itemsTable.columns.adjust();
        }
    });

    summaryModalEl?.addEventListener('shown.bs.modal', () => {
        if (summaryTable) {
            summaryTable.columns.adjust();
        }
    });

    setDefaultRange();
    updateCounts(true);
    loadSearchLists();
});
