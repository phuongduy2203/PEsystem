const API_BASE_URL = "http://10.220.130.119:9090/api/bga-replace";
const STATUS_TEXT = {
    3: "Replaced BGA ok",
    4: "Waiting approve replace BGA",
    10: "Check in barking",
    11: "Check out barking",
    12: "VI after barking",
    13: "Remove BGA, clean pad",
    14: "Check VI BGA pad",
    15: "Replace BGA",
    16: "Xray",
    17: "ICT, FT",
    18: "Waiting return PD line",
    19: "Return PD line ok"
};

const AXIS_TICK_COLOR = "#f8f9fa";
const GRID_LINE_COLOR = "rgba(255, 255, 255, 0.2)";

const statusValueLabelsPlugin = {
    id: "statusValueLabels",
    afterDatasetsDraw(chart, _args, pluginOptions) {
        const options = pluginOptions || {};
        if (options.display === false) {
            return;
        }

        const dataset = chart.data.datasets?.[0];
        const meta = chart.getDatasetMeta(0);
        if (!dataset || !Array.isArray(dataset.data)) {
            return;
        }

        const ctx = chart.ctx;
        const color = options.color || "#0d6efd";
        const fontOptions = options.font || {};
        const fontSize = fontOptions.size || 12;
        const fontWeight = fontOptions.weight || "600";
        const fontFamily = fontOptions.family || "'Segoe UI', Arial, sans-serif";
        const lineHeight = fontOptions.lineHeight || Math.round(fontSize * 1.3);
        const align = options.align || "center";
        const offset = typeof options.offset === "number" ? options.offset : 8;

        const labels = Array.isArray(chart.data.labels) ? chart.data.labels : [];
        const statusDetails = Array.isArray(dataset.statusDetails) ? dataset.statusDetails : [];

        const buildStatusText = (detail, fallbackLabel) => {
            if (detail && typeof detail === "object") {
                const statusCode = detail.status ?? fallbackLabel ?? "";
                const statusName = detail.statusName;
                let text = statusName ? `${statusCode} - ${statusName}` : `${statusCode}`;
                text = `${text}`.trim();
                if (text.length > 34) {
                    text = `${text.slice(0, 31)}...`;
                }
                return text;
            }

            if (typeof fallbackLabel === "string" && fallbackLabel.length) {
                return fallbackLabel;
            }

            return "";
        };

        ctx.save();
        ctx.fillStyle = color;
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textAlign = align;
        ctx.textBaseline = "bottom";

        meta.data.forEach((element, index) => {
            const value = dataset.data[index];
            if (value === undefined || value === null) {
                return;
            }

            const detail = statusDetails[index];
            const fallbackLabel = typeof labels[index] === "string" ? labels[index] : "";
            const statusText = buildStatusText(detail, fallbackLabel);
            const lines = [];

            if (statusText) {
                lines.push(`TT: ${statusText}`);
            }

            lines.push(`SL: ${value}`);

            const totalHeight = (lines.length - 1) * lineHeight;
            const x = element.x;
            const startY = element.y - offset;

            lines.forEach((line, lineIndex) => {
                if (!line) {
                    return;
                }

                const lineY = startY - (totalHeight - (lineIndex * lineHeight));
                ctx.fillText(line, x, lineY);
            });
        });

        ctx.restore();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const statusChartCanvas = document.getElementById("status-chart");
    const statusChartEmpty = document.getElementById("status-chart-empty");
    const statusSummaryInfo = document.getElementById("status-summary-info");
    const statusDownloadSelect = document.getElementById("status-download-select");
    const statusDownloadButton = document.getElementById("status-download-btn");
    const barkingChartCanvas = document.getElementById("barking-age-chart");
    const barkingChartEmpty = document.getElementById("barking-age-empty");
    const barkingSummary = document.getElementById("barking-summary");
    const barkingDownloadButton = document.getElementById("barking-download-btn");
    const dashboardLastUpdated = document.getElementById("dashboard-last-updated");
    const refreshDashboardButton = document.getElementById("refresh-dashboard-btn");

    if (!statusChartCanvas || !statusChartEmpty || !barkingChartCanvas || !barkingChartEmpty) {
        return;
    }

    let statusChartInstance = null;
    let barkingChartInstance = null;
    let latestStatusData = [];
    let latestBarkingData = [];

    const setButtonLoading = (button, isLoading, loadingText) => {
        if (!button) {
            return;
        }
        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = button.dataset.originalText || button.innerHTML;
            button.innerHTML = loadingText || '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang tải...';
        } else {
            button.disabled = false;
            const original = button.dataset.originalText;
            if (original) {
                button.innerHTML = original;
            }
        }
    };

    const showStatusLoading = () => {
        statusChartEmpty.textContent = "Đang tải dữ liệu...";
        statusChartEmpty.classList.remove("d-none", "alert-danger");
        statusChartEmpty.classList.add("alert-info");
        statusChartCanvas.classList.add("d-none");
    };

    const showBarkingLoading = () => {
        barkingChartEmpty.textContent = "Đang tải dữ liệu...";
        barkingChartEmpty.classList.remove("d-none", "alert-danger");
        barkingChartEmpty.classList.add("alert-info");
        barkingChartCanvas.classList.add("d-none");
    };

    const renderStatusChart = (data, errorMessage) => {
        const resetStatusMeta = () => {
            if (statusSummaryInfo) {
                statusSummaryInfo.innerHTML = "";
            }
            if (statusDownloadSelect) {
                statusDownloadSelect.innerHTML = '<option value="" disabled selected>Chọn trạng thái</option>';
            }
            latestStatusData = [];
        };

        if (errorMessage) {
            statusChartEmpty.textContent = errorMessage;
            statusChartEmpty.classList.remove("alert-info");
            statusChartEmpty.classList.add("alert-danger");
            statusChartEmpty.classList.remove("d-none");
            statusChartCanvas.classList.add("d-none");
            resetStatusMeta();
            if (statusChartInstance) {
                statusChartInstance.destroy();
                statusChartInstance = null;
            }
            return;
        }

        if (!Array.isArray(data) || !data.length) {
            statusChartEmpty.textContent = "Không có dữ liệu để hiển thị.";
            statusChartEmpty.classList.remove("alert-danger");
            statusChartEmpty.classList.add("alert-info");
            statusChartEmpty.classList.remove("d-none");
            statusChartCanvas.classList.add("d-none");
            resetStatusMeta();
            if (statusChartInstance) {
                statusChartInstance.destroy();
                statusChartInstance = null;
            }
            return;
        }

        const enrichedData = data.map(item => ({
            status: item.status,
            count: item.count ?? 0,
            statusName: item.statusName ?? STATUS_TEXT[item.status] ?? item.status
        }));

        latestStatusData = enrichedData;

        if (statusDownloadSelect) {
            const currentValue = statusDownloadSelect.value;
            statusDownloadSelect.innerHTML = '<option value="" disabled selected>Chọn trạng thái</option>';
            enrichedData.forEach(item => {
                const option = document.createElement("option");
                option.value = item.status;
                option.textContent = `${item.status} - ${item.statusName}`;
                statusDownloadSelect.appendChild(option);
            });
            if (currentValue && enrichedData.some(item => `${item.status}` === currentValue)) {
                statusDownloadSelect.value = currentValue;
            }
        }

        if (statusSummaryInfo) {
            const total = enrichedData.reduce((sum, item) => sum + (item.count ?? 0), 0);
            const top = enrichedData.reduce((prev, current) => {
                if (!prev) {
                    return current;
                }
                return (current.count ?? 0) > (prev.count ?? 0) ? current : prev;
            }, null);
            const topLabel = top ? `${top.status} - ${top.statusName}` : "Không xác định";
            const topCount = top?.count ?? 0;
            statusSummaryInfo.innerHTML = `
                <div class="alert alert-secondary mb-0 small">
                    <div><strong>Tổng số SN:</strong> ${total}</div>
                    <div><strong>Trạng thái nhiều SN nhất:</strong> ${topLabel} (${topCount})</div>
                </div>
            `;
        }

        const labels = enrichedData.map(item => `${item.status} - ${item.statusName}`);
        const values = enrichedData.map(item => item.count);
        const statusDetails = enrichedData.map(item => ({
            status: item.status,
            statusName: item.statusName
        }));

        if (statusChartInstance) {
            statusChartInstance.destroy();
        }

        statusChartInstance = new Chart(statusChartCanvas, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Số lượng SN",
                    data: values,
                    backgroundColor: "rgba(54, 162, 235, 0.6)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    borderWidth: 1,
                    statusDetails
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                        labels: {
                            color: AXIS_TICK_COLOR
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: (tooltipItems) => {
                                if (!tooltipItems || !tooltipItems.length) {
                                    return "";
                                }

                                const item = tooltipItems[0];
                                const detail = statusDetails[item.dataIndex];
                                if (detail && detail.statusName) {
                                    return `${detail.status} - ${detail.statusName}`;
                                }
                                return item.label ?? "";
                            },
                            label: context => `Số lượng: ${context.parsed.y ?? context.parsed}`
                        }
                    },
                    statusValueLabels: {
                        display: true,
                        color: "#0d6efd",
                        font: {
                            size: 11,
                            weight: "600",
                            lineHeight: 14
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            autoSkip: false,
                            maxRotation: 45,
                            minRotation: 0,
                            color: AXIS_TICK_COLOR
                        },
                        grid: {
                            color: GRID_LINE_COLOR
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "Số lượng",
                            color: AXIS_TICK_COLOR
                        },
                        ticks: {
                            color: AXIS_TICK_COLOR
                        },
                        grid: {
                            color: GRID_LINE_COLOR
                        }
                    }
                }
            },
            plugins: [statusValueLabelsPlugin]
        });

        statusChartCanvas.classList.remove("d-none");
        statusChartEmpty.classList.add("d-none");
    };

    const renderBarkingChart = (data, errorMessage) => {
        const resetBarkingMeta = () => {
            if (barkingSummary) {
                barkingSummary.innerHTML = "";
            }
            latestBarkingData = [];
        };

        if (errorMessage) {
            barkingChartEmpty.textContent = errorMessage;
            barkingChartEmpty.classList.remove("alert-info");
            barkingChartEmpty.classList.add("alert-danger");
            barkingChartEmpty.classList.remove("d-none");
            barkingChartCanvas.classList.add("d-none");
            resetBarkingMeta();
            if (barkingChartInstance) {
                barkingChartInstance.destroy();
                barkingChartInstance = null;
            }
            return;
        }

        if (!data.length) {
            barkingChartEmpty.textContent = "Không có SN nào ở trạng thái 11.";
            barkingChartEmpty.classList.remove("alert-danger");
            barkingChartEmpty.classList.add("alert-info");
            barkingChartEmpty.classList.remove("d-none");
            barkingChartCanvas.classList.add("d-none");
            resetBarkingMeta();
            if (barkingChartInstance) {
                barkingChartInstance.destroy();
                barkingChartInstance = null;
            }
            return;
        }

        const validData = data.filter(item => typeof item.hours === "number" && !Number.isNaN(item.hours));
        const missingCount = data.length - validData.length;

        if (!validData.length) {
            barkingChartEmpty.textContent = missingCount > 0
                ? "Không có dữ liệu giờ hợp lệ cho trạng thái 11. (Một số bản ghi thiếu Apply Time)"
                : "Không có dữ liệu giờ hợp lệ cho trạng thái 11.";
            barkingChartEmpty.classList.remove("alert-danger");
            barkingChartEmpty.classList.add("alert-info");
            barkingChartEmpty.classList.remove("d-none");
            barkingChartCanvas.classList.add("d-none");
            resetBarkingMeta();
            if (barkingChartInstance) {
                barkingChartInstance.destroy();
                barkingChartInstance = null;
            }
            return;
        }

        const labels = validData.map(item => item.sn ?? "");
        const values = validData.map(item => item.hours ?? 0);
        const tooltips = validData.map(item => {
            const applyTime = item.applyTime ? new Date(item.applyTime).toLocaleString() : "Không xác định";
            const hours = item.hours ?? 0;
            const minutes = typeof item.minutes === "number" && !Number.isNaN(item.minutes)
                ? item.minutes
                : Math.round(hours * 60);
            return `SN: ${item.sn}\nApply time: ${applyTime}\nSố giờ: ${Math.round(hours * 10) / 10}\n~ ${minutes} phút`;
        });

        if (missingCount > 0) {
            barkingChartEmpty.textContent = `${missingCount} SN không có Apply Time hợp lệ.`;
            barkingChartEmpty.classList.remove("d-none", "alert-danger", "alert-info");
            barkingChartEmpty.classList.add("alert-warning");
        } else {
            barkingChartEmpty.classList.add("d-none");
            barkingChartEmpty.classList.remove("alert-warning", "alert-danger");
            if (!barkingChartEmpty.classList.contains("alert-info")) {
                barkingChartEmpty.classList.add("alert-info");
            }
        }

        if (barkingChartInstance) {
            barkingChartInstance.destroy();
        }

        latestBarkingData = validData;
        if (barkingSummary) {
            const total = validData.length;
            const totalHours = validData.reduce((sum, item) => sum + (item.hours ?? 0), 0);
            const averageHours = total ? Math.round((totalHours / total) * 10) / 10 : 0;
            const longest = validData.reduce((prev, current) => (prev.hours ?? 0) > (current.hours ?? 0) ? prev : current, validData[0]);
            const shortest = validData.reduce((prev, current) => (prev.hours ?? Infinity) < (current.hours ?? Infinity) ? prev : current, validData[0]);
            const formatRecord = (record) => {
                if (!record) {
                    return "Không xác định";
                }
                const hours = record.hours ?? 0;
                const minutes = typeof record.minutes === "number" && !Number.isNaN(record.minutes)
                    ? record.minutes
                    : Math.round(hours * 60);
                return `${record.sn ?? "N/A"} (~${hours} giờ | ${minutes} phút)`;
            };
            const missingInfo = missingCount > 0 ? `<div><strong>Thiếu Apply Time:</strong> ${missingCount} SN</div>` : "";
            barkingSummary.innerHTML = `
                <div class="alert alert-secondary mb-0 small">
                    <div><strong>Tổng số SN:</strong> ${total}</div>
                    <div><strong>Thời gian trung bình:</strong> ${averageHours} giờ</div>
                    <div><strong>Chờ lâu nhất:</strong> ${formatRecord(longest)}</div>
                    <div><strong>Chờ ít nhất:</strong> ${formatRecord(shortest)}</div>
                    ${missingInfo}
                </div>
            `;
        }

        barkingChartInstance = new Chart(barkingChartCanvas, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Số giờ kể từ khi Barking",
                    data: values,
                    backgroundColor: "rgba(255, 159, 64, 0.6)",
                    borderColor: "rgba(255, 159, 64, 1)",
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "Số giờ",
                            color: AXIS_TICK_COLOR
                        },
                        ticks: {
                            color: AXIS_TICK_COLOR
                        },
                        grid: {
                            color: GRID_LINE_COLOR
                        }
                    },
                    y: {
                        ticks: {
                            autoSkip: false,
                            color: AXIS_TICK_COLOR
                        },
                        grid: {
                            color: GRID_LINE_COLOR
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false,
                        labels: {
                            color: AXIS_TICK_COLOR
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: context => tooltips[context.dataIndex]
                        }
                    }
                }
            }
        });

        barkingChartCanvas.classList.remove("d-none");
        if (!barkingChartEmpty.classList.contains("alert-warning")) {
            barkingChartEmpty.classList.add("d-none");
        }
    };

    const loadStatusSummary = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/dashboard/status-summary`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Không thể tải biểu đồ trạng thái.");
            }
            if (!Array.isArray(data)) {
                throw new Error("Dữ liệu trả về không hợp lệ.");
            }
            renderStatusChart(data);
            return true;
        } catch (error) {
            renderStatusChart([], error.message);
            return false;
        }
    };

    const loadBarkingAging = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/dashboard/barking-aging`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Không thể tải dữ liệu Barking.");
            }
            if (!Array.isArray(data)) {
                throw new Error("Dữ liệu trả về không hợp lệ.");
            }
            renderBarkingChart(data);
            return true;
        } catch (error) {
            renderBarkingChart([], error.message);
            return false;
        }
    };

    const downloadCsv = (rows, headers, filename) => {
        if (!Array.isArray(rows) || !rows.length) {
            return;
        }

        const csv = [headers.join(",")]
            .concat(rows.map(row => headers.map(key => {
                const value = row[key] ?? "";
                const escaped = `${value}`.replace(/"/g, '""');
                return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
            }).join(",")))
            .join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    statusDownloadButton?.addEventListener("click", async () => {
        if (!statusDownloadSelect) {
            return;
        }

        const selectedValue = statusDownloadSelect.value;
        if (!selectedValue) {
            alert("Vui lòng chọn trạng thái cần tải.");
            return;
        }

        const statusNumber = parseInt(selectedValue, 10);
        if (Number.isNaN(statusNumber)) {
            alert("Trạng thái không hợp lệ.");
            return;
        }

        try {
            statusDownloadButton.disabled = true;
            statusDownloadButton.dataset.originalText = statusDownloadButton.dataset.originalText || statusDownloadButton.innerHTML;
            statusDownloadButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang tải...';

            const response = await fetch(`${API_BASE_URL}/status?status=${statusNumber}`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Không thể tải danh sách SN.");
            }

            const rows = data.map(item => ({
                SN: item.sn ?? item.SN ?? "",
                Status: `${item.status ?? item.applyTaskStatus ?? statusNumber}`,
                StatusName: item.statusName ?? STATUS_TEXT[item.status ?? item.applyTaskStatus] ?? "",
                InternalTask: item.internalTask ?? "",
                ApplyTime: item.applyTime ?? ""
            }));

            downloadCsv(rows, ["SN", "Status", "StatusName", "InternalTask", "ApplyTime"], `bga-status-${statusNumber}.csv`);
        } catch (error) {
            alert(error.message || "Không thể tải dữ liệu.");
        } finally {
            if (statusDownloadButton.dataset.originalText) {
                statusDownloadButton.innerHTML = statusDownloadButton.dataset.originalText;
            }
            statusDownloadButton.disabled = false;
        }
    });

    barkingDownloadButton?.addEventListener("click", () => {
        if (!latestBarkingData.length) {
            alert("Không có dữ liệu để tải.");
            return;
        }

        const rows = latestBarkingData.map(item => ({
            SN: item.sn ?? "",
            ApplyTime: item.applyTime ?? "",
            Hours: item.hours ?? "",
            Minutes: item.minutes ?? ""
        }));

        downloadCsv(rows, ["SN", "ApplyTime", "Hours", "Minutes"], "bga-barking-status-11.csv");
    });

    const refreshDashboard = async () => {
        showStatusLoading();
        showBarkingLoading();

        const [statusSuccess, barkingSuccess] = await Promise.all([
            loadStatusSummary(),
            loadBarkingAging()
        ]);

        if (dashboardLastUpdated) {
            const suffix = (!statusSuccess || !barkingSuccess) ? " (có lỗi)" : "";
            dashboardLastUpdated.textContent = `${new Date().toLocaleString()}${suffix}`;
        }
    };

    refreshDashboardButton?.addEventListener("click", async () => {
        setButtonLoading(refreshDashboardButton, true, "Đang tải...");
        await refreshDashboard();
        setButtonLoading(refreshDashboardButton, false);
    });

    refreshDashboard();
});
