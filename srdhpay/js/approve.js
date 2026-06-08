// js/approve.js
let currentList = [];
let selectedUUIDs = new Set();
let currentPage = 1, totalPages = 1;
let filters = {};

async function initApprovePage() {
    await loadFilterOptions();
    setupEventListeners();
    loadList();
}

async function loadFilterOptions() {
    const settings = await API.getSettings();
    if (settings.success) {
        const moneySelect = document.getElementById('filterMoneyType');
        const deptSelect = document.getElementById('filterDept');
        if (moneySelect) settings.settings.money_types.forEach(mt => moneySelect.innerHTML += `<option value="${escapeHtml(mt.name)}">${escapeHtml(mt.name)}</option>`);
        if (deptSelect) settings.settings.depts.forEach(d => deptSelect.innerHTML += `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`);
    }
}

function setupEventListeners() {
    document.getElementById('proposeBtn').addEventListener('click', proposeItems);
    document.getElementById('approveBtn').addEventListener('click', approveItems);
    document.getElementById('printProposeBtn').addEventListener('click', printPropose);
    document.getElementById('resetFilters').addEventListener('click', () => { filters = {}; loadList(); });
    document.getElementById('selectAll')?.addEventListener('change', (e) => toggleSelectAll(e.target.checked));
    document.getElementById('prevPage')?.addEventListener('click', () => { if(currentPage>1){currentPage--; loadList();} });
    document.getElementById('nextPage')?.addEventListener('click', () => { if(currentPage<totalPages){currentPage++; loadList();} });

    // filter inputs
    const filterFields = ['filterStatus','filterMoneyType','filterDept','filterSender','filterVendor'];
    filterFields.forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            filters = {
                status: document.getElementById('filterStatus').value,
                moneyType: document.getElementById('filterMoneyType').value,
                dept: document.getElementById('filterDept').value,
                sender: document.getElementById('filterSender').value,
                vendor: document.getElementById('filterVendor').value
            };
            loadList();
        });
    });
}

async function loadList() {
    const query = { ...filters };
    const result = await API.getRegisterList(query, { page: currentPage, limit: 50, sortBy: 'RECEIVE_DATE', sortOrder: 'DESC' });
    if (result.success) {
        currentList = result.data;
        totalPages = result.totalPages;
        renderTable();
        updateButtons();
        document.getElementById('pageInfo').innerText = `หน้า ${currentPage} / ${totalPages}`;
        document.getElementById('prevPage').disabled = currentPage === 1;
        document.getElementById('nextPage').disabled = currentPage === totalPages;
    } else {
        showToast(result.message, 'error');
    }
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    const mobileDiv = document.getElementById('mobileCards');
    if (!tbody && !mobileDiv) return;
    if (currentList.length === 0) {
        const emptyMsg = '<tr><td colspan="7" class="text-center">ไม่มีข้อมูล</td></tr>';
        if(tbody) tbody.innerHTML = emptyMsg;
        if(mobileDiv) mobileDiv.innerHTML = '<div class="text-center text-gray-500">ไม่มีข้อมูล</div>';
        document.getElementById('selectAll').checked = false;
        return;
    }
    // Desktop
    if(tbody) {
        let html = '';
        currentList.forEach(row => {
            const checked = selectedUUIDs.has(row.UUID) ? 'checked' : '';
            const statusClass = getStatusBadgeClass(row.STATUS);
            html += `<tr data-uuid="${row.UUID}">
                <td><input type="checkbox" class="rowCheckbox" data-uuid="${row.UUID}" ${checked}></td>
                <td>${row.DK_NO_DISPLAY || '-'}<br><span class="text-xs text-gray-500">${row.MONEY_TYPE || ''}</span></td>
                <td class="font-semibold">${escapeHtml(row.VENDOR || '-')}</td>
                <td class="max-w-xs truncate">${escapeHtml(row.DESCRIPTION || '-')}</td>
                <td class="text-right">${formatCurrency(row.AMOUNT)}</td>
                <td>${row.DEPT || '-'}<br><span class="text-xs text-gray-500">${row.SENDER || ''}</span></td>
                <td><span class="status-badge ${statusClass}">${row.STATUS}</span></td>
            </tr>`;
        });
        tbody.innerHTML = html;
        attachCheckboxEvents();
        document.getElementById('selectAll').checked = (selectedUUIDs.size === currentList.length);
    }
    // Mobile
    if(mobileDiv) {
        let cards = '';
        currentList.forEach(row => {
            const checked = selectedUUIDs.has(row.UUID) ? 'checked' : '';
            cards += `<div class="mobile-card" data-uuid="${row.UUID}">
                <div class="flex justify-between"><div><input type="checkbox" class="rowCheckboxMobile" data-uuid="${row.UUID}" ${checked}></div>
                <span class="status-badge ${getStatusBadgeClass(row.STATUS)}">${row.STATUS}</span></div>
                <div><span class="text-gray-500">เลขที่ฎีกา:</span> ${row.DK_NO_DISPLAY || '-'}</div>
                <div><span class="text-gray-500">เจ้าหนี้:</span> ${escapeHtml(row.VENDOR)}</div>
                <div class="font-bold">${formatCurrency(row.AMOUNT)}</div>
                <div class="text-xs text-gray-500">${row.MONEY_TYPE} / ${row.DEPT}</div>
            </div>`;
        });
        mobileDiv.innerHTML = cards;
        document.querySelectorAll('.rowCheckboxMobile').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const uuid = cb.dataset.uuid;
                if (cb.checked) selectedUUIDs.add(uuid);
                else selectedUUIDs.delete(uuid);
                updateButtons();
            });
        });
    }
    updateButtons();
}

function attachCheckboxEvents() {
    document.querySelectorAll('.rowCheckbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const uuid = cb.dataset.uuid;
            if (cb.checked) selectedUUIDs.add(uuid);
            else selectedUUIDs.delete(uuid);
            updateButtons();
            document.getElementById('selectAll').checked = (selectedUUIDs.size === currentList.length);
        });
    });
}

function toggleSelectAll(checked) {
    currentList.forEach(row => {
        if (checked) selectedUUIDs.add(row.UUID);
        else selectedUUIDs.delete(row.UUID);
    });
    renderTable();
    updateButtons();
}

function updateButtons() {
    const hasSelected = selectedUUIDs.size > 0;
    document.getElementById('proposeBtn').disabled = !hasSelected;
    document.getElementById('approveBtn').disabled = !hasSelected;
}

async function proposeItems() {
    if (selectedUUIDs.size === 0) return;
    // ตรวจสอบว่าเฉพาะรายการสถานะ 'ตรวจผ่าน' เท่านั้นที่สามารถเสนอได้
    const validItems = Array.from(selectedUUIDs).filter(uuid => {
        const row = currentList.find(r => r.UUID === uuid);
        return row && row.STATUS === 'ตรวจผ่าน';
    });
    if (validItems.length === 0) {
        showToast('ไม่มีรายการในสถานะตรวจผ่านที่สามารถเสนอได้', 'warning');
        return;
    }
    const items = validItems.map(uuid => ({ uuid }));
    showLoading('กำลังบันทึกการเสนอ...');
    const result = await API.proposeItems(items);
    hideLoading();
    if (result.success) {
        showToast(result.message, 'success');
        selectedUUIDs.clear();
        loadList();
    } else {
        showToast(result.message, 'error');
    }
}

async function approveItems() {
    if (selectedUUIDs.size === 0) return;
    const validItems = Array.from(selectedUUIDs).filter(uuid => {
        const row = currentList.find(r => r.UUID === uuid);
        return row && row.STATUS === 'เสนอ';
    });
    if (validItems.length === 0) {
        showToast('ไม่มีรายการในสถานะเสนอที่สามารถอนุมัติได้', 'warning');
        return;
    }
    const items = validItems.map(uuid => ({ uuid }));
    showLoading('กำลังบันทึกการอนุมัติ...');
    const result = await API.approveItems(items);
    hideLoading();
    if (result.success) {
        showToast(result.message, 'success');
        selectedUUIDs.clear();
        loadList();
    } else {
        showToast(result.message, 'error');
    }
}

function printPropose() {
    const toPrint = currentList.filter(row => row.STATUS === 'เสนอ');
    if (toPrint.length === 0) { showToast('ไม่มีรายการในสถานะเสนอ', 'warning'); return; }
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html><head><title>ใบบันทึกเสนอ</title>
        <style>body{font-family: 'Inter',sans-serif;margin:15mm} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:8px}</style>
        </head><body><h2>รายละเอียดการเสนอฎีกาของฝ่ายงบประมาณการเงินและบัญชี</h2>
        <p>วันที่เสนอ: ${formatDate(new Date())}</p>
        <table><thead><tr><th>เลขที่ฎีกา</th><th>ประเภทเงิน</th><th>ชื่อเจ้าหนี้/บริษัท</th><th>รายการ</th><th>จำนวนเงินขอเบิก</th></tr></thead><tbody>
        ${toPrint.map(r => `<tr><td>${r.DK_NO_DISPLAY || '-'}</td><td>${r.MONEY_TYPE}</td><td>${escapeHtml(r.VENDOR)}</td><td>${escapeHtml(r.DESCRIPTION)}</td><td class="text-right">${formatCurrency(r.AMOUNT)}</td></tr>`).join('')}
        </tbody></table></body></html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, function(m){if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }
