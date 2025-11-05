const API_BASE_URL = 'http://10.220.130.119:9090/DdRepositorys';
const PAGE_SIZE = 20;

let currentResults = [];
let currentPage = 1;
let currentResultsSection = null;
let hasHistoryFields = false;

//============= xử lý search =========================

document.getElementById('PdStock-search-btn').addEventListener('click', function () {
    const searchOption = document.getElementById('search-options');
    const searchInput = document.getElementById('PD-repo-seach-input');
    const resultsSection = document.getElementById('PDStock-search-results-section');
    const qtyElement = document.getElementById('Data-search-qty');

    if (!searchOption || !searchInput || !resultsSection || !qtyElement) {
        console.error('Missing required elements in DOM.');
        return;
    }

    const searchOptionValue = searchOption.value;
    const searchInputValue = searchInput.value.trim();
    const requiresInput = searchOptionValue !== 'SEARCH_All';

    if (requiresInput && !searchInputValue) {
        resultsSection.innerHTML = '<p class="data-alert">Vui lòng nhập dữ liệu tìm kiếm hợp lệ.</p>';
        qtyElement.textContent = 'Tổng số kết quả tìm được: 0';
        return;
    }

    resultsSection.innerHTML = '<p class="data-alert">Loading...</p>';
    qtyElement.textContent = '';

    const dataSearch = requiresInput
        ? searchInputValue
            .split('\n')
            .map(item => item.trim())
            .filter(item => item !== '')
        : [];

    if (requiresInput && dataSearch.length === 0) {
        resultsSection.innerHTML = '<p class="data-alert">Vui lòng nhập dữ liệu tìm kiếm hợp lệ.</p>';
        qtyElement.textContent = 'Tổng số kết quả tìm được: 0';
        return;
    }

    const mappedSearchType = mapSearchType(searchOptionValue);

    if (searchOptionValue !== 'SEARCH_EXPORT' && !mappedSearchType) {
        resultsSection.innerHTML = '<p class="data-alert">Vui lòng chọn loại tìm kiếm hợp lệ.</p>';
        qtyElement.textContent = 'Tổng số kết quả tìm được: 0';
        return;
    }

    let url = `${API_BASE_URL}/Search`;
    let fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            searchType: mappedSearchType,
            terms: dataSearch
        })
    };

    if (searchOptionValue === 'SEARCH_EXPORT') {
        url = `${API_BASE_URL}/GetHistoryBySerialNumber`;
        fetchOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataSearch)
        };
    }

    fetch(url, fetchOptions)
        .then(response => {
            if (response.status === 404) {
                return { data: [] };
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            displayResultsAsTable(data, resultsSection, qtyElement);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            resultsSection.innerHTML = '<p class="data-alert">Không thể tải dữ liệu. Vui lòng thử lại sau.</p>';
            qtyElement.textContent = 'Tổng số kết quả tìm được: 0';
        });
});

function mapSearchType(optionValue) {
    switch (optionValue) {
        case 'SEARCH_S/N':
            return 'SerialNumber';
        case 'SEARCH_MODEL_NAME':
            return 'ModelName';
        case 'SEARCH_CAR':
            return 'CartonNo';
        case 'SEARCH_All':
            return 'All';
        default:
            return '';
    }
}

function displayResultsAsTable(data, resultsSection, qtyElement) {
    resultsSection.innerHTML = '';

    const results = data && data.data
        ? (Array.isArray(data.data) ? data.data : [data.data])
        : [];

    currentResults = results;
    currentPage = 1;
    currentResultsSection = resultsSection;
    hasHistoryFields = currentResults.some(item => Object.prototype.hasOwnProperty.call(item, 'outDate') || Object.prototype.hasOwnProperty.call(item, 'outOp'));

    if (currentResults.length === 0) {
        resultsSection.innerHTML = '<p class="data-alert">Không tìm thấy dữ liệu.</p>';
        qtyElement.textContent = 'Tổng số kết quả tìm được: 0';
        return;
    }

    qtyElement.textContent = `Tổng số kết quả tìm được: ${currentResults.length}`;
    renderResultsPage();
}

function renderResultsPage(page = currentPage) {
    if (!currentResultsSection) {
        return;
    }

    const totalPages = Math.max(1, Math.ceil(currentResults.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(page, 1), totalPages);

    currentResultsSection.innerHTML = '';

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-responsive';

    const table = document.createElement('table');
    table.className = 'PdStock-results-table';

    table.innerHTML = `
        <thead>
            <tr>
                <th>Serial Number</th>
                <th>Model Name</th>
                <th>Carton No</th>
                <th>Kệ</th>
                <th>Cột</th>
                <th>Tầng</th>
                <th>Khay</th>
                <th>WIP Group</th>
                <th>Entry Date</th>
                <th>Entry Op</th>
                ${hasHistoryFields ? '<th>Out Date</th><th>Out Op</th>' : ''}
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageItems = currentResults.slice(startIndex, startIndex + PAGE_SIZE);

    pageItems.forEach(item => {
        const location = parseLocationValue(item.locationStock);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.serialNumber || '-'}</td>
            <td>${item.modelName || '-'}</td>
            <td>${item.cartonNo || '-'}</td>
            <td>${location.shelf}</td>
            <td>${location.column}</td>
            <td>${location.level}</td>
            <td>${location.tray}</td>
            <td>${item.wipGroup || '-'}</td>
            <td>${formatDateValue(item.entryDate)}</td>
            <td>${item.entryOp || '-'}</td>
            ${hasHistoryFields ? `<td>${formatDateValue(item.outDate)}</td><td>${item.outOp || '-'}</td>` : ''}
        `;
        tbody.appendChild(row);
    });

    tableWrapper.appendChild(table);
    currentResultsSection.appendChild(tableWrapper);

    if (totalPages > 1) {
        currentResultsSection.appendChild(createPagination(totalPages));
    }
}

function createPagination(totalPages) {
    const nav = document.createElement('nav');
    nav.className = 'pdstock-pagination';

    const ul = document.createElement('ul');
    ul.className = 'pagination justify-content-end';

    ul.appendChild(createPageButton('«', currentPage - 1, currentPage === 1));

    const pages = buildPageList(totalPages);
    pages.forEach(page => {
        if (page === 'ellipsis') {
            ul.appendChild(createEllipsisItem());
        } else {
            ul.appendChild(createPageButton(page, page, false, page === currentPage));
        }
    });

    ul.appendChild(createPageButton('»', currentPage + 1, currentPage === totalPages));

    nav.appendChild(ul);
    return nav;
}

function buildPageList(totalPages) {
    const maxMiddleButtons = 5;
    const pages = [];

    if (totalPages <= maxMiddleButtons + 2) {
        for (let i = 1; i <= totalPages; i += 1) {
            pages.push(i);
        }
        return pages;
    }

    const half = Math.floor(maxMiddleButtons / 2);
    let start = Math.max(2, currentPage - half);
    let end = Math.min(totalPages - 1, currentPage + half);

    if (currentPage <= half + 1) {
        start = 2;
        end = maxMiddleButtons + 1;
    } else if (currentPage >= totalPages - half) {
        start = totalPages - maxMiddleButtons;
        end = totalPages - 1;
    }

    pages.push(1);

    if (start > 2) {
        pages.push('ellipsis');
    }

    for (let i = start; i <= end; i += 1) {
        pages.push(i);
    }

    if (end < totalPages - 1) {
        pages.push('ellipsis');
    }

    pages.push(totalPages);
    return pages;
}

function createPageButton(label, page, disabled, active = false) {
    const li = document.createElement('li');
    li.className = 'page-item';

    if (disabled) {
        li.classList.add('disabled');
    }
    if (active) {
        li.classList.add('active');
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'page-link';
    button.textContent = label;

    if (!disabled) {
        button.addEventListener('click', () => {
            renderResultsPage(typeof page === 'number' ? page : currentPage);
        });
    }

    li.appendChild(button);
    return li;
}

function createEllipsisItem() {
    const li = document.createElement('li');
    li.className = 'page-item disabled';

    const span = document.createElement('span');
    span.className = 'page-link';
    span.textContent = '…';

    li.appendChild(span);
    return li;
}

function parseLocationValue(locationStock) {
    if (!locationStock) {
        return { shelf: '-', column: '-', level: '-', tray: '-' };
    }

    const sanitized = locationStock.replace(/\s+/g, '');
    const [prefix = '', tray = '-'] = sanitized.split('-');

    return {
        shelf: prefix.charAt(0) || '-',
        column: prefix.charAt(1) || '-',
        level: prefix.charAt(2) || '-',
        tray: tray || '-'
    };
}

function formatDateValue(value) {
    if (!value) {
        return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('vi-VN');
}

// xử lý nút xuất Excel

document.getElementById('PdStock-ExportExcel-btn').addEventListener('click', function () {
    const table = document.querySelector('.PdStock-results-table');
    if (!table) {
        alert('Không có dữ liệu để xuất!');
        return;
    }

    let tableData = '';
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
        const cols = row.querySelectorAll('td, th');
        const rowData = Array.from(cols)
            .map(col => col.textContent.replace(/,/g, ''))
            .join(',');
        tableData += `${rowData}\n`;
    });

    const blob = new Blob([tableData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'PdStockData.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert('Xuất dữ liệu ra file Excel thành công!');
});
