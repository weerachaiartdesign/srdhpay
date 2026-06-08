// js/verify.js
let currentList = [];
let selectedUUIDs = new Set();
let currentPage = 1, totalPages = 1;
let filters = {};

async function initVerifyPage() {
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
    document.getElementById('editBtn').addEventListener('click', openEditModal);
    document.getElementById('returnBtn').addEventListener('click', returnItems);
    document.getElementById('passBtn').addEventListener('click', openPassModal);
    document.getElementById('printEditBtn').addEventListener('click', printEdit);
    document.getElementById('resetFilters').addEventListener('click', () => { filters = {}; loadList(); });
    document.getElementById('selectAll')?.addEventListener('change', (e) => toggleSelectAll(e.target.checked));
    document.getElementById('prevPage')?.addEventListener('click', () => { if(currentPage>1){currentPage--; loadList();} });
    document.getElementById('nextPage')?.addEventListener('click', () => { if(currentPage<totalPages){currentPage++; loadList();} });
    document.getElementById('closeEditModal')?.addEventListener('click', () => closeEditModal());
    document.getElementById('cancelPass')?.addEventListener('click', () => closePassModal());
    document.getElementById('confirmPass')?.addEventListener('click', confirmPass);
    document.getElementById('editForm')?.addEventListener('submit', saveEdit);

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
    // ถ้า role เป็น editor ให้ filter เพิ่ม EDITOR เท่ากับ username หรือ email
    const user = getUser();
    if (user.role === 'editor') {
        query.EDITOR = user.username; // backend จะต้องรองรับการ filter ด้วย EDITOR
    }
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
        const emptyMsg = '<table><td colspan="8" class="text-center">ไม่มีข้อมูล</td></tr>';
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
                <td>${row.REGISTER_NO_DISPLAY || '-'}<br><span class="text-xs text-gray-500">${row.RECEIVE_NO_DISPLAY || ''}</span></td>
                <td>${row.REQUEST_NO_DISPLAY || '-'}<br><span class="text-xs text-gray-500">${row.MONEY_TYPE || ''}</span></td>
                <td>${escapeHtml(row.VENDOR || '-')}</td>
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
                <div><span class="text-gray-500">เลขที่รับ:</span> ${row.RECEIVE_NO_DISPLAY}</div>
                <div><span class="text-gray-500">เลขที่ขอ:</span> ${row.REQUEST_NO_DISPLAY}</div>
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
    renderTable(); // re-render checkboxes
    updateButtons();
}

function updateButtons() {
    const hasSelected = selectedUUIDs.size > 0;
    document.getElementById('editBtn').disabled = !hasSelected;
    document.getElementById('returnBtn').disabled = !hasSelected;
    document.getElementById('passBtn').disabled = !hasSelected;
}

function openEditModal() {
    if (selectedUUIDs.size !== 1) {
        showToast('กรุณาเลือกรายการเดียวเพื่อแก้ไข', 'warning');
        return;
    }
    const uuid = Array.from(selectedUUIDs)[0];
    const row = currentList.find(r => r.UUID === uuid);
    if (!row) return;
    document.getElementById('editUUID').value = uuid;
    document.getElementById('editRequestNo').value = row.REQUEST_NO_DISPLAY || '';
    document.getElementById('editDkNo').value = row.DK_NO_DISPLAY || '';
    document.getElementById('editVendor').value = row.VENDOR || '';
    document.getElementById('editAmount').value = row.AMOUNT || '';
    document.getElementById('editDescription').value = row.DESCRIPTION || '';
    document.getElementById('editNote').value = '';
    document.getElementById('editModal').classList.remove('hidden');
    document.getElementById('editModal').classList.add('flex');
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    document.getElementById('editModal').classList.remove('flex');
}

async function saveEdit(e) {
    e.preventDefault();
    const uuid = document.getElementById('editUUID').value;
    const edits = {
        REQUEST_NO: document.getElementById('editRequestNo').value,
        DK_NO: document.getElementById('editDkNo').value,
        VENDOR: document.getElementById('editVendor').value,
        AMOUNT: parseFloat(document.getElementById('editAmount').value) || 0,
        DESCRIPTION: document.getElementById('editDescription').value
    };
    showLoading('กำลังบันทึกการแก้ไข...');
    const result = await API.editItems([{ uuid, edits }]);
    hideLoading();
    if (result.success) {
        showToast(result.message, 'success');
        selectedUUIDs.clear();
        closeEditModal();
        loadList();
    } else {
        showToast(result.message, 'error');
    }
}

async function returnItems() {
    if (selectedUUIDs.size === 0) return;
    const items = Array.from(selectedUUIDs).map(uuid => ({ uuid }));
    showLoading('กำลังรับคืน...');
    const result = await API.returnItems(items);
    hideLoading();
    if (result.success) {
        showToast(result.message, 'success');
        selectedUUIDs.clear();
        loadList();
    } else {
        showToast(result.message, 'error');
    }
}

function openPassModal() {
    if (selectedUUIDs.size === 0) return;
    const dkFieldsDiv = document.getElementById('dkFields');
    dkFieldsDiv.innerHTML = '';
    Array.from(selectedUUIDs).forEach(uuid => {
        const row = currentList.find(r => r.UUID === uuid);
        const currentDk = row?.DK_NO_DISPLAY || '';
        dkFieldsDiv.innerHTML += `
            <div class="mb-2">
                <label class="text-sm">เลขที่ฎีกา (${row?.REQUEST_NO_DISPLAY || uuid.slice(0,8)})</label>
                <input type="text" class="form-input dk-input" data-uuid="${uuid}" value="${currentDk}" placeholder="เช่น 1801/69">
            </div>
        `;
    });
    document.getElementById('passModal').classList.remove('hidden');
    document.getElementById('passModal').classList.add('flex');
}

function closePassModal() {
    document.getElementById('passModal').classList.add('hidden');
    document.getElementById('passModal').classList.remove('flex');
}

async function confirmPass() {
    const dkNumbers = {};
    document.querySelectorAll('.dk-input').forEach(input => {
        const uuid = input.dataset.uuid;
        const value = input.value.trim();
        if (value) dkNumbers[uuid] = value;
    });
    const items = Array.from(selectedUUIDs).map(uuid => ({ uuid }));
    showLoading('กำลังตรวจผ่าน...');
    const result = await API.passItems(items, dkNumbers);
    hideLoading();
    if (result.success) {
        showToast(result.message, 'success');
        selectedUUIDs.clear();
        closePassModal();
        loadList();
    } else {
        showToast(result.message, 'error');
    }
}

function printEdit() {
    const toPrint = currentList.filter(row => row.STATUS === 'ส่งแก้ไข');
    if (toPrint.length === 0) { showToast('ไม่มีรายการในสถานะส่งแก้ไข', 'warning'); return; }
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html><head><title>ใบส่งแก้ไข</title>
        <style>body{font-family: 'Inter',sans-serif;margin:15mm} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:8px}</style>
        </head><body><h2>ใบส่งแก้ไข</h2>
        <p>วันที่พิมพ์: ${formatDate(new Date())}</p>
        <table><thead><tr><th>เลขที่ลงทะเบียน</th><th>วันที่รับเข้า</th><th>ประเภทเงิน</th><th>เลขที่ใบขอเบิก</th><th>ชื่อเจ้าหนี้</th><th>รายการ</th><th>จำนวนเงิน</th></tr></thead><tbody>
        ${toPrint.map(r => `<tr><td>${r.REGISTER_NO_DISPLAY}</td><td>${formatDate(r.RECEIVE_DATE)}</td><td>${r.MONEY_TYPE}</td><td>${r.REQUEST_NO_DISPLAY}</td><td>${escapeHtml(r.VENDOR)}</td><td>${escapeHtml(r.DESCRIPTION)}</td><td class="text-right">${formatCurrency(r.AMOUNT)}</td></tr>`).join('')}
        </tbody></table></body></html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, function(m){if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }
