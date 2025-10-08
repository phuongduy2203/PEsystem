// Module: ApiService - Quản lý tất cả các gọi API
const ApiService = (function () {
    const BASE_URL = 'http://10.220.130.119:9090/api';

    async function fetchAPI(endpoint, method, body = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, options);
            if (!response.ok) {
                throw new Error(`Lỗi API: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Lỗi khi gọi API ${endpoint}:`, error);
            throw error;
        }
    }

    async function uploadFile(endpoint, formData) {
        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                throw new Error(`Lỗi API: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Lỗi khi upload file ${endpoint}:`, error);
            throw error;
        }
    }

    return {
        searchFA: (payload) => fetchAPI('/SearchFA/search', 'POST', payload),
        searchHistory: (payload) => fetchAPI('/SearchFA/search-history-by-list', 'POST', payload),
        getFullName: (username) => fetchAPI(`/SearchFA/get-fullname?username=${username}`, 'GET'),
        getProductLines: () => fetchAPI('/FixGuide/GetProductLines', 'GET'),
        getCheckPoints: (payload) => fetchAPI('/FixGuide/GetCheckPoints', 'POST', payload),
        updateCheckPoint: (payload) => fetchAPI('/FixGuide/update-checkpoint', 'PUT', payload),
        uploadGuide: (formData) => uploadFile('/FixGuide/Upload', formData),
        repairStatus: (payload) => fetchAPI('/RepairStatus/repair-status', 'POST', payload),
        handOverStatus: (payload) => fetchAPI('/RepairStatus/hand-over-status', 'POST', payload),
        getLatestTester: (payload) => fetchAPI('/SearchFA/get-latest-tester', 'POST', payload)
    };
})();

// Module: DataTableManager - Quản lý DataTable
const DataTableManager = (function () {
    let snTable, repairHistoryTable, testerInfoTable;

    function initializeSnTable() {
        snTable = $('#sn-table').DataTable({
            dom: 't',
            paging: false,
            ordering: false,
            info: false,
            scrollX: true,
            scrollY: '600px', // Chiều cao tối đa của bảng
            scrollCollapse: true, // Tự động điều chỉnh chiều cao
            fixedColumns: {
                leftColumns: 1 // Ghim cột đầu tiên
            },
            columnDefs: [
                { width: '140px', targets: 0 }, // SERIAL_NUMBER
                { width: '140px', targets: 1 }, // PRODUCT_LINE
                { width: '100px', targets: 2 }, // MODEL_NAME
                { width: '100px', targets: 3 }, // WIP
                { width: '100px', targets: 4 }, // TEST_GROUP
                { width: '100px', targets: 5 }, // TEST_CODE
                { width: '140px', targets: 6 }, // ERROR_DESC
                { width: '100px', targets: 7 }, // PRE_STATUS
                { width: '100px', targets: 8 }, // STATUS
                { width: '140px', targets: 9 }, // DATE
                { width: '100px', targets: 10 }, // ID_NV
                { width: '160px', targets: 11 }, // CHECK_POINT
                { width: '80px', targets: 12 }, // HƯỚNG_DẪN
                { width: '80px', targets: 13 }, // SỬA_CHỮA
                { width: '80px', targets: 14 }, // LỊCH_SỬ
                { width: '80px', targets: 15 }  // KHÁC
            ]
        });
    }

    function initializeRepairHistoryTable() {
        repairHistoryTable = $('#repair-history-table').DataTable({
            paging: true,
            searching: true,
            ordering: false,
            info: false
        });
    }

    function initializeTesterInfoTable() {
        testerInfoTable = $('#tester-info-table').DataTable({
            paging: true,
            searching: true,
            ordering: false,
            info: false
        });
    }

    function addRowToSnTable(item, checkPointData, fullName) {
        const checkpointsArray = (checkPointData.success && checkPointData.checkPoints)
            ? Array.isArray(checkPointData.checkPoints?.$values)
                ? checkPointData.checkPoints.$values
                : (typeof checkPointData.checkPoints === 'string' ? [checkPointData.checkPoints] : [checkPointData.checkPoints.toString()])
            : [""];

        const encodedCheckpoints = encodeURIComponent(JSON.stringify(checkpointsArray));
        const encodedDetail = encodeURIComponent(checkpointsArray.detail || 'Không có thông tin chi tiết');

        snTable.row.add([
            item.seriaL_NUMBER.trim(),
            item.productLine || '',
            item.modeL_NAME || '',
            item.wiP_GROUP || '',
            item.tesT_GROUP || '',
            `<span title="${item.tesT_CODE || ''}">${truncateText(item.tesT_CODE, 20)}</span>`,
            `<span title="${item.datA1 || ''}">${truncateText(item.datA1, 20)}</span>`,
            item.datA12 || '',
            item.datA11 || '',
            `<span title="${item.datE3 || ''}">${item.datE3 || ''}</span>`,
            `<span title="${item.tester}">${fullName || item.tester || 'N/A'}</span>`,
            `<span title="${checkpointsArray.join(', ') || ''}">${checkpointsArray.join(', ') || ''}</span>`,
            `<button class="btn btn-info btn-sm view-detail" 
                    data-sn="${item.seriaL_NUMBER}" 
                    data-model="${item.modeL_NAME}" 
                    data-product-line="${item.productLine}" 
                    data-checkpoints="${encodedCheckpoints}" 
                    data-detail="${encodedDetail}">
                    Chi tiết
            </button>`,
            `<button class="btn btn-warning btn-sm save-repair-history" 
                    data-serial-number="${item.seriaL_NUMBER}">
                    Thêm
            </button>`,
            `<button class="btn btn-info btn-sm btn-repair-detail"j0 
                    data-serial-number="${item.seriaL_NUMBER}">
                    Chi tiết
            </button>`,
            `<button class="btn btn-success btn-delete">Xóa</button>`
        ]).draw(false);
    }

    function removeRow(rowElement, existingSNs) {
        const row = snTable.row(rowElement);
        const rowData = row.data();
        const snToRemove = rowData[0]?.trim();

        if (existingSNs.has(snToRemove)) {
            existingSNs.delete(snToRemove);
        }

        row.remove().draw();
    }

    function updateSnTable(serialNumbers, updatedData) {
        snTable.rows().every(function () {
            const rowData = this.data();
            const updatedRow = updatedData.data.find(item => item.seriaL_NUMBER.trim() === rowData[0]);

            if (updatedRow) {
                rowData[7] = updatedRow.datA12 || '';
                rowData[8] = updatedRow.datA11 || '';
                rowData[9] = updatedRow.datE3 || '';
                rowData[10] = updatedRow.tester || '';
                this.data(rowData).draw(false);
            }
        });
    }

    async function populateRepairHistoryTable(history) {
        repairHistoryTable.clear();

        const filteredHistory = history.filter(item => item.datA19 !== null);
        if (filteredHistory.length === 0) {
            showInfo("Không có lịch sử Repair!");
            return;
        }

        for (const item of filteredHistory) {
            let fullName = item.tester || 'N/A';
            try {
                const fullNameData = await ApiService.getFullName(item.tester);
                fullName = typeof fullNameData === 'object' ? (fullNameData?.fullName || item.tester) : (fullNameData || item.tester);
            } catch (error) {
                console.warn(`Không lấy được FullName cho tester ${item.tester}:`, error);
            }

            repairHistoryTable.row.add([
                item.seriaL_NUMBER || '',
                item.datA12 || '',
                item.datA11 || '',
                item.datE3 ? new Date(item.datE3).toLocaleString() : '',
                `<span title="${item.tester}">${fullName}</span>`,
                `<span title="${item.datA19 || ''}">${item.datA19 || ''}</span>`,
                `<span title="${item.datA17 || ''}">${item.datA17 || ''}</span>`
            ]);
        }

        repairHistoryTable.draw();
    }

    async function populateTesterInfoTable(data) {
        testerInfoTable.clear();

        for (const item of data) {
            let fullName = item.tester || 'N/A';
            try {
                const fullNameData = await ApiService.getFullName(item.tester);
                fullName = typeof fullNameData === 'object' ? (fullNameData?.fullName || item.tester) : (fullNameData || item.tester);
            } catch (error) {
                console.warn(`Không lấy được FullName cho tester ${item.tester}:`, error);
            }

            testerInfoTable.row.add([
                item.seriaL_NUMBER || '',
                item.tester || '',
                fullName
            ]);
        }

        testerInfoTable.draw();
    }

    function getAllSerialNumbers() {
        const serialNumbers = [];
        snTable.rows().every(function () {
            const rowData = this.data();
            serialNumbers.push(rowData[0].trim());
        });
        return serialNumbers;
    }

    function getRowData(serialNumber) {
        let rowData = null;
        snTable.rows().every(function () {
            const data = this.data();
            if (String(data[0]) === String(serialNumber)) {
                rowData = data;
                return false;
            }
        });
        return rowData;
    }

    function truncateText(text, maxLength) {
        if (text && text.length > maxLength) {
            return text.substring(0, maxLength) + "...";
        }
        return text || "";
    }

    return {
        initSnTable: initializeSnTable,
        initRepairHistoryTable: initializeRepairHistoryTable,
        initTesterInfoTable: initializeTesterInfoTable,
        addRowToSnTable,
        removeRow,
        updateSnTable,
        populateRepairHistoryTable,
        populateTesterInfoTable,
        getAllSerialNumbers,
        getRowData
    };
})();

// Module: FormHandler - Xử lý form và sự kiện nhập liệu
const FormHandler = (function () {
    let existingSNs = new Set();

    function setupEventListeners() {
        $('#sn-form').on('submit', handleFormSubmit);
        $('#sn-table tbody').on('click', '.btn-delete', handleRowDelete);
        $('#sn-table tbody').on('click', '.view-detail', ModalManager.handleViewDetail);
        $('#sn-table tbody').on('click', '.btn-repair-detail', RepairHistoryManager.handleRepairDetailClick);
        $('#sn-table tbody').on('click', '.save-repair-history', RepairHistoryManager.handleSaveRepairHistoryClick);
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const serialNumberInput = $('#serialNumberList').val().trim();

        if (!serialNumberInput) {
            showWarning('Vui lòng nhập Serial Number!');
            return;
        }

        const serialNumbers = serialNumberInput.split(/[\n,]+/).map(sn => sn.trim()).filter(sn => sn);
        if (serialNumbers.length === 0) {
            showWarning('Danh sách Serial Number không hợp lệ!');
            return;
        }

        const duplicates = serialNumbers.filter(sn => existingSNs.has(sn));
        if (duplicates.length > 0) {
            showWarning(`Các SN đã tồn tại: ${duplicates.join(', ')}`);
            return;
        }

        try {
            const data = await ApiService.searchFA({
                serialNumbers,
                modelName: "",
                testCode: "",
                status: "",
                data1: "",
                handoverStatus: ""
            });

            await processSerialNumberData(data, serialNumbers);
            $('#serialNumberList').val('');
        } catch (error) {
            showError("Lỗi khi gọi API!");
        }
    }

    async function processSerialNumberData(data, serialNumbers) {
        if (!data.data || data.data.length === 0) {
            showWarning('Không tìm thấy thông tin cho các Serial Number!');
            return;
        }

        for (const item of data.data) {
            const sn = item.seriaL_NUMBER?.trim() || '';
            if (sn === '' || existingSNs.has(sn)) continue;

            existingSNs.add(sn);

            const standardizedProductLine = standardizeProductLine(item.productLine);
            const checkPointsPayload = {
                productLine: standardizedProductLine,
                testCode: item.tesT_CODE || ''
            };

            let checkPointData = { checkPoints: "" };
            try {
                const apiResponse = await ApiService.getCheckPoints(checkPointsPayload);
                if (apiResponse?.success && apiResponse.checkPoints) {
                    checkPointData = apiResponse;
                }
            } catch (error) {
                console.warn(`Không tìm thấy CheckPoints cho SN ${sn}:`, error);
            }

            let fullName = item.tester || 'N/A';
            try {
                const fullNameData = await ApiService.getFullName(item.tester);
                fullName = typeof fullNameData === 'object' ? (fullNameData?.fullName || item.tester) : (fullNameData || item.tester);
            } catch (error) {
                console.warn(`Không lấy được FullName cho tester ${item.tester} của SN ${sn}:`, error);
            }

            DataTableManager.addRowToSnTable(item, checkPointData, fullName);
        }
    }

    function handleRowDelete() {
        DataTableManager.removeRow($(this).parents('tr'), existingSNs);
    }

    function standardizeProductLine(productLine) {
        return productLine ? productLine.replace(/\s|-/g, '').toUpperCase() : '';
    }

    return {
        setup: setupEventListeners
    };
})();

// Module: ModalManager - Quản lý hiển thị và tương tác với modal
const ModalManager = (function () {
    function showModal(modalId) {
        $(modalId).modal('show');
    }

    function hideModal(modalId) {
        $(modalId).modal('hide');
    }

    function handleViewDetail() {
        const serialNumber = $(this).data('sn');
        const modelName = $(this).data('model');
        const productLine = $(this).data('product-line');
        const checkpoints = JSON.parse(decodeURIComponent($(this).data('checkpoints')));
        const detail = decodeURIComponent($(this).data('detail'));

        const standardizedProductLine = productLine ? productLine.replace(/\s|-/g, '').toUpperCase() : '';

        $('#modal-sn').text(serialNumber);
        $('#modal-model').text(modelName);
        $('#modal-product-line').text(productLine);

        $('#modal-checkpoints').empty();
        checkpoints.forEach(cp => $('#modal-checkpoints').append(`<li>${cp}</li>`));
        $('#modal-repair-detail').text(detail);

        const pdfUrl = `/pdfs/product-lines/${standardizedProductLine}.pdf`;
        $('#modal-product-line-pdf').attr('src', pdfUrl).on('error', function () {
            $(this).attr('src', '/pdfs/product-lines/default.pdf');
        });

        showModal('#repairDetailModal');
    }

    return {
        showModal,
        hideModal,
        handleViewDetail
    };
})();

// Module: GuideManager - Quản lý chức năng thêm/sửa hướng dẫn sửa chữa
const GuideManager = (function () {
    function setupEventListeners() {
        $('#addGuideButton').on('click', handleAddGuide);
        $('#testCodeInput').on('blur', handleTestCodeBlur);
        $('#saveCheckPointButton').on('click', handleSaveCheckPoint);
        $('#templateButton').on('click', handleTemplateDownload);
        $('#uploadExcelButton').on('click', handleUploadExcel);
    }

    function handleAddGuide() {
        $('#productLineDropdown').empty();
        ApiService.getProductLines()
            .then(data => {
                data.productLines.forEach(productLine => {
                    $('#productLineDropdown').append(`<option value="${productLine}">${productLine}</option>`);
                });
            })
            .catch(() => showError('Lỗi khi lấy ProductLine'));
        ModalManager.showModal('#guideModal');
    }

    async function handleTestCodeBlur() {
        const productLine = $('#productLineDropdown').val();
        const testCode = $('#testCodeInput').val().trim();

        if (productLine && testCode) {
            try {
                const data = await ApiService.getCheckPoints({ productLine, testCode });
                $('#checkPointInput').val(data.checkPoints || 'Không tìm thấy CheckPoint trong database!, Vui lòng nhập CheckPoint mới.');
            } catch (error) {
                showError("Chưa có hướng dẫn");
            }
        }
    }

    async function handleSaveCheckPoint() {
        const productLine = $('#productLineDropdown').val();
        const testCode = $('#testCodeInput').val().trim();
        const checkPoint = $('#checkPointInput').val().trim();
        const employeeId = $('#analysisPerson').val();

        if (productLine && testCode && checkPoint) {
            const updateCheckPoint = `${checkPoint}.[${employeeId}]\n`;
            try {
                const data = await ApiService.updateCheckPoint({ productLine, testCode, check_Point: updateCheckPoint });
                if (data.success) {
                    showInfo(data.message);
                    $('#testCodeInput').val('');
                    $('#checkPointInput').val('');
                    ModalManager.hideModal('#guideModal');
                } else {
                    showError("Lỗi khi cập nhật CheckPoint!");
                }
            } catch (error) {
                showError('Lỗi khi gọi API');
            }
        } else {
            showWarning("Vui lòng điền đầy đủ thông tin!");
        }
    }

    async function handleTemplateDownload() {
        const templateButton = document.getElementById('templateButton');
        templateButton.disabled = true;
        templateButton.textContent = 'Đang tải...';

        try {
            const templateUrl = '/pdfs/file-excel/templateGuide.xlsx';
            const response = await fetch(templateUrl);
            if (!response.ok) {
                throw new Error('File không tồn tại trên server');
            }

            const link = document.createElement('a');
            link.href = templateUrl;
            link.download = 'templateGuide.xlsx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            showError('Không thể tải file template. Vui lòng liên hệ quản trị viên.');
        } finally {
            templateButton.disabled = false;
            templateButton.textContent = 'TEMPLATE';
        }
    }

    async function handleUploadExcel() {
        const file = $('#guideFileInput')[0].files[0];
        const productLine = $('#productLineDropdown').val();

        if (file && productLine) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('productLine', productLine);

            try {
                const data = await ApiService.uploadGuide(formData);
                if (data.success) {
                    showSuccess('Upload file thành công!');
                    ModalManager.hideModal('#guideModal');
                } else {
                    showError("Lỗi khi upload file!");
                }
            } catch (error) {
                showError('Lỗi kết nối API');
            }
        } else {
            showWarning('Vui lòng chọn ProductLine và file Excel');
        }
    }

    return {
        setup: setupEventListeners
    };
})();

// Module: StatusManager - Xử lý cập nhật trạng thái
const StatusManager = (function () {
    function setupEventListeners() {
        $('.btn-fa, .btn-retest, .btn-vi, .btn-thay-lieu, .btn-check-list').on('click', handleBulkStatusUpdate);
        $('#btn-retest-status-update').on('click', handleRetestStatusUpdate);
        $('#btn-vi-status-update').on('click', handleVIStatusUpdate);
        $('#btn-thaylieu-status-update').on('click', handleThayLieuStatusUpdate);
        $('#btn-check-list-status-update').on('click', handleCheckListStatusUpdate);
    }

    async function handleBulkStatusUpdate() {
        const serialNumbers = DataTableManager.getAllSerialNumbers();
        if (serialNumbers.length === 0) {
            showWarning('Không có SN để cập nhật trạng thái!');
            return;
        }
        if ($(this).hasClass('btn-vi')) {
            //Kiểm tra nút .btn-vi tồn tại trong DOM
            if (!$('.btn-vi').length) {
                showError('Không có quyền cập nhật trạng thái VI-RE!');
                return;
            }
            //const statusNe = 'VI-RE';
            let firstStatus = null;
            let allSameStatus = true;
            const validStatuses = ['VI-RE'];//Các trạng thái hợp lệ cho VI-RE

            const filteredSerialNumbers = [];
            DataTableManager.getAllSerialNumbers().forEach((sn) => {
                const data = DataTableManager.getRowData(sn);
                if (!firstStatus) {
                    firstStatus = data[8]; //Cot STATUS
                } else if (data[8] !== firstStatus) {
                    allSameStatus = false;
                }
                if (validStatuses.includes(data[8])) {
                    filteredSerialNumbers.push(data[0]);
                }
            });
            if (!allSameStatus) {
                showWarning('SN phải cùng STATUS!');
                return;
            }
            if (filteredSerialNumbers.length === 0) {
                showWarning('Không có SN VI-RE!');
                return;
            }
            ModalManager.showModal('#modal-vi');
            $('select-vi-status').val('');
            $('notes-vi').val('');
        }
        else if ($(this).hasClass('btn-retest')) {
            if (!$('.btn-retest')) {
                showError('Khong co quyen update Status RETEST!');
                return;
            }
            let firstStatus = null;
            let allSameStatus = true;
            const validStatuses = ['RETEST'];//Mang Status hop le cho RETEST
            const filteredSerialNumbers = [];

            DataTableManager.getAllSerialNumbers().forEach((sn) => {
                const data = DataTableManager.getRowData(sn);
                if (!firstStatus) {
                    firstStatus = data[8];//Cot Status
                } else if (data[8] !== firstStatus) {
                    allSameStatus = false;
                }
                if (validStatuses.includes(data[8])) {
                    filteredSerialNumbers.push(data[0]);
                }
            });
            if (!allSameStatus) {
                showWarning('SN phải cùng STATUS!');
                return;
            }
            if (filteredSerialNumbers.length === 0) {
                showWarning('Không có SN RETEST!');
                return;
            }
            ModalManager.showModal('#modal-retest');
            $('#select-retest-status').val('');
            $('#notes-retest').val('');
            $('#select-retest-result').val('');
        }
        else if ($(this).hasClass('btn-thay-lieu')) {
            let firstStatus = null;
            let allSameStatus = true;
            const validStatuses = ['THAY LIỆU'];
            const filteredSerialNumbers = [];
            DataTableManager.getAllSerialNumbers().forEach((sn) => {
                const data = DataTableManager.getRowData(sn);
                if (!firstStatus) {
                    firstStatus = data[8];
                } else if (data[8] != firstStatus) {
                    allSameStatus = false;
                }
                if (validStatuses.includes(data[8])) {
                    filteredSerialNumbers.push(data[0]);
                }
            });
            if (!allSameStatus) {
                showWarning('SN phải cùng STATUS!');
                return;
            }
            if (filteredSerialNumbers.length === 0) {
                showWarning('Không có SN THAY LIỆU!');
                return;
            }

           //$('#modal-sn-thay-lieu').text(serialNumbers.join(', '));
           
            ModalManager.showModal('#modal-thaylieu');
            $('select-thaylieu-status').val('');
            $('#notes-thaylieu').val('');
        }
        else if ($(this).hasClass('btn-check-list')) {
            let firstStatus = null;
            let allSameStatus = true;
            const validStatuses = ['CHECK_LIST'];
            const filteredSerialNumbers = [];
            DataTableManager.getAllSerialNumbers().forEach((sn) => {
                const data = DataTableManager.getRowData(sn);
                if (!firstStatus) {
                    firstStatus = data[8];
                } else if (data[8] !== firstStatus) {
                    allSameStatus = false;
                }
                if (validStatuses.includes(data[8])) {
                    filteredSerialNumbers.push(data[0]);
                }
            });
            if (!allSameStatus) {
                showWarning('');
                return;
            }
            if (filteredSerialNumbers.length === 0) {
                showWarning('Không có SN CHECK LIST!');
                return;
            }

            ModalManager.showModal('#modal-check-list');
            $('#status-select-check-list').val('');
            $('#notes-check-list').val('');
        }
        else if ($(this).hasClass('btn-fa')) {
            const statusNe = 'FA';
            let firstStatus = null;
            let allSameStatus = true;

            const filteredSerialNumbers = [];
            DataTableManager.getAllSerialNumbers().forEach((sn) => {
                const data = DataTableManager.getRowData(sn);
                if (!firstStatus) {
                    firstStatus = data[8];
                } else if (data[8] !== firstStatus) {
                    allSameStatus = false;
                }
                if (data[8] === 'FA' || data[8] === 'PROCESS') {
                    filteredSerialNumbers.push(data[0]);
                }
            });

            if (!allSameStatus) {
                showError("Các SN không cùng trạng thái!");
                return;
            }

            if (filteredSerialNumbers.length === 0) {
                showWarning(`Không có SN cập nhật trạng thái ${statusNe}!`);
                return;
            }

            prepareTypeModal(statusNe, $('#type-modal'), filteredSerialNumbers);
        }
    }

    async function handleRetestStatusUpdate() {
        const selectedStatus = $('#select-retest-status').val();
        const selectedTestResult = $('#select-retest-result').val();
        const remark = $('#notes-retest').val().trim();
        const empId = $('#analysisPerson').val();
        const serialNumbers = DataTableManager.getAllSerialNumbers();
        const notes = `KQ:${selectedTestResult}: ${remark}`;

        if (!selectedStatus || !selectedTestResult) {
            showWarning('Vui lòng chọn trạng thái và kết quả retest!');
            return;
        }

        const payload = {
            serialNumbers: serialNumbers.join(','),
            type: 'RETEST',
            status: selectedStatus,
            employeeId: empId || 'default_emp_id',
            tag: 'Confirm',
            notes: notes,
            handOverStatus: 'WAITING_HAND_OVER'
        };

        //const handoverPayload = {
        //    serialNumbers: serialNumbers.join(','),
        //    handOverStatus: 'WAITING_HAND_OVER',
        //    tag: 'Giao'
        //};

        try {
            const result = await ApiService.repairStatus(payload);
            const cleanMessage = result.message.replace(/"/g, '').trim();
            if (result.success && cleanMessage === "OK") {
                //await ApiService.handOverStatus(handoverPayload);
                showSuccess("Cập nhật trạng thái thành công!");
                ModalManager.hideModal('#modal-retest');
                const updatedData = await ApiService.searchFA({ serialNumbers });
                DataTableManager.updateSnTable(serialNumbers, updatedData);
            } else {
                showError("Lỗi khi cập nhật trạng thái!");
            }
        } catch (error) {
            showError("Lỗi khi gọi API!");
        }
    }

    async function handleVIStatusUpdate() {
        const selectedStatus = $('#select-vi-status').val();
        const notes = $('#notes-vi').val().trim();
        const empId = $('#analysisPerson').val();
        const serialNumbers = DataTableManager.getAllSerialNumbers();

        if (!selectedStatus) {
            showWarning('Vui lòng chọn trạng thái!');
            return;
        }

        const payload = {
            serialNumbers: serialNumbers.join(','),
            type: 'VI-RE',
            status: selectedStatus,
            employeeId: empId || 'default_emp_id',
            tag: 'Confirm',
            notes: notes,
            handOverStatus: 'WAITING_HAND_OVER'
        };

        //const handoverPayload = {
        //    serialNumbers: serialNumbers.join(','),
        //    handOverStatus: 'WAITING_HAND_OVER',
        //    tag: 'Giao'
        //};

        try {
            const result = await ApiService.repairStatus(payload);
            const cleanMessage = result.message.replace(/"/g, '').trim();
            if (result.success && cleanMessage === "OK") {
                //await ApiService.handOverStatus(handoverPayload);
                showSuccess("Cập nhật trạng thái thành công!");
                ModalManager.hideModal('#modal-vi');
                const updatedData = await ApiService.searchFA({ serialNumbers });
                DataTableManager.updateSnTable(serialNumbers, updatedData);
            } else {
                showError("Lỗi khi cập nhật trạng thái!");
            }
        } catch (error) {
            showError("Lỗi khi gọi API!");
        }
    }

    async function handleThayLieuStatusUpdate() {
        const selectedStatus = $('#select-thaylieu-status').val();
        const notes = $('#notes-thaylieu').val().trim();
        const empId = $('#analysisPerson').val();
        const serialNumbers = DataTableManager.getAllSerialNumbers();

        if (!selectedStatus) {
            showWarning('Vui lòng chọn trạng thái!');
            return;
        }
        const payload = {
            serialNumbers: serialNumbers.join(','),
            type: 'THAY LIỆU',
            status: selectedStatus,
            employeeId: empId,
            tag: 'Confirm',
            notes: notes,
            handOverStatus: 'WAITING_HAND_OVER'
        };

        //const handoverPayload = {
        //    serialNumbers: serialNumbers.join(','),
        //    handOverStatus: 'WAITING_HAND_OVER',
        //    tag: 'Giao'
        //};

        try {
            const result = await ApiService.repairStatus(payload);
            const cleanMessage = result.message.replace(/"/g, '').trim();
            if (result.success && cleanMessage === "OK") {
                //await ApiService.handOverStatus(handoverPayload);
                showSuccess("Cập nhật trạng thái thành công!");
                ModalManager.hideModal('#modal-thaylieu');
                const updatedData = await ApiService.searchFA({ serialNumbers });
                DataTableManager.updateSnTable(serialNumbers, updatedData);
            } else {
                showError("Bản cần được nhận trước khi phân tích!");
            }
        } catch (error) {
            showError("Lỗi khi gọi API!", error);
        }
    }
    //async function handleThayLieuStatusUpdate() {
    //    const notes = $('#notes-thaylieu').val().trim();
    //    const serialNumbers = [];
    //    const statuses = [];

    //    DataTableManager.getAllSerialNumbers().forEach((sn) => {
    //        const rowData = DataTableManager.getRowData(sn);
    //        serialNumbers.push(rowData[0]);
    //        statuses.push(rowData[8]); // Sử dụng STATUS thay vì PRE_STATUS
    //    });

    //    if (!notes) {
    //        showWarning("Vui lòng nhập ghi chú!");
    //        return;
    //    }

    //    if (serialNumbers.length === 0) {
    //        showWarning("Không có SN trong database!");
    //        return;
    //    }

    //    const uniqueStatuses = [...new Set(statuses)];
    //    if (uniqueStatuses.length > 1) {
    //        showWarning("SN không cùng trạng thái!");
    //        return;
    //    }

    //    const status = uniqueStatuses[0];
    //    const payloadHistory = {
    //        serialNumbers: serialNumbers.join(','),
    //        type: 'THAY LIỆU',
    //        status: status,
    //        employeeId: $('#analysisPerson').val(),
    //        notes: notes,
    //        tag: 'confirm'
    //    };

    //    const payloadHandOver = {
    //        serialNumbers: serialNumbers.join(','),
    //        handOverStatus: 'WAITING_HAND_OVER',
    //        tag: 'giao'
    //    };

    //    try {
    //        const result = await ApiService.repairStatus(payloadHistory);
    //        const cleanMessage = result.message.replace(/"/g, '').trim();
    //        if (result.success && cleanMessage === "OK") {
    //            await ApiService.handOverStatus(payloadHandOver);
    //            showSuccess("Cập nhật trạng thái thành công!");
    //            ModalManager.hideModal('#modal-thaylieu');
    //            const updatedData = await ApiService.searchFA({ serialNumbers });
    //            DataTableManager.updateSnTable(serialNumbers, updatedData);
    //        } else {
    //            showError("Lỗi khi cập nhật trạng thái!");
    //        }
    //    } catch (error) {
    //        showError("Lỗi khi gọi API!");
    //    }
    //}

    async function handleCheckListStatusUpdate() {
        const selectedStatus = $('#status-select-check-list').val();
        const notes = $('#notes-check-list').val().trim();
        const empId = $('#analysisPerson').val();
        const serialNumbers = DataTableManager.getAllSerialNumbers();

        if (!selectedStatus) {
            showWarning('Vui lòng chọn trạng thái!');
            return;
        }

        const payload = {
            serialNumbers: serialNumbers.join(','),
            type: 'CHECK_LIST',
            status: selectedStatus,
            employeeId: empId || 'default_emp_id',
            tag: 'Confirm',
            notes: notes,
            handOverStatus: 'WAITING_HAND_OVER'
        };

        //const handoverPayload = {
        //    serialNumbers: serialNumbers.join(','),
        //    handOverStatus: 'WAITING_HAND_OVER',
        //    tag: 'Giao'
        //};

        try {
            const result = await ApiService.repairStatus(payload);
            const cleanMessage = result.message.replace(/"/g, '').trim();
            if (result.success && cleanMessage === "OK") {
                await ApiService.handOverStatus(handoverPayload);
                showSuccess("Cập nhật trạng thái thành công!");
                ModalManager.hideModal('#modal-check-list');
                const updatedData = await ApiService.searchFA({ serialNumbers });
                DataTableManager.updateSnTable(serialNumbers, updatedData);
            } else {
                showError("Lỗi khi cập nhật trạng thái!");
            }
        } catch (error) {
            showError("Lỗi khi gọi API!");
        }
    }

    function prepareTypeModal(statusNe, typeModal, serialNumbers) {
        $('#type-select, #retest-select').prop('required', false).hide();
        $('#additional-notes-container').hide();

        $('#type-select').off('change').on('change', function () {
            const selectedType = $(this).val();
            if (selectedType === 'RETEST' || selectedType === 'THAY LIỆU') {
                $('#additional-notes-container').show();
            } else {
                $('#additional-notes-container').hide();
            }
        });

        $('#type-select').show().prop('required', true);
        $('#type-select').val('');
        ModalManager.showModal('#type-modal');

        $('#type-form').off('submit').on('submit', async function (e) {
            e.preventDefault();

            const selectedType = $('#type-select').val();
            const additionalNotes = $('#additional-notes-input').val()?.trim();

            if (!selectedType) {
                showWarning("Vui lòng chọn giá trị Type!");
                return;
            }

            if ((selectedType === 'RETEST' || selectedType === 'THAY LIỆU') && !additionalNotes) {
                showWarning("Vui lòng nhập dữ liệu thay đổi!");
                return;
            }

            const payload = {
                serialNumbers: serialNumbers.join(','),
                type: statusNe,
                status: selectedType,
                employeeId: $('#analysisPerson').val(),
                notes: additionalNotes || "",
                tag: "Confirm",
                handOverStatus: 'WAITING_HAND_OVER'
            };

            //const handoverPayload = {
            //    serialNumbers: serialNumbers.join(','),
            //    handOverStatus: 'WAITING_HAND_OVER',
            //    tag: 'Giao'
            //};

            try {
                const result = await ApiService.repairStatus(payload);
                const cleanMessage = result.message.replace(/"/g, '').trim();
                if (result.success && cleanMessage === "OK") {
                    //await ApiService.handOverStatus(handoverPayload);
                    showSuccess("Cập nhật trạng thái thành công!");
                    ModalManager.hideModal('#type-modal');
                    const updatedData = await ApiService.searchFA({ serialNumbers });
                    DataTableManager.updateSnTable(serialNumbers, updatedData);
                } else {
                    showError("Lỗi khi cập nhật trạng thái!");
                }
            } catch (error) {
                showError("Lỗi khi gọi API!");
            }
        });
    }

    return {
        setup: setupEventListeners
    };
})();

// Module: RepairHistoryManager - Quản lý lịch sử sửa chữa
const RepairHistoryManager = (function () {
    function handleRepairDetailClick() {
        const serialNumber = $(this).data('serial-number');
        fetchRepairHistory([serialNumber]);
    }

    async function fetchRepairHistory(serialNumbers) {
        try {
            const ensuredStringSerialNumbers = serialNumbers.map(sn => String(sn));
            const data = await ApiService.searchHistory(ensuredStringSerialNumbers);
            DataTableManager.populateRepairHistoryTable(data.data);
            ModalManager.showModal('#repairHistoryModal');
        } catch (error) {
            showError("Lỗi khi lấy lịch sử sửa chữa!");
        }
    }

    function handleSaveRepairHistoryClick() {
        const serialNumber = String($(this).data('serial-number'));
        const currentRow = DataTableManager.getRowData(serialNumber);

        if (!currentRow) return;

        $('#save-serial-number').text(serialNumber);
        $('#save-notes').val('');
        ModalManager.showModal('#save-repair-modal');

        $('#confirm-save-repair').off('click').on('click', async () => {
            const notes = $('#save-notes').val().trim();
            if (!notes) {
                showWarning("Vui lòng nhập ghi chú!");
                return;
            }

            const payload = {
                serialNumbers: serialNumber,
                type: currentRow[8],
                status: currentRow[8],
                employeeId: $('#analysisPerson').val(),
                notes: notes,
                tag: "save"
            };

            try {
                const result = await ApiService.repairStatus(payload);
                const cleanMessage = result.message.replace(/"/g, '').trim();
                if (result.success && cleanMessage === "OK") {
                    showSuccess("Lưu lịch sử sửa chữa thành công!");
                    ModalManager.hideModal('#save-repair-modal');
                } else {
                    showError("Lỗi khi lưu lịch sử sửa chữa!");
                }
            } catch (error) {
                showError("Lỗi khi gọi API!");
            }
        });
    }

    return {
        handleRepairDetailClick,
        handleSaveRepairHistoryClick
    };
})();

// Module: TesterInfoManager - Quản lý thông tin Tester
const TesterInfoManager = (function () {
    function setupEventListeners() {
        $('#btn-fetch-tester').on('click', async () => {
            const serialNumbers = DataTableManager.getAllSerialNumbers();
            if (!serialNumbers.length) {
                showWarning("Không có dữ liệu trong database!");
                return;
            }

            try {
                const testerData = await ApiService.getLatestTester(serialNumbers);
                DataTableManager.populateTesterInfoTable(testerData);
                ModalManager.showModal('#modal-tester-info');
            } catch (error) {
                showError("Lỗi khi lấy thông tin tester!");
            }
        });
    }

    return {
        setup: setupEventListeners
    };
})();

// Module: BackToTop - Quản lý nút Back to Top
const BackToTop = (function () {
    function setup() {
        const backToTop = document.querySelector('.back-to-top');
        if (backToTop) {
            const toggleBackToTop = () => {
                if (window.scrollY > 100) {
                    backToTop.classList.add('active');
                } else {
                    backToTop.classList.remove('active');
                }
            };

            window.addEventListener('load', toggleBackToTop);
            window.addEventListener('scroll', toggleBackToTop);

            backToTop.addEventListener('click', (e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }

    return {
        setup
    };
})();

// Khởi tạo tất cả các module
$(document).ready(function () {
    DataTableManager.initSnTable();
    DataTableManager.initRepairHistoryTable();
    DataTableManager.initTesterInfoTable();
    FormHandler.setup();
    GuideManager.setup();
    StatusManager.setup();
    TesterInfoManager.setup();
    BackToTop.setup();
});