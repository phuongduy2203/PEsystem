let selectedInternalTasks = new Set(); // Cho CREATE_TASK_FORM

const purposeLabels = {
    "0": "SPE approve to scrap",
    "1": "Scrap to quarterly",
    "2": "Approved to engineer sample",
    "3": "Approved to master board",
    "4": "Approved to BGA"
};

const statusLabels = {
    0: "SPE đã duyệt - chờ xin task",
    1: "Đang xin task nội bộ",
    2: "Chờ SPE phê duyệt phế",
    3: "Đã approved thay BGA",
    4: "Chờ approved thay BGA",
    5: "Đã có task - chờ chuyển MRB",
    6: "Chờ kho MRB xác nhận",
    7: "MRB đã nhận bản phế",
    8: "Lỗi process - không thể sửa",
    10: "Đang tổng hợp dữ liệu"
};

function renderPurposeBadge(purpose) {
    if (!purpose && purpose !== 0) {
        return '<span class="badge bg-secondary">N/A</span>';
    }
    const label = purposeLabels[String(purpose)] || `Purpose ${purpose}`;
    return `<span class="badge bg-scrap" data-bs-toggle="tooltip" data-bs-title="${label}">${label}</span>`;
}

function renderStatusBadge(status) {
    if (status === undefined || status === null) {
        return '<span class="badge-status bg-progress">N/A</span>';
    }

    const numericStatus = Number(status);
    const label = statusLabels[numericStatus] || `Trạng thái ${numericStatus}`;
    let styleClass = "bg-progress";

    if ([5, 6, 7].includes(numericStatus)) {
        styleClass = "bg-success";
    } else if ([0, 1, 4, 10].includes(numericStatus)) {
        styleClass = "bg-wait";
    }

    return `<span class="badge-status ${styleClass}" data-bs-toggle="tooltip" data-bs-title="${label}">${numericStatus}</span>`;
}

function setResultMessage(containerId, html) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }

    const target = container.querySelector('[data-role="result-message"]');
    if (target) {
        target.innerHTML = html;
    } else {
        container.innerHTML = html;
    }
}

// Hàm ẩn tất cả form và khu vực kết quả
function hideAllElements() {
    const forms = ["input-sn-form", "custom-form", "custom-form-sn", "update-data-form"];
    const results = ["input-sn-result", "create-task-result", "create-task-result-sn", "update-data-result"];

    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) form.classList.add("hidden");
    });

    results.forEach(resultId => {
        const result = document.getElementById(resultId);
        if (result) {
            result.classList.add("hidden");
            const messageTarget = result.querySelector('[data-role="result-message"]');
            if (messageTarget) {
                messageTarget.innerHTML = "";
            }
        }
    });

    ["sn-input", "sn-input-update", "description-input", "NVmember-input", "speApproveTime-input", "task-input", "po-input", "cost-input", "file-input"].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = "";
    });

    const scrapOptions = document.getElementById("Scrap-options");
    if (scrapOptions) scrapOptions.selectedIndex = 0;
}

// Lấy tên người dùng hiện tại
function getCurrentUsername() {
    const usernameElement = document.querySelector(".d-none.d-md-block.ps-2");
    return usernameElement ? usernameElement.textContent.trim() : null;
}

// Xuất dữ liệu ra Excel
function exportToExcel(data, filename) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ScrapData");
    XLSX.writeFile(workbook, filename);
}

// Xử lý tạo task
async function processCreateTask(internalTasks, saveApplyStatus, resultDivId) {
    setResultMessage(resultDivId, `<div class="alert alert-info"><strong>Thông báo:</strong> Đang tải xuống dữ liệu...</div>`);

    const requestData = { internalTasks, saveApplyStatus };

    try {
        const response = await fetch("http://10.220.130.119:9090/api/Scrap/create-task", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();
        if (response.ok) {
            const excelData = result.data.map(item => ({
                InternalTask: item.internalTask ?? "N/A", 
                Item: item.item ?? "N/A",
                Project: item.project ?? "N/A",
                OPN: item.opn ?? "N/A",
                Purpose: item.purpose ?? "N/A",
                "IC PN": item.icPn ?? "N/A",
                "IC Detail PN": item.icDetailPn ?? "N/A",
                "Board SN": item.boardSN ?? "N/A",
                Qty: item.qty ?? "N/A",
                "After/Before Kanban": item.afterBeforeKanban ?? "N/A",
                Category: item.category ?? "N/A",
                CM: item.cm ?? "N/A",
                Plant: item.plant ?? "N/A",
                Sloc: item.sloc ?? "N/A",
                "Task Number": item.taskNumber ?? "N/A",
                "PO Number": item.poNumber ?? "N/A",
                "Create By": item.createBy ?? "N/A",
                "Create Date": item.createDate ?? "N/A",
                Cost: item.cost ?? "N/A",
                Remark: item.smtTime ?? "N/A",
                Description: item.description ?? "N/A",
                SpeApproveTime: item.speApproveTime ?? "N/A"
            }));

            // Sắp xếp dữ liệu theo InternalTask
            excelData.sort((a, b) => a.InternalTask.localeCompare(b.InternalTask));

            // Filter data into Before and After based on "After/Before Kanban"
            const beforeData = excelData.filter(item => item["After/Before Kanban"] === "Before");
            const afterData = excelData.filter(item => item["After/Before Kanban"] === "After");

            // Create workbook and append two sheets
            const workbook = XLSX.utils.book_new();
            if (beforeData.length > 0) {
                const beforeWorksheet = XLSX.utils.json_to_sheet(beforeData);
                XLSX.utils.book_append_sheet(workbook, beforeWorksheet, "BeforeKanban");
            }
            if (afterData.length > 0) {
                const afterWorksheet = XLSX.utils.json_to_sheet(afterData);
                XLSX.utils.book_append_sheet(workbook, afterWorksheet, "AfterKanban");
            }

            // Generate filename with timestamp
            const now = new Date();
            const filename = `ScrapData_${now.toISOString().replace(/[:.]/g, '-')}.xlsx`;

            // Write the workbook to file
            XLSX.writeFile(workbook, filename);
            setTimeout(() => location.reload(), 1000);
        } else {
            setResultMessage(resultDivId, `<div class="alert alert-danger"><strong>Lỗi:</strong> ${result.message}</div>`);
        }
    } catch (error) {
        setResultMessage(resultDivId, `<div class="alert alert-danger"><strong>Lỗi:</strong> Không thể kết nối đến API. Vui lòng kiểm tra lại.</div>`);
        console.error("Error:", error);
    }
}

// Xử lý tạo task bằng SN
async function processCreateTaskBySN(sNs, saveApplyStatus, resultDivId) {
    setResultMessage(resultDivId, `<div class="alert alert-info"><strong>Thông báo:</strong> Đang tải xuống dữ liệu...</div>`);

    const requestData = { sNs, saveApplyStatus };

    try {
        const response = await fetch("http://10.220.130.119:9090/api/Scrap/create-task-sn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();
        if (response.ok) {
            const excelData = result.data.map(item => ({
                InternalTask: item.internalTask ?? "N/A", 
                Item: item.item ?? "N/A",
                Project: item.project ?? "N/A",
                OPN: item.opn ?? "N/A",
                Purpose: item.purpose ?? "N/A",
                "IC PN": item.icPn ?? "N/A",
                "IC Detail PN": item.icDetailPn ?? "N/A",
                "Board SN": item.boardSN ?? "N/A",
                Qty: item.qty ?? "N/A",
                "After/Before Kanban": item.afterBeforeKanban ?? "N/A",
                Category: item.category ?? "N/A",
                CM: item.cm ?? "N/A",
                Plant: item.plant ?? "N/A",
                Sloc: item.sloc ?? "N/A",
                "Task Number": item.taskNumber ?? "N/A",
                "PO Number": item.poNumber ?? "N/A",
                "Create By": item.createBy ?? "N/A",
                "Create Date": item.createDate ?? "N/A",
                Cost: item.cost ?? "N/A",
                Remark: item.smtTime ?? "N/A",
                Description: item.description ?? "N/A",
                SpeApproveTime: item.speApproveTime ?? "N/A"
            }));

            // Sắp xếp dữ liệu theo InternalTask
            excelData.sort((a, b) => a.InternalTask.localeCompare(b.InternalTask));

            // Filter data into Before and After based on "After/Before Kanban"
            const beforeData = excelData.filter(item => item["After/Before Kanban"] === "Before");
            const afterData = excelData.filter(item => item["After/Before Kanban"] === "After");

            // Create workbook and append two sheets
            const workbook = XLSX.utils.book_new();
            if (beforeData.length > 0) {
                const beforeWorksheet = XLSX.utils.json_to_sheet(beforeData);
                XLSX.utils.book_append_sheet(workbook, beforeWorksheet, "BeforeKanban");
            }
            if (afterData.length > 0) {
                const afterWorksheet = XLSX.utils.json_to_sheet(afterData);
                XLSX.utils.book_append_sheet(workbook, afterWorksheet, "AfterKanban");
            }

            // Generate filename with timestamp
            const now = new Date();
            const filename = `ScrapData_${now.toISOString().replace(/[:.]/g, '-')}.xlsx`;

            // Write the workbook to file
            XLSX.writeFile(workbook, filename);
            setTimeout(() => location.reload(), 1000);
        } else {
            setResultMessage(resultDivId, `<div class="alert alert-danger"><strong>Lỗi:</strong> ${result.message}</div>`);
        }
    } catch (error) {
        setResultMessage(resultDivId, `<div class="alert alert-danger"><strong>Lỗi:</strong> Không thể kết nối đến API. Vui lòng kiểm tra lại.</div>`);
        console.error("Error:", error);
    }
}

// Hiển thị bảng với DataTables
function renderTableWithDataTable(data, tableId, checkboxName, selectAllId) {
    const table = document.getElementById(tableId);
    if (!table) {
        return;
    }

    const container = table.closest('.scrap-card');
    const containerId = container ? container.id : null;
    const tableBody = table.querySelector('tbody');
    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";
    if (!data || data.length === 0) {
        if (containerId) {
            setResultMessage(containerId, '<div class="alert alert-warning">Không tìm thấy Internal Task hợp lệ trong 3 tháng gần nhất.</div>');
        }
        return;
    }

    if (containerId) {
        setResultMessage(containerId, "");
    }

    data.forEach(item => {
        const isChecked = selectedInternalTasks.has(item.internalTask) ? 'checked' : '';
        const purposeBadge = renderPurposeBadge(item.purpose);
        const statusBadge = renderStatusBadge(item.applyTaskStatus);
        const totalQtyDisplay = typeof item.totalQty === 'number'
            ? item.totalQty.toLocaleString('en-US')
            : (item.totalQty || 'N/A');

        const row = `
            <tr>
                <td class="checkbox-column"><input type="checkbox" name="${checkboxName}" value="${item.internalTask}" ${isChecked}></td>
                <td data-bs-toggle="tooltip" data-bs-title="${item.internalTask || 'N/A'}">${item.internalTask || 'N/A'}</td>
                <td data-bs-toggle="tooltip" data-bs-title="${item.description || 'N/A'}">${item.description || 'N/A'}</td>
                <td>${purposeBadge}</td>
                <td data-bs-toggle="tooltip" data-bs-title="${item.approveScrapPerson || 'N/A'}">${item.approveScrapPerson || 'N/A'}</td>
                <td data-bs-toggle="tooltip" data-bs-title="${item.kanBanStatus || 'N/A'}">${item.kanBanStatus || 'N/A'}</td>
                <td data-bs-toggle="tooltip" data-bs-title="${item.category || 'N/A'}">${item.category || 'N/A'}</td>
                <td data-bs-toggle="tooltip" data-bs-title="${item.remark || 'N/A'}">${item.remark || 'N/A'}</td>
                <td data-bs-toggle="tooltip" data-bs-title="${item.createTime || 'N/A'}">${item.createTime || 'N/A'}</td>
                <td data-bs-toggle="tooltip" data-bs-title="${item.createBy || 'N/A'}">${item.createBy || 'N/A'}</td>
                <td>${statusBadge}</td>
                <td data-bs-toggle="tooltip" data-bs-title="${totalQtyDisplay}">${totalQtyDisplay}</td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });

    const dataTable = $(`#${tableId}`).DataTable({
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        order: [],
        columnDefs: [
            { orderable: false, targets: 0 },
            { width: "40px", targets: 0 },
            { width: "220px", targets: [1, 2] },
            { width: "180px", targets: [4, 5, 6, 7] }
        ],
        language: {
            search: "Tìm kiếm:",
            lengthMenu: "Hiển thị _MENU_ dòng mỗi trang",
            info: "Hiển thị _START_ đến _END_ của _TOTAL_ dòng",
            paginate: {
                first: "Đầu",
                last: "Cuối",
                next: "Tiếp",
                previous: "Trước"
            }
        },
        destroy: true,
        drawCallback: function () {
            const tooltipTriggerList = document.querySelectorAll(`#${tableId} [data-bs-toggle="tooltip"]`);
            tooltipTriggerList.forEach(tooltipTriggerEl => {
                new bootstrap.Tooltip(tooltipTriggerEl, {
                    placement: 'top',
                    trigger: 'hover'
                });
            });
        }
    });

    const selectAllCheckbox = document.getElementById(selectAllId);
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = data.length > 0 && data.every(item => selectedInternalTasks.has(item.internalTask));
        selectAllCheckbox.addEventListener("change", function () {
            const isChecked = this.checked;
            data.forEach(item => {
                if (isChecked) selectedInternalTasks.add(item.internalTask);
                else selectedInternalTasks.delete(item.internalTask);
            });
            $(`input[name="${checkboxName}"]`).prop("checked", isChecked);
        });
    }

    $(document).off("change", `input[name="${checkboxName}"]`).on("change", `input[name="${checkboxName}"]`, function () {
        const internalTask = this.value;
        if (this.checked) selectedInternalTasks.add(internalTask);
        else selectedInternalTasks.delete(internalTask);
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = data.every(item => selectedInternalTasks.has(item.internalTask));
        }
    });
}


// Xử lý khi trang tải
document.addEventListener("DOMContentLoaded", function () {
    console.log("DOMContentLoaded triggered");
    hideAllElements();

    // Xử lý nút "NHẬP SN"
    document.getElementById("input-sn-btn").addEventListener("click", async function () {
        const snInput = document.getElementById("sn-input").value.trim();
        const description = document.getElementById("description-input").value.trim();
        const approveScrapPerson = document.getElementById("NVmember-input").value.trim();
        const purpose = document.getElementById("Scrap-options").value;
        const speApproveTime = document.getElementById("speApproveTime-input").value;
        const currentUsername = getCurrentUsername();

        if (!currentUsername) {
            alert("Không thể lấy tên người dùng hiện tại.");
            return;
        }

        const sNs = snInput.split(/\r?\n/).map(sn => sn.trim()).filter(sn => sn);
        if (!sNs.length) {
            alert("Vui lòng nhập ít nhất một Serial Number hợp lệ.");
            return;
        }
        if (!description) {
            alert("Vui lòng nhập mô tả.");
            return;
        }
        if (!approveScrapPerson) {
            alert("Vui lòng nhập tên người phê duyệt.");
            return;
        }
        if (!["0", "1", "2", "3", "4"].includes(purpose)) {
            alert("Vui lòng chọn loại scrap.");
            return;
        }

        if (!speApproveTime) {
            alert("Vui lòng nhập thời gian NV phê duyệt.");
            return;
        }

        const resultContainerId = "input-sn-result";
        setResultMessage(resultContainerId, `<div class="alert alert-info"><strong>Thông báo:</strong> Đang chờ xử lý...</div>`);

        try {
            const requestData = { sNs, createdBy: currentUsername, description, approveScrapPerson, purpose, speApproveTime };
            const inputSnResponse = await fetch("http://10.220.130.119:9090/api/Scrap/input-sn", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData)
            });

            const inputSnResult = await inputSnResponse.json();
            if (inputSnResponse.ok) {
                // Gọi API UpdateScrap nếu input-sn thành công
                let scrapStatus;
                switch (purpose) {
                    case "0": scrapStatus = "SPE approve to scrap"; break;
                    case "1": scrapStatus = "Scrap to quarterly"; break;
                    case "2": scrapStatus = "Approved to engineer sample"; break;
                    case "3": scrapStatus = "Approved to master board"; break;
                    case "4": scrapStatus = "SPE approve to BGA"; break;
                    default: scrapStatus = "Unknown"; break;
                }

                const updateProductRequest = { serialNumbers: sNs, scrapStatus };
                const updateProductResponse = await fetch("http://10.220.130.119:9090/api/Product/UpdateScrap", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updateProductRequest)
                });

                const updateProductResult = await updateProductResponse.json();
                const feedbackHtml = updateProductResponse.ok && updateProductResult.success
                    ? `<div class="alert alert-success"><strong>${inputSnResult.message}</strong><br>Internal Task: ${inputSnResult.internalTask}<br>Update Product: ${updateProductResult.message}</div>`
                    : `<div class="alert alert-warning"><strong>${inputSnResult.message}</strong><br>Internal Task: ${inputSnResult.internalTask}<br><strong>Lỗi khi cập nhật Product:</strong> ${updateProductResult.message || "Không có thông tin lỗi"}</div>`;
                setResultMessage(resultContainerId, feedbackHtml);
            } else {
                setResultMessage(resultContainerId, `<div class="alert alert-danger"><strong>Lỗi:</strong> ${inputSnResult.message}</div>`);
            }
        } catch (error) {
            setResultMessage(resultContainerId, `<div class="alert alert-danger"><strong>Lỗi:</strong> Không thể kết nối đến API. Vui lòng kiểm tra lại.</div>`);
            console.error("Error:", error);
        }
    });

    // Xử lý nút "Tạo Task"
    document.getElementById("create-task-btn").addEventListener("click", async function () {
        const selectedTasksArray = Array.from(selectedInternalTasks);
        if (selectedTasksArray.length === 0) {
            alert("Vui lòng chọn ít nhất một Internal Task.");
            return;
        }

        const modalHtml = `
            <div id="custom-modal" class="modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 1000;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: white; padding: 20px; border-radius: 5px; text-align: center;">
                    <p>Bạn có muốn lưu lại những InternalTask này vào list đã gửi cho khách hàng?</p>
                    <button id="modal-yes-btn" style="margin-right: 10px;">Có</button>
                    <button id="modal-no-btn">Không</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById("modal-yes-btn").addEventListener("click", async function () {
            document.getElementById("custom-modal").remove();
            await processCreateTask(selectedTasksArray, "1", "create-task-result");
            selectedInternalTasks.clear();
        });

        document.getElementById("modal-no-btn").addEventListener("click", async function () {
            document.getElementById("custom-modal").remove();
            await processCreateTask(selectedTasksArray, "0", "create-task-result");
            selectedInternalTasks.clear();
        });
    });

    // Xử lý nút "Tạo Task bằng SN"
    document.getElementById("create-task-btn-sn").addEventListener("click", async function () {
        const snInput = document.getElementById("create-task-btn-sn-box").value.trim();
        const sNs = snInput.split(/\r?\n/).map(sn => sn.trim()).filter(sn => sn);
        if (sNs.length === 0) {
            alert("Vui lòng nhập ít nhất một Serial Number hợp lệ.");
            return;
        }

        const modalHtml = `
            <div id="custom-modal" class="modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 1000;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: white; padding: 20px; border-radius: 5px; text-align: center;">
                    <p>Bạn có muốn lưu lại những InternalTask này vào list đã gửi cho khách hàng?</p>
                    <button id="modal-yes-btn" style="margin-right: 10px;">Có</button>
                    <button id="modal-no-btn">Không</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById("modal-yes-btn").addEventListener("click", async function () {
            document.getElementById("custom-modal").remove();
            await processCreateTaskBySN(sNs, "1", "create-task-result-sn");
        });

        document.getElementById("modal-no-btn").addEventListener("click", async function () {
            document.getElementById("custom-modal").remove();
            await processCreateTaskBySN(sNs, "0", "create-task-result-sn");
        });
    });

    // Xử lý nút "Cập nhật Task PO"
    document.getElementById("update-task-btn").addEventListener("click", async function () {
        const snInput = document.getElementById("sn-input-update").value.trim();
        const task = document.getElementById("task-input").value.trim();
        const po = document.getElementById("po-input").value.trim();
        const snList = snInput.split(/\r?\n/).map(sn => sn.trim()).filter(sn => sn);

        const updateResultContainer = "update-data-result";
        setResultMessage(updateResultContainer, `<div class="alert alert-info"><strong>Thông báo:</strong> Đang chờ xử lý...</div>`);

        if (!snList.length) {
            alert("Vui lòng nhập ít nhất một Serial Number hợp lệ.");
            return;
        }
        if (!task) {
            alert("Vui lòng nhập Task.");
            return;
        }
        if (!po) {
            alert("Vui lòng nhập PO.");
            return;
        }

        try {
            const updateTaskRequest = { snList, task, po };
            const updateResponse = await fetch("http://10.220.130.119:9090/api/Scrap/update-task-po", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateTaskRequest)
            });

            const updateResult = await updateResponse.json();
            if (updateResponse.ok) {
                setResultMessage(updateResultContainer, `<div class="alert alert-success"><strong>Thành công:</strong> ${updateResult.message}</div>`);
            } else {
                setResultMessage(updateResultContainer, `<div class="alert alert-warning"><strong>Lỗi khi cập nhật Task PO:</strong> ${updateResult.message}</div>`);
            }
        } catch (error) {
            setResultMessage(updateResultContainer, `<div class="alert alert-danger"><strong>Lỗi:</strong> Không thể kết nối đến API. Vui lòng kiểm tra lại.</div>`);
            console.error("Error:", error);
        }
    });

    // Xử lý nút "Cập nhật Chi phí"
    document.getElementById("update-cost-btn").addEventListener("click", async function () {
        const fileInput = document.getElementById("file-input");
        const updateResultContainer = "update-data-result";

        if (!fileInput.files || fileInput.files.length === 0) {
            alert("Vui lòng chọn một file Excel để tải lên.");
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = async function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (!jsonData || jsonData.length === 0) {
                    alert("File Excel không chứa dữ liệu.");
                    return;
                }

                const requiredColumns = ["Board SN", "Cost"];
                const columns = Object.keys(jsonData[0]);
                const missingColumns = requiredColumns.filter(col => !columns.includes(col));
                if (missingColumns.length > 0) {
                    alert(`File Excel thiếu các cột: ${missingColumns.join(", ")}.`);
                    return;
                }

                const boardSNs = [];
                const costs = [];
                jsonData.forEach(row => {
                    const boardSN = row["Board SN"] ? String(row["Board SN"]).trim() : null;
                    const cost = row["Cost"] != null ? Number(row["Cost"]) : null;
                    if (boardSN && cost != null) {
                        boardSNs.push(boardSN);
                        costs.push(cost);
                    }
                });

                if (boardSNs.length === 0 || costs.length === 0 || boardSNs.length !== costs.length) {
                    alert("Dữ liệu trong file Excel không hợp lệ. Vui lòng kiểm tra lại cột 'Board SN' và 'Cost'.");
                    return;
                }

                const requestData = { boardSNs, costs };
                setResultMessage(updateResultContainer, `<div class="alert alert-info"><strong>Thông báo:</strong> Đang chờ xử lý...</div>`);

                const response = await fetch("http://10.220.130.119:9090/api/Scrap/update-cost", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestData)
                });

                const result = await response.json();
                const messageHtml = response.ok
                    ? `<div class="alert alert-success"><strong>${result.message}</strong></div>`
                    : `<div class="alert alert-danger"><strong>Lỗi:</strong> ${result.message}</div>`;
                setResultMessage(updateResultContainer, messageHtml);
            } catch (error) {
                setResultMessage(updateResultContainer, `<div class="alert alert-danger"><strong>Lỗi:</strong> Không thể xử lý file Excel hoặc kết nối đến API.</div>`);
                console.error("Error:", error);
            }
        };

        reader.onerror = function () {
            alert("Không thể đọc file Excel. Vui lòng kiểm tra lại file.");
        };
        reader.readAsArrayBuffer(file);
    });

    // Xử lý thay đổi dropdown
    document.getElementById("search-options").addEventListener("change", async function () {
        console.log("Dropdown changed to:", this.value);
        hideAllElements();
        selectedInternalTasks.clear();
        const selectedValue = this.value;
        if (selectedValue === "INPUT_SN") {
            document.getElementById("input-sn-form").classList.remove("hidden");
            document.getElementById("input-sn-result").classList.remove("hidden");
        } else if (selectedValue === "CREATE_TASK_FORM") {
            document.getElementById("custom-form").classList.remove("hidden");
            document.getElementById("create-task-result").classList.remove("hidden");

            try {
                const response = await fetch("http://10.220.130.119:9090/api/Scrap/get-scrap-status-zero", {
                    method: "GET",
                    headers: { "Content-Type": "application/json" }
                });

                const result = await response.json();
                if (response.ok) {
                    const sortedData = result.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
                    renderTableWithDataTable(sortedData, "task-checkbox-table", "task-checkbox", "select-all");
                } else {
                    setResultMessage("create-task-result", `<div class="alert alert-danger"><strong>Lỗi:</strong> ${result.message}</div>`);
                }
            } catch (error) {
                setResultMessage("create-task-result", `<div class="alert alert-danger"><strong>Lỗi:</strong> Không thể kết nối đến API.</div>`);
                console.error("Error:", error);
            }
        } else if (selectedValue === "CREATE_TASK_FORM_SN") {
            document.getElementById("custom-form-sn").classList.remove("hidden");
            document.getElementById("create-task-result-sn").classList.remove("hidden");
        } else if (selectedValue === "UPDATE_DATA") {
            document.getElementById("update-data-form").classList.remove("hidden");
            document.getElementById("update-data-result").classList.remove("hidden");
        }
    });
});