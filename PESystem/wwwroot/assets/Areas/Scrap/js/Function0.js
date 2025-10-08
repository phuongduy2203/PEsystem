// Hàm để ẩn tất cả các form và khu vực kết quả
function hideAllElements() {
    const forms = ["input-sn-1-form", "custom-form"];
    const results = ["input-sn-1-result", "sn-wait-approve-result"];

    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) {
            form.classList.add("hidden");
        } else {
            console.warn(`Form with ID ${formId} not found.`);
        }
    });

    results.forEach(resultId => {
        const result = document.getElementById(resultId);
        if (result) {
            result.classList.add("hidden");
        } else {
            console.warn(`Result with ID ${resultId} not found.`);
        }
    });

    // Xóa giá trị của các trường nhập liệu khi ẩn form
    const snInput = document.getElementById("sn-input-1");
    const descriptionInput = document.getElementById("description-input-1");

    if (snInput) snInput.value = "";
    if (descriptionInput) descriptionInput.value = "";
}

// Ẩn tất cả các form và khu vực kết quả ngay lập tức khi trang tải
hideAllElements();

/** 🔥 Lấy currentUsername từ thẻ HTML */
function getCurrentUsername() {
    const usernameElement = document.querySelector(".d-none.d-md-block.ps-2");
    return usernameElement ? usernameElement.textContent.trim() : null;
}

// Hàm hiển thị bảng với phân trang
function displayTableWithPagination(data, resultDiv, itemsPerPage = 10) {
    if (!data || data.length === 0) {
        resultDiv.innerHTML = `
            <div class="alert alert-warning">
                <strong>Cảnh báo:</strong> Không tìm thấy dữ liệu với ApplyTaskStatus = 8.
            </div>
        `;
        return;
    }

    // Tính toán phân trang
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    let currentPage = 1;

    // Hàm hiển thị dữ liệu cho trang hiện tại
    function renderPage(page) {
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageData = data.slice(start, end);

        let tableHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>SERIAL_NUMBER</th>
                            <th>DESCRIPTION</th>
                            <th>CREATE_TIME</th>
                            <th>APPLY_TASK_STATUS</th>
                            <th>CREATE_BY</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Thêm dữ liệu vào bảng
        pageData.forEach(item => {
            tableHTML += `
                <tr>
                    <td>${item.sn || "N/A"}</td>
                    <td>${item.description || "N/A"}</td>
                    <td>${item.createTime || "N/A"}</td>
                    <td>${item.applyTaskStatus}</td>
                    <td>${item.createBy || "N/A"}</td>
                </tr>
            `;
        });

        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;

        // Thêm phân trang
        if (totalPages > 1) {
            tableHTML += `
                <div class="pagination">
                    <button id="prev-page" ${currentPage === 1 ? "disabled" : ""}>Previous</button>
                    <span>Page ${currentPage} of ${totalPages}</span>
                    <button id="next-page" ${currentPage === totalPages ? "disabled" : ""}>Next</button>
                </div>
            `;
        }

        resultDiv.innerHTML = tableHTML;

        // Gắn sự kiện cho nút Previous và Next
        if (totalPages > 1) {
            const prevBtn = document.getElementById("prev-page");
            const nextBtn = document.getElementById("next-page");
            prevBtn.addEventListener("click", () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderPage(currentPage);
                }
            });

            nextBtn.addEventListener("click", () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    renderPage(currentPage);
                }
            });
        }
    }

    // Hiển thị trang đầu tiên
    renderPage(currentPage);
}

// Hàm tải dữ liệu từ API và hiển thị
async function loadScrapStatusTwo(resultDiv) {
    resultDiv.innerHTML = `
        <div class="alert alert-info">
            <strong>Thông báo:</strong> Đang tải danh sách SN lỗi process không thể sửa chữa...
        </div>
    `;

    try {
        const response = await fetch("http://10.220.130.119:9090/api/Scrap/get-scrap-status-eight", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();

        if (response.ok) {
            displayTableWithPagination(result, resultDiv);
        } else {
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Lỗi:</strong> ${result.message || 'Không thể tải dữ liệu.'}
                </div>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="alert alert-danger">
                <strong>Lỗi:</strong> Không thể kết nối đến API. Vui lòng kiểm tra lại.
            </div>
        `;
        console.error("Error:", error);
    }
}

// Hàm tải file Excel (giả sử thư viện XLSX đã được load)
function downloadExcel(data) {
    const worksheetData = data.map(item => ({
        SERIAL_NUMBER: item.sn || "N/A",
        DESCRIPTION: item.description || "N/A",
        CREATE_TIME: item.createTime || "N/A",
        APPLY_TASK_STATUS: item.applyTaskStatus,
        CREATE_BY: item.createBy || "N/A"
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SN_PROCESS_CANT_REPAIR");
    XLSX.writeFile(workbook, "SN_PROCESS_CANT_REPAIR.xlsx");
}

// Xử lý sự kiện khi trang tải lần đầu
document.addEventListener("DOMContentLoaded", function () {
    // Xử lý sự kiện thay đổi dropdown chức năng
    const searchOptions = document.getElementById("search-options");
    if (searchOptions) {
        searchOptions.addEventListener("change", function () {
            const selectedValue = this.value;
            hideAllElements(); // Ẩn tất cả trước khi hiển thị mới

            if (selectedValue === "INPUT_SN_1") {
                // Hiển thị form input SN
                const inputForm = document.getElementById("input-sn-1-form");
                const resultDiv = document.getElementById("input-sn-1-result");
                if (inputForm) inputForm.classList.remove("hidden");
                if (resultDiv) resultDiv.classList.remove("hidden");
            } else if (selectedValue === "SN_PROCESS_CANT_REPAIR") {
                // Hiển thị form SN Process và tải dữ liệu
                const customForm = document.getElementById("custom-form");
                const resultDiv = document.getElementById("sn-wait-approve-result");
                if (customForm) customForm.classList.remove("hidden");
                if (resultDiv) {
                    resultDiv.classList.remove("hidden");
                    loadScrapStatusTwo(resultDiv);
                }
            }
        });
    }

    // Xử lý sự kiện khi nhấn nút "INPUT SN"
    const inputSnBtn = document.getElementById("input-sn-btn");
    if (inputSnBtn) {
        inputSnBtn.addEventListener("click", async function () {
            const resultDiv = document.getElementById("input-sn-1-result");
            if (!resultDiv) return;

            // Lấy danh sách SN từ textarea
            const snInput = document.getElementById("sn-input-1");
            if (!snInput) return;
            const snInputValue = snInput.value.trim();
            const sNs = snInputValue.split(/\r?\n/).map(sn => sn.trim()).filter(sn => sn);

            // Lấy mô tả từ input
            const descriptionInput = document.getElementById("description-input-1");
            if (!descriptionInput) return;
            const description = descriptionInput.value.trim();

            // Lấy thông tin người dùng hiện tại
            const createdBy = getCurrentUsername();

            // Kiểm tra dữ liệu đầu vào
            if (!sNs.length) {
                resultDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <strong>Cảnh báo:</strong> Vui lòng nhập ít nhất một Serial Number hợp lệ!
                    </div>
                `;
                return;
            }

            if (!createdBy) {
                resultDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <strong>Cảnh báo:</strong> Không thể lấy thông tin người dùng. Vui lòng đăng nhập lại.
                    </div>
                `;
                return;
            }

            // Hiển thị thông báo "đang xử lý"
            resultDiv.innerHTML = `
                <div class="alert alert-info">
                    <strong>Thông báo:</strong> Đang lưu danh sách SN...
                </div>
            `;

            try {
                // Gọi API process-can-not-repair
                const requestData = {
                    SNs: sNs,
                    Description: description,
                    CreatedBy: createdBy
                };

                const inputSnResponse = await fetch("http://10.220.130.119:9090/api/Scrap/process-can-not-repair", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(requestData)
                });

                const inputSnResult = await inputSnResponse.json();

                if (inputSnResponse.ok) {
                    // Nếu cần gọi API UpdateScrap, thêm ở đây. Hiện tại, bỏ qua để tránh lỗi nếu API không tồn tại.

                    const updateResponse = await fetch("http://10.220.130.119:9090/api/Product/UpdateScrap", {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            serialNumbers: sNs,
                            scrapStatus: "Process can't repair"
                        })
                    });

                    const updateResult = await updateResponse.json();

                    if (updateResponse.ok) {
                        // Cả hai thành công
                        resultDiv.innerHTML = `
                            <div class="alert alert-success">
                                <strong>Thành công:</strong> ${inputSnResult.message}
                            </div>
                        `;
                    } else {
                        console.warn("UpdateScrap API failed:", updateResult);
                        resultDiv.innerHTML = `
                            <div class="alert alert-warning">
                                <strong>Cảnh báo:</strong> Gọi API UpdateScrap thất bại: ${updateResult.message || 'Lỗi không xác định'}
                            </div>
                        `;
                    }

                    // Chỉ process-can-not-repair thành công
                    resultDiv.innerHTML = `
                        <div class="alert alert-success">
                            <strong>Thành công:</strong> ${inputSnResult.message}
                        </div>
                    `;
                } else {
                    console.warn("process-can-not-repair API failed:", inputSnResult);
                    resultDiv.innerHTML = `
                        <div class="alert alert-warning">
                            <strong>Cảnh báo:</strong> Gọi API process-can-not-repair thất bại: ${inputSnResult.message || 'Lỗi không xác định'}
                        </div>
                    `;
                }
            } catch (error) {
                resultDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <strong>Lỗi:</strong> Không thể kết nối đến API. Vui lòng kiểm tra lại.
                    </div>
                `;
                console.error("Error:", error);
            }
        });
    }

    // Xử lý sự kiện khi nhấn nút "Download Excel" trong form SN_PROCESS_CANT_REPAIR
    const snWaitListBtn = document.getElementById("sn-wait-list-btn");
    if (snWaitListBtn) {
        snWaitListBtn.addEventListener("click", async function () {
            const resultDiv = document.getElementById("sn-wait-approve-result");
            if (!resultDiv) return;
            try {
                // Gọi API để lấy toàn bộ dữ liệu
                const response = await fetch("http://10.220.130.119:9090/api/Scrap/get-scrap-status-eight", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json"
                    }
                });

                const result = await response.json();

                if (response.ok && result && result.length > 0) {
                    // Tải file Excel
                    downloadExcel(result);
                } else {
                    resultDiv.innerHTML = `
                        <div class="alert alert-warning">
                            <strong>Cảnh báo:</strong> Không có dữ liệu để tải xuống.
                        </div>
                    `;
                }
            } catch (error) {
                resultDiv.innerHTML = `
                    <div class="alert alert-danger">
                        <strong>Lỗi:</strong> Không thể tải dữ liệu để tạo file Excel.
                    </div>
                `;
                console.error("Error:", error);
            }
        });
    }
});