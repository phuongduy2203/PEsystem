const API_BASE_URL = "/api/bga-replace";
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
    18: "Replaced BGA ok"
};

document.addEventListener("DOMContentLoaded", () => {
    const statusChartCanvas = document.getElementById("status-chart");
    const statusChartEmpty = document.getElementById("status-chart-empty");
    const barkingChartCanvas = document.getElementById("barking-age-chart");
    const barkingChartEmpty = document.getElementById("barking-age-empty");
    const dashboardLastUpdated = document.getElementById("dashboard-last-updated");
    const refreshDashboardButton = document.getElementById("refresh-dashboard-btn");

    if (!statusChartCanvas || !statusChartEmpty || !barkingChartCanvas || !barkingChartEmpty) {
        return;
    }

    let statusChartInstance = null;
    let barkingChartInstance = null;

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
        if (errorMessage) {
            statusChartEmpty.textContent = errorMessage;
            statusChartEmpty.classList.remove("alert-info");
            statusChartEmpty.classList.add("alert-danger");
            statusChartEmpty.classList.remove("d-none");
            statusChartCanvas.classList.add("d-none");
            if (statusChartInstance) {
                statusChartInstance.destroy();
                statusChartInstance = null;
            }
            return;
        }

        if (!data.length) {
            statusChartEmpty.textContent = "Không có dữ liệu để hiển thị.";
            statusChartEmpty.classList.remove("alert-danger");
            statusChartEmpty.classList.add("alert-info");
            statusChartEmpty.classList.remove("d-none");
            statusChartCanvas.classList.add("d-none");
            if (statusChartInstance) {
                statusChartInstance.destroy();
                statusChartInstance = null;
            }
            return;
        }

        const labels = data.map(item => `${item.status} - ${item.statusName ?? STATUS_TEXT[item.status] ?? item.status}`);
        const values = data.map(item => item.count ?? 0);

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
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: context => `${context.parsed.y ?? context.parsed} SN`
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            autoSkip: false,
                            maxRotation: 45,
                            minRotation: 0
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "Số lượng"
                        }
                    }
                }
            }
        });

        statusChartCanvas.classList.remove("d-none");
        statusChartEmpty.classList.add("d-none");
    };

    const renderBarkingChart = (data, errorMessage) => {
        if (errorMessage) {
            barkingChartEmpty.textContent = errorMessage;
            barkingChartEmpty.classList.remove("alert-info");
            barkingChartEmpty.classList.add("alert-danger");
            barkingChartEmpty.classList.remove("d-none");
            barkingChartCanvas.classList.add("d-none");
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
                            text: "Số giờ"
                        }
                    },
                    y: {
                        ticks: { autoSkip: false }
                    }
                },
                plugins: {
                    legend: { display: false },
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
