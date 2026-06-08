// js/receive.js
let currentList = [];          // รายการที่แสดงในตาราง
let currentMode = 'register'; // 'register' หรือ 'received'
let selectedUUIDs = new Set();
let currentPage = 1, totalPages = 1;
let filters = {};

async function initReceivePage() {
    await loadFilterOptions();
    setupEventListeners();
}

async function loadFilterOptions() {
    const settings = await API.getSettings();
    if (settings.success) {
        const moneySelect = document.getElementById('filterMoneyType');
        const deptSelect = document.getElementById('filterDept');
        if (moneySelect) settings.settings.money_types.forEach(mt => moneySelect.innerHTML += `<option value="${escapeHtml(mt.name)}">${escapeHtml(mt.name)}</option>`);
        if (deptSelect) settings.settings.depts.forEach(d => deptSelect.innerHTML += `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`);
    }
    // load editors for assign modal
    const usersRes = await API.listUsers();
    if (usersRes.success) {
        const editors = usersRes.users.filter(u => u.role === 'editor' && u.active);
        const editorSelect = document.getElementById('editorSelect');
        editorSelect.innerHTML = '<option value="">-- เลือกผู้ตรวจ --</option>';
        editors.forEach(ed => editorSelect.innerHTML += `<option value="${escapeHtml(ed.email)}">${escapeHtml(ed.username)} (${ed.email})</option>`);
    }
}

function setupEventListeners() {
    document.getElementById('checkRegisterBtn').addEventListener('click', () => loadList('register'));
    document.getElementById('checkReceivedBtn').addEventListener('click', () => loadList('received'));
    document.getElementById('receiveBtn').addEventListener('click', receiveItems);
    document.getElementById('assignEditorBtn').addEventListener('click', openAssignModal);
    document.getElementById('printReceiveBtn').addEventListener('click', printReceive);
    document.getElementById('resetFilters').addEventListener('click', () => { filters = {}; loadList(currentMode); });
    document.getElementById('selectAll')?.addEventListener('change', (e) => { toggleSelectAll(e.target.checked); });
    document.getElementById('prevPage')?.addEventListener('click', () => { if(currentPage>1){currentPage--; loadList(currentMode);} });
    document.getElementById('nextPage')?.addEventListener('click', () => { if(currentPage<totalPages){currentPage++; loadList(currentMode);} });
    document.getElementById('confirmAssign')?.addEventListener('click', assignEditor);
    document.getElementById('cancelAssign')?.addEventListener('click', () => closeAssignModal());
    // filter inputs
    const filterFields = ['filterDate','filterRegisterNo','filterMoneyType','filterDept','filterSender'];
    filterFields.forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            filters = {
                date: document.getElementById('filterDate').value,
                registerNo: document.getElementById('filterRegisterNo').value,
                moneyType: document.getElementById('filterMoneyType').value,
                dept: document.getElementById('filterDept').value,
                sender: document.getElementById('filterSender').value
            };
            loadList(currentMode);
        });
    });
}

async function loadList(mode) {
    currentMode = mode;
    currentPage = 1;
    selectedUUIDs.clear();
    const status = (mode === 'register') ? 'รอเอกสาร' : 'รับเข้าระบบ';
    const result = await API.getRegisterList({ STATUS: status, ...filters }, { page: currentPage, limit: 50, sortBy: 'REGISTER_DATE', sortOrder: 'ASC' });
    if (result.success) {
        currentList = result.data;
        totalPages = result.totalPages;
        renderTable();
        document.getElementById('receiveBtn').disabled = (mode !== 'register' || currentList.length === 0);
        document.getElementById('assignEditorBtn').disabled = (mode !== 'received' || currentList.length === 0);
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
            html += `<tr>
                <td><input type="checkbox" class="rowCheckbox" data-uuid="${row.UUID}" ${checked}></td>
                <td>${row.REGISTER_NO_DISPLAY || '-'}<br><span class="text-xs text-gray-500">${row.RECEIVE_NO_DISPLAY || ''}</span></td>
                <td>${row.REQUEST_NO_DISPLAY || '-'}<br><span class="text-xs text-gray-500">${row.MONEY_TYPE || ''}</span></td>
                <td>${escapeHtml(row.VENDOR || '-')}</td>
                <td class="max-w-xs truncate">${escapeHtml(row.DESCRIPTION || '-')}</td>
                <td class="text-right">${formatCurrency(row.AMOUNT)}</td>
                <td>${row.DEPT || '-'}<br><span class="text-xs text-gray-500">${row.SENDER || ''}</span></td>
            </tr>`;
        });
        tbody.innerHTML = html;
        document.querySelectorAll('.rowCheckbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const uuid = cb.dataset.uuid;
                if (cb.checked) selectedUUIDs.add(uuid);
                else selectedUUIDs.delete(uuid);
                document.getElementById('selectAll').checked = (selectedUUIDs.size === currentList.length);
            });
        });
        document.getElementById('selectAll').checked = (selectedUUIDs.size === currentList.length);
    }
    // Mobile
    if(mobileDiv) {
        let cards = '';
        currentList.forEach(row => {
            const checked = selectedUUIDs.has(row.UUID) ? 'checked' : '';
            cards += `<div class="mobile-card"><div class="flex justify-between"><div><input type="checkbox" class="rowCheckboxMobile" data-uuid="${row.UUID}" ${checked}></div>
            <div class="font-mono text-sm">${row.REGISTER_NO_DISPLAY}</div></div>
            <div><span class="text-gray-500">เลขที่ขอ:</span> ${row.REQUEST_NO_DISPLAY}</div>
            <div><span class="text-gray-500">เจ้าหนี้:</span> ${escapeHtml(row.VENDOR)}</div>
            <div class="font-bold">${formatCurrency(row.AMOUNT)}</div>
            <div class="text-xs text-gray-500">${row.MONEY_TYPE} / ${row.DEPT}</div></div>`;
        });
        mobileDiv.innerHTML = cards;
        document.querySelectorAll('.rowCheckboxMobile').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const uuid = cb.dataset.uuid;
                if (cb.checked) selectedUUIDs.add(uuid);
                else selectedUUIDs.delete(uuid);
            });
        });
    }
}

function toggleSelectAll(checked) {
    currentList.forEach(row => {
        if (checked) selectedUUIDs.add(row.UUID);
        else selectedUUIDs.delete(row.UUID);
    });
    renderTable(); // re-render to reflect checkboxes
}

async function receiveItems() {
    if (selectedUUIDs.size === 0) { showToast('กรุณาเลือกรายการ', 'warning'); return; }
    const items = Array.from(selectedUUIDs).map(uuid => ({ uuid }));
    showLoading('กำลังรับเข้าระบบ...');
    const result = await API.receiveItems(items);
    hideLoading();
    if (result.success) {
        showToast(result.message, 'success');
        selectedUUIDs.clear();
        loadList('register');
    } else {
        showToast(result.message, 'error');
    }
}

function openAssignModal() {
    if (selectedUUIDs.size === 0) { showToast('กรุณาเลือกรายการ', 'warning'); return; }
    document.getElementById('assignModal').classList.remove('hidden');
    document.getElementById('assignModal').classList.add('flex');
}

function closeAssignModal() {
    document.getElementById('assignModal').classList.add('hidden');
    document.getElementById('assignModal').classList.remove('flex');
}

async function assignEditor() {
    const editorEmail = document.getElementById('editorSelect').value || document.getElementById('editorCustom').value.trim();
    if (!editorEmail) { showToast('กรุณาเลือกหรือระบุผู้ตรวจ', 'warning'); return; }
    const items = Array.from(selectedUUIDs).map(uuid => ({ uuid }));
    showLoading('กำลังกำหนดผู้ตรวจ...');
    const result = await API.assignEditor(items, editorEmail);
    hideLoading();
    if (result.success) {
        showToast(result.message, 'success');
        selectedUUIDs.clear();
        loadList('received');
        closeAssignModal();
    } else {
        showToast(result.message, 'error');
    }
}

function printReceive() {
    if (currentList.length === 0) { showToast('ไม่มีข้อมูลที่จะพิมพ์', 'warning'); return; }
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html><head><title>ใบรับเข้าระบบ</title>
        <style>body{font-family: 'Inter',sans-serif;margin:15mm} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:8px}</style>
        </head><body><h2>ใบยืนยันการรับเข้าระบบ</h2>
        <p>วันที่พิมพ์: ${formatDate(new Date())}</p>
        <table><thead><tr><th>เลขที่ลงทะเบียน</th><th>วันที่ลงทะเบียน</th><th>ประเภทเงิน</th><th>เลขที่ใบขอเบิก</th><th>ชื่อเจ้าหนี้</th><th>รายการ</th><th>จำนวนเงิน</th></tr></thead><tbody>
        ${currentList.map(r => `<tr><td>${r.REGISTER_NO_DISPLAY}</td><td>${formatDate(r.REGISTER_DATE)}</td><td>${r.MONEY_TYPE}</td><td>${r.REQUEST_NO_DISPLAY}</td><td>${escapeHtml(r.VENDOR)}</td><td>${escapeHtml(r.DESCRIPTION)}</td><td class="text-right">${formatCurrency(r.AMOUNT)}</td></tr>`).join('')}
        </tbody></table></body></html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, function(m){if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }
