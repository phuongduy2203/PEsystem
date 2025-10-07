document.addEventListener("DOMContentLoaded", async function () {
    const apiBase = "http://10.220.130.119:9090/api/Bonepile2";
    const apiCountUrl = `${apiBase}/bonepile-after-kanban-count`;
    const apiDetailUrl = `${apiBase}/bonepile-after-kanban`;

    // Định nghĩa tất cả trạng thái hợp lệ
    const validStatuses = [
        "ScrapHasTask",
        "ScrapLackTask",
        "WatitingScrap",
        "ApproveBGA",
        "RepairInRE",
        "Online"
    ];

    const statusColorMap = {
        "ScrapHasTask": "#05b529",
        "ScrapLackTask": "#ffc107",
        "WatitingScrap": "#dc3545",
        "RepairInRE": "#ff8307",
        "ApproveBGA": "#17b86d",
        "Online": "#28a745 ",
    };

    let dataTable;

    // Load KPI + Donut chart
    async function loadDashboardData() {
        try {
            const res = await axios.get(apiCountUrl);
            const { totalCount, statusCounts } = res.data;

            // Gán KPI
            document.getElementById("totalCount").innerText = totalCount || 0;
            document.getElementById("noTaskscrapCount").innerText = statusCounts.find(s => s.status === "ScrapLackTask")?.count || 0;
            document.getElementById("scrapCount").innerText = statusCounts.find(s => s.status === "ScrapHasTask")?.count || 0;
            document.getElementById("waitingScrapCount").innerText = statusCounts.find(s => s.status === "WatitingScrap")?.count || 0;
            document.getElementById("repairInRE").innerText = statusCounts.find(s => s.status === "RepairInRE")?.count || 0;
            document.getElementById("waitingBGA").innerText = statusCounts.find(s => s.status === "ApproveBGA")?.count || 0;
            document.getElementById("online").innerText = statusCounts.find(s => s.status === "Online")?.count || 0;

            // Tính phần trăm cho biểu đồ
            const total = statusCounts.reduce((sum, s) => sum + s.count, 0);
            const percentages = statusCounts.map(s => total > 0 ? ((s.count / total) * 100).toFixed(1) : 0);

            // Vẽ Donut chart với phần trăm
            const donutCtx = document.getElementById("statusDonutChart").getContext("2d");
            new Chart(donutCtx, {
                type: "doughnut",
                data: {
                    labels: statusCounts.map(s => s.status),
                    datasets: [{
                        data: statusCounts.map(s => s.count),
                        backgroundColor: statusCounts.map(s => statusColorMap[s.status] || "#ccc"),
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: {
                                boxWidth: 20,
                                boxHeight: 20,
                                generateLabels: (chart) => {
                                    const data = chart.data;
                                    return data.labels.map((label, i) => ({
                                        text: `${label} (${percentages[i]}%)`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        strokeStyle: data.datasets[0].backgroundColor[i],
                                        lineWidth: 1,
                                        hidden: isNaN(data.datasets[0].data[i]) || data.datasets[0].data[i] === 0,
                                        index: i
                                    }));
                                }
                            },
                            maxWidth: 300,
                            align: "center"
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const percentage = percentages[context.dataIndex];
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        },
                        datalabels: {
                            formatter: (value, ctx) => {
                                const total = statusCounts.reduce((sum, d) => sum + d.count, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${percentage}%`;
                            },
                            color: '#000', // Màu chữ
                            font: { weight: 'bold', size: 12 }
                        }

                    }
                },
                plugins: [ChartDataLabels]
            });

            // Load dữ liệu bảng ban đầu (Tất cả trạng thái)
            await loadTableData(validStatuses);
        } catch (error) {
            console.error("Lỗi khi tải dashboard:", error);
            alert("Không thể tải dữ liệu dashboard. Vui lòng thử lại!");
        }
    }

    // Load dữ liệu bảng dựa trên trạng thái
    async function loadTableData(statuses) {
        try {
            // Hiển thị spinner
            showSpinner();
            // Log payload để debug
            console.log("Sending payload:", { statuses });

            const response = await axios.post(apiDetailUrl, {
                statuses: statuses.length > 0 ? statuses : null
            });
            const tableData = response.data?.data || [];

            if (dataTable) {
                dataTable.clear().rows.add(tableData).draw();
            } else {
                dataTable = $('#sumMaterialsTable').DataTable({
                    data: tableData,
                    scrollX: true,
                    columns: [
                        { data: "sn" },
                        { data: "fg" },
                        { data: "productLine" },
                        { data: "modelName" },
                        { data: "moNumber" },
                        { data: "wipGroupSFC" },
                        { data: "wipGroupKANBAN" },
                        { data: "testGroup" },
                        { data: "testTime" },
                        { data: "testCode" },
                        { data: "errorDesc" },
                        { data: "status" }
                    ],
                    dom: '<"top d-flex align-items-center"flB>rt<"bottom"ip>',

                    buttons: [
                        {
                            extend: 'excelHtml5',
                            text: '<img src="/assets/img/excel.png" class="excel-icon excel-button"/>',
                            title: '', // Loại bỏ tiêu đề mặc định
                            filename: function () {
                                const now = new Date();
                                const offset = 7 * 60; // +07:00
                                const localDate = new Date(now.getTime() + offset * 60 * 1000);
                                const dateStr = localDate.toISOString().slice(0, 10).replace(/-/g, '');
                                const timeStr = localDate.toTimeString().slice(0, 8).replace(/:/g, '');
                                return `Bonepile1_0_${dateStr}_${timeStr}`;
                            },
                            exportOptions: {
                                columns: ':visible',
                                modifier: {
                                    selected: null
                                },
                                format: {
                                    header: function (data, columnIdx) {
                                        // Loại bỏ khoảng trắng hoặc ký tự không mong muốn
                                        return data.trim();
                                    }
                                }
                            }
                        }
                    ],
                    destroy: true,
                    language: {
                        search: "",
                        emptyTable: "Không có dữ liệu để hiển thị",
                        zeroRecords: "Không tìm thấy bản ghi phù hợp"
                    },
                    initComplete: function () {
                        // Tạo select filter
                        var selectHtml = `
                                                                    <div class="form-group mb-0" style="min-width: 200px;">
                                                                        <select id="statusFilterDt" class="form-control">
                                                                            <option value="">Tất cả trạng thái</option>
                                                                            <option value="ScrapHasTask">Scrap Has Task</option>
                                                                            <option value="ScrapLackTask">Scrap Lacks Task</option>
                                                                            <option value="ApproveBGA">SPE Approve to BGA</option>
                                                                            <option value="WatitingScrap">Waiting SPE Approve Scrap</option>
                                                                            <option value="RepairInRE">Under Repair in RE</option>
                                                                            <option value="Online">Online</option>
                                                                        </select>
                                                                    </div>
                                                                `;

                        // Chèn vào phần `top` bên trái (trước nút excel)
                        $('.dataTables_wrapper .top').prepend(selectHtml);

                        // Gắn sự kiện
                        $('#statusFilterDt').on('change', async function () {
                            const selectedStatus = this.value;
                            const statuses = selectedStatus ? [selectedStatus] : validStatuses;
                            await loadTableData(statuses);
                        });


                        // Set placeholder cho ô search
                        $('.dataTables_filter input[type="search"]').attr('placeholder', 'Tìm kiếm');
                    }
                });
            }
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu bảng:", error);
            alert("Không thể tải dữ liệu bảng. Vui lòng thử lại!");
        } finally {
            //document.getElementById("spinner-overlay").style.display = "none";
            hideSpinner();
        }
    }

    // Khởi tạo dashboard
    await loadDashboardData();
});