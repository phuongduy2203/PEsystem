const API_BASE_URL = "http://10.220.130.119:9090/api/bga-replace";
const statusOptions = {
    4: "Waiting approve replace BGA",
    10: "Check in barking",
    11: "Check out barking",
    12: "VI after barking",
    13: "Remove BGA, clean pad",
    14: "Check VI BGA pad",
    15: "Replace BGA",
    16: "Xray",
    17: "ICT, FT",
    3: "Replaced BGA ok",
};

document.addEventListener("DOMContentLoaded", () => {
    const currentStatusSelect = document.getElementById("current-status");
    const filterStatusSelect = document.getElementById("filter-status");
    const updateButton = document.getElementById("update-status-btn");
    const loadButton = document.getElementById("load-status-btn");
    const clearButton = document.getElementById("clear-result-btn");
    const statusResultDiv = document.getElementById("status-result");
    const statusFeedback = document.getElementById("status-feedback");
    const updateFeedback = document.getElementById("update-status-feedback");
    const xrayGroup = document.getElementById("xray-result-group");

    const statusChartCanvas = document.getElementById("status-chart");
    const statusChartEmpty = document.getElementById("status-chart-empty");
    const barkingChartCanvas = document.getElementById("barking-age-chart");
    const barkingChartEmpty = document.getElementById("barking-age-empty");
    const dashboardLastUpdated = document.getElementById("dashboard-last-updated");
    const refreshDashboardButton = document.getElementById("refresh-dashboard-btn");

    let statusChartInstance = null;
    let barkingChartInstance = null;

    if (!currentStatusSelect || !updateButton || !loadButton) {
        console.error("Thiếu phần tử giao diện cần thiết cho Replace BGA control.");
        return;
    }

    const toggleXrayGroup = () => {
        if (parseInt(currentStatusSelect.value, 10) === 16) {
            xrayGroup?.classList.remove("d-none");
        } else {
            xrayGroup?.classList.add("d-none");
            document.querySelectorAll('input[name="xray-result"]').forEach(radio => {
                radio.checked = false;
            });
        }
    };

    currentStatusSelect.addEventListener("change", toggleXrayGroup);
    toggleXrayGroup();

    clearButton?.addEventListener("click", () => {
        statusResultDiv.innerHTML = "";
        statusFeedback.classList.add("d-none");
        statusFeedback.textContent = "";
    });

    loadButton.addEventListener("click", async () => {
        const status = parseInt(filterStatusSelect.value, 10);
        statusFeedback.classList.add("d-none");
        statusFeedback.textContent = "";
        statusFeedback.classList.remove("alert-danger", "alert-success");
        statusResultDiv.innerHTML = "<p class=\"text-muted\">Đang tải dữ liệu...</p>";

        try {
            const response = await fetch(`${API_BASE_URL}/status?status=${status}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Không thể tải dữ liệu.");
            }

            if (!Array.isArray(data) || data.length === 0) {
                statusResultDiv.innerHTML = "<div class=\"alert alert-warning\">Không có dữ liệu cho trạng thái đã chọn.</div>";
                return;
            }

            const rows = data.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.sn || ""}</td>
                    <td>${item.taskNumber || ""}</td>
                    <td>${item.internalTask || ""}</td>
                    <td>${item.desc || ""}</td>
                    <td>${item.statusName || statusOptions[item.applyTaskStatus] || item.applyTaskStatus}</td>
                    <td>${item.findBoardStatus || ""}</td>
                    <td>${item.approveScrapperson || ""}</td>
                    <td>${item.applyTime ? new Date(item.applyTime).toLocaleString() : ""}</td>
                </tr>
            `).join("");

            statusResultDiv.innerHTML = `
                <table class="table table-bordered table-hover align-middle">
                    <thead class="table-light">
                        <tr>
                            <th>#</th>
                            <th>SN</th>
                            <th>Task Number</th>
                            <th>Internal Task</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th>Remark</th>
                            <th>Approve Person</th>
                            <th>Apply Time</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        } catch (error) {
            statusResultDiv.innerHTML = "";
            statusFeedback.classList.remove("d-none");
            statusFeedback.classList.add("alert-danger");
            statusFeedback.textContent = error.message;
        }
    });

    updateButton.addEventListener("click", async () => {
        const snInput = document.getElementById("sn-input");
        const remarkInput = document.getElementById("remark-input");
        const snRaw = snInput.value;
        const remark = remarkInput.value.trim();
        const currentStatus = parseInt(currentStatusSelect.value, 10);

        updateFeedback.classList.add("d-none");
        updateFeedback.textContent = "";
        updateFeedback.classList.remove("alert-success", "alert-danger");

        if (!snRaw.trim()) {
            showUpdateFeedback("Vui lòng nhập ít nhất một SN.", false);
            return;
        }

        if (!remark) {
            showUpdateFeedback("Remark không được để trống.", false);
            return;
        }

        if (remark.length > 50) {
            showUpdateFeedback("Remark tối đa 50 ký tự.", false);
            return;
        }

        const sns = snRaw.split(/[\s,;]+/).map(sn => sn.trim()).filter(sn => sn);
        if (!sns.length) {
            showUpdateFeedback("Danh sách SN không hợp lệ.", false);
            return;
        }

        const payload = {
            sns,
            currentStatus,
            remark
        };

        if (currentStatus === 16) {
            const xraySelection = document.querySelector('input[name="xray-result"]:checked');
            if (!xraySelection) {
                showUpdateFeedback("Vui lòng chọn kết quả Xray.", false);
                return;
            }
            payload.xrayResult = xraySelection.value;
        }

        try {
            setButtonLoading(updateButton, true);

            const response = await fetch(`${API_BASE_URL}/update-status`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) {
                const message = data.message || "Cập nhật trạng thái thất bại.";
                if (data.details && Array.isArray(data.details)) {
                    showUpdateFeedback(`${message} ${data.details.join("; ")}`, false);
                } else {
                    showUpdateFeedback(message, false);
                }
                return;
            }

            showUpdateFeedback(data.message || "Cập nhật thành công.", true);
            snInput.value = "";
            remarkInput.value = "";
            document.querySelectorAll('input[name="xray-result"]').forEach(radio => radio.checked = false);
            await refreshDashboard();
        } catch (error) {
            showUpdateFeedback(error.message || "Đã xảy ra lỗi khi cập nhật.", false);
        } finally {
            setButtonLoading(updateButton, false);
        }
    });

    refreshDashboardButton?.addEventListener("click", async () => {
        setButtonLoading(refreshDashboardButton, true, "Đang tải...");
        await refreshDashboard();
        setButtonLoading(refreshDashboardButton, false, '<i class="fas fa-sync-alt me-1"></i>Refresh');
    });

    refreshDashboard();

    function showUpdateFeedback(message, isSuccess) {
        updateFeedback.textContent = message;
        updateFeedback.classList.remove("d-none");
        updateFeedback.classList.toggle("alert-success", isSuccess);
        updateFeedback.classList.toggle("alert-danger", !isSuccess);
    }

    function setButtonLoading(button, isLoading, loadingText) {
        if (!button) {
            return;
        }
        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = button.dataset.originalText || button.innerHTML;
            button.innerHTML = loadingText || '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...';
        } else {
            button.disabled = false;
            const original = button.dataset.originalText;
            if (original) {
                button.innerHTML = original;
            }
        }
    }

    async function refreshDashboard() {
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
    }

    function showStatusLoading() {
        if (statusChartEmpty) {
            statusChartEmpty.textContent = "Đang tải dữ liệu...";
            statusChartEmpty.classList.remove("d-none", "alert-danger");
            statusChartEmpty.classList.add("alert-info");
        }
        statusChartCanvas?.classList.add("d-none");
    }

    function showBarkingLoading() {
        if (barkingChartEmpty) {
            barkingChartEmpty.textContent = "Đang tải dữ liệu...";
            barkingChartEmpty.classList.remove("d-none", "alert-danger");
            barkingChartEmpty.classList.add("alert-info");
        }
        barkingChartCanvas?.classList.add("d-none");
    }

    async function loadStatusSummary() {
        if (!statusChartCanvas || !statusChartEmpty || typeof Chart === "undefined") {
            return false;
        }

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
    }

    function renderStatusChart(data, errorMessage) {
        if (!statusChartCanvas || !statusChartEmpty || typeof Chart === "undefined") {
            return;
        }

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

        const labels = data.map(item => `${item.status} - ${item.statusName ?? statusOptions[item.status] ?? item.status}`);
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
    }

    async function loadBarkingAging() {
        if (!barkingChartCanvas || !barkingChartEmpty || typeof Chart === "undefined") {
            return false;
        }

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
    }

    function renderBarkingChart(data, errorMessage) {
        if (!barkingChartCanvas || !barkingChartEmpty || typeof Chart === "undefined") {
            return;
        }

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
            const message = missingCount > 0
                ? "Không có dữ liệu giờ hợp lệ cho trạng thái 11. (Một số bản ghi thiếu Apply Time)"
                : "Không có dữ liệu giờ hợp lệ cho trạng thái 11.";
            barkingChartEmpty.textContent = message;
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
            return `SN: ${item.sn}\nApply time: ${applyTime}\nSố giờ: ${Math.round((item.hours ?? 0) * 10) / 10}`;
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
                        ticks: {
                            autoSkip: false
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: context => {
                                const idx = context.dataIndex;
                                return tooltips[idx];
                            }
                        }
                    }
                }
            }
        });

        barkingChartCanvas.classList.remove("d-none");
        if (!barkingChartEmpty.classList.contains("alert-warning")) {
            barkingChartEmpty.classList.add("d-none");
        }
    }
});
