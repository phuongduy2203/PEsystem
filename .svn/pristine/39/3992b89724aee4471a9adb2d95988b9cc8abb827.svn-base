// Bonepile Summary (Before + After) – rewritten with concurrency & normalization
document.addEventListener('DOMContentLoaded', async function () {
    // ===== API endpoints =====
    const apiBase = 'http://10.220.130.119:9090/api/Bonepile2';
    const beforeCountUrl = `${apiBase}/adapter-repair-status-count`;
    const beforeDetailUrl = `${apiBase}/adapter-repair-records`;

    const afterDetailUrl = `${apiBase}/bonepile-after-kanban-basic`;

    const locationUrl = 'http://10.220.130.119:9090/api/Search/FindLocations';

    function normalizeSn(sn) {
        return (sn || '').toString().trim().toUpperCase();
    }

    function buildLocationMap(rawData) {
        if (!Array.isArray(rawData)) return {};
        return rawData.reduce((acc, item) => {
            const sn = normalizeSn(item?.serialNumber || item?.sn || item?.SERIAL_NUMBER);
            if (!sn) return acc;
            const warehouse = item?.warehouse || item?.Warehouse || '';
            const location = item?.location || item?.Location || '';
            const display = [warehouse, location].filter(Boolean).join(' - ');
            acc[sn] = { warehouse, location, display };
            return acc;
        }, {});
    }

    // ===== Status lists to request =====
    const beforeStatuses = [
        "ScrapLackTask",
        "ScrapHasTask",
        "WaitingApprovalScrap",
        "ApprovedBGA",
        "WaitingApprovalBGA",
        "ReworkFG",
        "WaitingCheckOut",
        "RepairInRE",
        "RepairInPD",
        "Can'tRepairProcess",
        "B36V"
    ];

    // Chuẩn hoá status về key hợp lệ
    function normalizeStatus(status) {
        if (!status) return "Unknown";
        status = status.trim();
        // Nếu status nằm trong danh sách
        if (beforeStatuses.includes(status)) return status;
        // Nếu không khớp, trả về chính status hoặc "Other"
        return status;
    }

    // ===== Colors =====
    const statusColorMap = {
        'ScrapLackTask': '#ffc107',
        'ScrapHasTask': '#05b529',
        'WaitingApprovalScrap': '#dc3545',
        'WaitingApprovalBGA': '#17b86d',
        'ReworkFG': '#6c757d',
        'RepairInRE': '#ff8307',
        'RepairInPD': '#fe8307',
        'WaitingCheckOut': '#fe8307',
        'WaitingLink': '#17a2b8',
        'Linked': '#28a745'
    };

    function uniq(arr) {
        return Array.from(new Set(arr));
    }
    function nowLocalStringTZ7() {
        const now = new Date();
        const offset = 7 * 60; // +07:00
        const localDate = new Date(now.getTime() + offset * 60 * 1000);
        const dateStr = localDate.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = localDate.toTimeString().slice(0, 8).replace(/:/g, '');
        return `${dateStr}_${timeStr}`;
    }

    // ===== Chart (donut) =====
    function renderDonut(statusCounts, total) {
        const labels = statusCounts.map(s => s.status);
        const dataVals = statusCounts.map(s => s.count);
        const percentages = dataVals.map(v => total > 0 ? ((v / total) * 100).toFixed(1) : 0);

        const donutEl = document.getElementById('statusDonutChart');
        if (!donutEl) return;

        const ctx = donutEl.getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: dataVals,
                    backgroundColor: labels.map(l => statusColorMap[l] || '#ccc')
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 20, boxHeight: 20,
                            generateLabels: chart => {
                                const d = chart.data;
                                return d.labels.map((label, i) => ({
                                    text: `${label} (${percentages[i]}%)`,
                                    fillStyle: d.datasets[0].backgroundColor[i],
                                    strokeStyle: d.datasets[0].backgroundColor[i],
                                    lineWidth: 1,
                                    hidden: isNaN(d.datasets[0].data[i]) || d.datasets[0].data[i] === 0,
                                    index: i
                                }));
                            }
                        },
                        maxWidth: 300,
                        align: 'center'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                const label = ctx.label || '';
                                const value = ctx.raw || 0;
                                const percent = percentages[ctx.dataIndex];
                                return `${label}: ${value} (${percent}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // ===== Dashboard (KPI + donut) – run BEFORE/AFTER count concurrently =====
    async function loadDashboardData() {
        try {
            showSpinner();
            const [beforeRes, afterBasicRes] = await Promise.all([
                axios.get(beforeCountUrl),
                axios.get(afterDetailUrl)
            ]);

            const beforeTotal = Number(beforeRes.data?.totalCount || 0);
            const afterBasic = afterBasicRes.data?.data || [];
            const afterTotal = afterBasic.length;

            const statusCountsMap = {};

            (beforeRes.data?.statusCounts || []).forEach(s => {
                const k = normalizeStatus(s.status ?? s.Status);
                const c = Number(s.count ?? s.Count ?? 0);
                statusCountsMap[k] = (statusCountsMap[k] || 0) + c;
            });

            afterBasic.forEach(a => {
                const k = normalizeStatus(a.status || a.Status || '');
                statusCountsMap[k] = (statusCountsMap[k] || 0) + 1;
            });

            const statusCounts = Object.keys(statusCountsMap).map(k => ({ status: k, count: statusCountsMap[k] }));
            const total = beforeTotal + afterTotal;

            const totalEl = document.getElementById('totalCount');
            if (totalEl) totalEl.innerText = total;

            renderDonut(statusCounts, total);

            await loadTableData(afterBasic); // then render table
        } catch (e) {
            console.error('Error loading dashboard', e);
            alert('Không thể tải dữ liệu dashboard.');
        } finally {
            hideSpinner();
        }
    }

    // ===== Table – run BEFORE detail + AFTER basic concurrently, then testinfo + locations concurrently =====
    let dataTable;
    async function loadTableData(afterBasicData) {
        try {
            showSpinner();

            // 1) BEFORE detail; AFTER basic may come from caller
            const beforeRes = await axios.post(beforeDetailUrl, { statuses: beforeStatuses });
            const beforeData = beforeRes.data?.data || [];
            const afterBasic = afterBasicData || [];

            // If caller didn't supply after data, fetch it now
            if (!afterBasicData) {
                const afterRes = await axios.get(afterDetailUrl);
                afterBasic.push(...(afterRes.data?.data || []));
            }

            // 2) SN list for AFTER testinfo + locations
            const afterSNs = uniq(afterBasic.map(a => normalizeSn(a.sn || a.SN)).filter(Boolean));
            const beforeSNs = uniq(beforeData.map(b => normalizeSn(b.sn || b.SN)).filter(Boolean));
            const locationRequestSNs = uniq(afterSNs.concat(beforeSNs));

            // 3) locations (chịu lỗi cục bộ)
            let locationMap = {};
            try {
                const locRes = await axios.post(locationUrl, locationRequestSNs);
                locationMap = buildLocationMap(locRes.data?.data);
            } catch (e) {
                console.warn('Location fetch failed:', e);
            }
            // 4) Map BEFORE rows
            const mappedBefore = beforeData.map(b => ({
                type: 'Before',
                sn: b.sn || b.SN,
                productLine: b.productLine || b.ProductLine,
                modelName: b.modelName || b.ModelName,
                moNumber: b.moNumber || b.MoNumber,
                wipGroup: b.wipGroup || b.WipGroup,
                wipGroupKANBAN: '',
                testGroup: b.testGroup || b.TestGroup || '',
                testCode: b.testCode || b.TestCode || '',
                errorCodeItem: b.errorCodeItem || '',
                testTime: b.testTime || b.TestTime || '',
                errorDesc: b.errorDesc || b.ErrorDesc || '',
                status: normalizeStatus(b.status || b.Status || ''),
                statusV2: '',
                aging: b.agingDay || b.AgingDay || '',
                location: locationMap[normalizeSn(b.sn || b.SN)]?.display || '',
                repair: b.repair || b.Repair || ''
            }));

            // 5) Map AFTER rows (+merge locaation)
            const mappedAfter = afterBasic.map(a => {
                const sn = a.sn || a.SN;
                const normalizedSn = normalizeSn(sn);
                return {
                    type: 'After',
                    sn,
                    productLine: a.productLine || a.ProductLine,
                    modelName: a.modelName || a.ModelName,
                    moNumber: a.moNumber || a.MoNumber,
                    wipGroup: a.wipGroupSFC || a.WipGroupSFC || '',
                    wipGroupKANBAN: a.wipGroupKANBAN || a.WipGroupKANBAN || '',
                    testGroup: a.testGroup || a.TestGroup || '',
                    testCode: a.testCode || a.TestCode || '',
                    errorCodeItem: a.errorCodeItem || a.ErrorCodeItem || '',
                    testTime: a.testTime || a.TestTime || '',
                    errorDesc: a.errorDesc || a.ErrorDesc || '',
                    status: normalizeStatus(a.status || a.Status || ''),
                    statusV2: a.statusV2 || a.StatusV2 || '',
                    aging: a.aging ?? a.Aging ?? '',
                    location: locationMap[normalizedSn]?.display || '',
                    repair: ''
                };
            });

            // 6) Combine & render DataTable
            const combined = mappedBefore.concat(mappedAfter);

            if (dataTable) {
                dataTable.clear().rows.add(combined).draw();
            } else {
                dataTable = $('#summaryTable').DataTable({
                    data: combined,
                    scrollX: true,
                    columns: [
                        { data: 'type' },
                        { data: 'sn' },
                        { data: 'productLine' },
                        { data: 'modelName' },
                        { data: 'moNumber' },
                        { data: 'wipGroup' },
                        { data: 'wipGroupKANBAN' },
                        { data: 'testGroup' },
                        { data: 'testCode' },
                        { data: 'errorCodeItem' },
                        { data: 'testTime' },
                        { data: 'errorDesc' },
                        { data: 'status' },
                        { data: 'statusV2' },
                        { data: 'aging' },
                        { data: 'location' },
                        { data: 'repair' }
                    ],
                    dom: '<"top d-flex align-items-center"flB>rt<"bottom"ip>',
                    buttons: [{
                        extend: 'excelHtml5',
                        text: '<img src="/assets/img/excel.png" class="excel-icon excel-button"/>',
                        title: '',
                        filename: () => `Bonepile_summary_${nowLocalStringTZ7()}`,
                        exportOptions: {
                            columns: ':visible',
                            modifier: { selected: null },
                            format: { header: d => (d || '').trim() }
                        }
                    }],
                    destroy: true,
                    language: {
                        search: '',
                        emptyTable: 'Không có dữ liệu để hiển thị',
                        zeroRecords: 'Không tìm thấy bản ghi phù hợp'
                    },
                    initComplete: function () {
                        $('.dataTables_filter input[type="search"]').attr('placeholder', 'Tìm kiếm');
                    }
                });
            }
        } catch (e) {
            console.error('Error loading table', e);
            alert('Không thể tải dữ liệu bảng.');
        } finally {
            hideSpinner();
        }
    }

    // ===== Kick off =====
    await loadDashboardData();
});
