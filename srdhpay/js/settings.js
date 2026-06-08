// js/settings.js
let currentSettings = null;
let currentEditPage = 1, editTotalPages = 1, editItemsList = [];
let vendorPage = 1, vendorTotalPages = 1, vendorList = [];

async function initSettingsPage() {
    await loadSettings();
    setupTabs();
    setupFiscalTab();
    setupMoneyTab();
    setupVendorTab();
    setupCheckerTab();
    setupDisplayTab();
    setupEditItemsTab();
    setupBackupTab();
}

async function loadSettings() {
    const res = await API.getSettings();
    if (res.success) currentSettings = res.settings;
    else currentSettings = { app: {}, money_types: [], vendors: [], depts: [], display: {} };
}
function setupTabs() {
    const tabs = document.querySelectorAll('.settings-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.add('hidden'));
            document.getElementById(`${tabId}Tab`).classList.remove('hidden');
            tabs.forEach(t => t.classList.remove('bg-purple-100', 'text-purple-700', 'dark:bg-purple-900'));
            tab.classList.add('bg-purple-100', 'text-purple-700', 'dark:bg-purple-900');
            if (tabId === 'money') renderMoneyTypes();
            if (tabId === 'vendor') renderVendors();
            if (tabId === 'checker') loadCheckers();
            if (tabId === 'editItems') searchEditItems();
        });
    });
    document.querySelector('.settings-tab').click();
}

// Fiscal Year
function setupFiscalTab() {
    const app = currentSettings.app || {};
    document.getElementById('fiscalYear').value = app.fiscal_year || '2569';
    document.getElementById('fiscalStartDate').value = app.fiscal_start_date || '';
    document.getElementById('fiscalEndDate').value = app.fiscal_end_date || '';
    document.getElementById('allowImportStart').value = app.allow_import_start || '';
    document.getElementById('allowImportEnd').value = app.allow_import_end || '';
    document.getElementById('saveFiscalBtn').addEventListener('click', async () => {
        const settings = {
            app: {
                fiscal_year: document.getElementById('fiscalYear').value,
                fiscal_start_date: document.getElementById('fiscalStartDate').value,
                fiscal_end_date: document.getElementById('fiscalEndDate').value,
                allow_import_start: document.getElementById('allowImportStart').value,
                allow_import_end: document.getElementById('allowImportEnd').value
            }
        };
        showLoading();
        const res = await API.saveSettings(settings);
        hideLoading();
        if (res.success) showToast('บันทึกปีงบประมาณสำเร็จ', 'success');
        else showToast(res.message, 'error');
    });
}

// Money Types
function renderMoneyTypes() {
    const tbody = document.getElementById('moneyTypeTable');
    if (!tbody) return;
    const types = currentSettings.money_types || [];
    tbody.innerHTML = '';
    types.forEach((mt, idx) => {
        const row = tbody.insertRow();
        row.insertCell(0).innerText = idx+1;
        row.insertCell(1).innerHTML = `<input type="text" class="form-input money-name" value="${escapeHtml(mt.name)}" data-idx="${idx}">`;
        row.insertCell(2).innerHTML = `<input type="color" class="money-color" value="${mt.color || '#808080'}" data-idx="${idx}">`;
        row.insertCell(3).innerHTML = `<button class="text-red-600 delete-money" data-idx="${idx}"><i class="fas fa-trash"></i></button>`;
    });
    document.querySelectorAll('.delete-money').forEach(btn => btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.dataset.idx);
        currentSettings.money_types.splice(idx,1);
        renderMoneyTypes();
    }));
    document.getElementById('addMoneyTypeBtn').onclick = () => {
        currentSettings.money_types.push({ name: 'ใหม่', color: '#9333ea' });
        renderMoneyTypes();
    };
    // auto-save on change
    document.querySelectorAll('.money-name, .money-color').forEach(el => el.addEventListener('change', () => saveMoneyTypes()));
}
async function saveMoneyTypes() {
    const names = document.querySelectorAll('.money-name');
    const colors = document.querySelectorAll('.money-color');
    const newTypes = [];
    for (let i=0; i<names.length; i++) {
        newTypes.push({ name: names[i].value, color: colors[i].value });
    }
    showLoading();
    const res = await API.saveSettings({ money_types: newTypes });
    hideLoading();
    if (res.success) { currentSettings.money_types = newTypes; showToast('บันทึกประเภทเงินสำเร็จ', 'success'); }
    else showToast(res.message, 'error');
}

// Vendors
async function renderVendors() {
    const vendors = currentSettings.vendors || [];
    const limit = 20;
    vendorTotalPages = Math.ceil(vendors.length / limit);
    const start = (vendorPage-1)*limit;
    const pageVendors = vendors.slice(start, start+limit);
    const tbody = document.getElementById('vendorTable');
    if (!tbody) return;
    tbody.innerHTML = '';
    pageVendors.forEach((v, idx) => {
        const row = tbody.insertRow();
        row.insertCell(0).innerHTML = `<input type="text" class="form-input vendor-name" value="${escapeHtml(v.name)}" data-idx="${start+idx}">`;
        row.insertCell(1).innerHTML = `<select class="vendor-active" data-idx="${start+idx}"><option value="active" ${v.active!==false?'selected':''}>ใช้งาน</option><option value="inactive" ${v.active===false?'selected':''}>ปิดใช้งาน</option></select>`;
        row.insertCell(2).innerHTML = `<button class="text-red-600 delete-vendor" data-idx="${start+idx}"><i class="fas fa-trash"></i></button>`;
    });
    document.getElementById('vendorPageInfo').innerText = `หน้า ${vendorPage} / ${vendorTotalPages||1}`;
    document.querySelectorAll('.delete-vendor').forEach(btn => btn.addEventListener('click', (e) => {
        currentSettings.vendors.splice(parseInt(btn.dataset.idx),1);
        renderVendors();
        saveVendors();
    }));
    document.querySelectorAll('.vendor-name, .vendor-active').forEach(el => el.addEventListener('change', () => saveVendors()));
}
async function saveVendors() {
    const names = document.querySelectorAll('.vendor-name');
    const actives = document.querySelectorAll('.vendor-active');
    const newVendors = [];
    for (let i=0; i<names.length; i++) {
        newVendors.push({ name: names[i].value, active: actives[i].value === 'active' });
    }
    // merge with existing beyond current page? Actually we need full list from currentSettings
    // better reconstruct full list from all rows? but we only have page visible. We'll keep original currentSettings and update.
    // simpler: just rebuild from current page? not safe. We'll use currentSettings as source and update by index.
    // For simplicity, we replace full list by collecting from all rows? But rows only visible page. We'll do:
    // Actually we'll keep currentSettings.vendors and just update by dataset.idx
    const fullVendors = [...currentSettings.vendors];
    for (let i=0; i<names.length; i++) {
        const idx = parseInt(names[i].dataset.idx);
        if (fullVendors[idx]) {
            fullVendors[idx].name = names[i].value;
            fullVendors[idx].active = actives[i].value === 'active';
        }
    }
    showLoading();
    const res = await API.saveSettings({ vendors: fullVendors });
    hideLoading();
    if (res.success) { currentSettings.vendors = fullVendors; showToast('บันทึกข้อมูลเจ้าหนี้สำเร็จ', 'success'); renderVendors(); }
    else showToast(res.message, 'error');
}
function setupVendorTab() {
    document.getElementById('addVendorBtn').onclick = () => {
        if (!currentSettings.vendors) currentSettings.vendors = [];
        currentSettings.vendors.push({ name: 'เจ้าหนี้ใหม่', active: true });
        renderVendors();
        saveVendors();
    };
    document.getElementById('prevVendorPage').onclick = () => { if(vendorPage>1) { vendorPage--; renderVendors(); } };
    document.getElementById('nextVendorPage').onclick = () => { if(vendorPage<vendorTotalPages) { vendorPage++; renderVendors(); } };
    document.getElementById('vendorSearch').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = (currentSettings.vendors||[]).filter(v => v.name.toLowerCase().includes(term));
        vendorPage=1; vendorTotalPages=Math.ceil(filtered.length/20);
        renderVendors(filtered);
    });
}

// Checkers
async function loadCheckers() {
    const res = await API.listUsers();
    if (res.success) {
        const checkers = res.users.filter(u => u.role === 'editor' && u.active);
        const tbody = document.getElementById('checkerTable');
        tbody.innerHTML = '';
        checkers.forEach(c => {
            const row = tbody.insertRow();
            row.insertCell(0).innerText = c.username;
            row.insertCell(1).innerText = c.email;
            row.insertCell(2).innerText = c.dept || '-';
        });
    }
}

// Display
function setupDisplayTab() {
    const display = currentSettings.display || {};
    document.getElementById('dashboardCardCount').value = display.dashboard_card_count || '5';
    document.getElementById('dashboardTopDeptCount').value = display.dashboard_top_dept_count || '5';
    document.getElementById('saveDisplayBtn').addEventListener('click', async () => {
        const settings = {
            display: {
                dashboard_card_count: document.getElementById('dashboardCardCount').value,
                dashboard_top_dept_count: document.getElementById('dashboardTopDeptCount').value
            }
        };
        showLoading();
        const res = await API.saveSettings(settings);
        hideLoading();
        if (res.success) showToast('บันทึกการแสดงผลสำเร็จ', 'success');
        else showToast(res.message, 'error');
    });
}

// Edit Items
async function searchEditItems() {
    const filters = {
        REQUEST_NO: document.getElementById('editSearchRequest').value,
        VENDOR: document.getElementById('editSearchVendor').value,
        STATUS: document.getElementById('editSearchStatus').value
    };
    const res = await API.getRegisterList(filters, { page: currentEditPage, limit: 20 });
    if (res.success) {
        editItemsList = res.data;
        editTotalPages = res.totalPages;
        renderEditTable();
        document.getElementById('editPageInfo').innerText = `หน้า ${currentEditPage} / ${editTotalPages||1}`;
    }
}
function renderEditTable() {
    const tbody = document.getElementById('editItemsTableBody');
    if (!tbody) return;
    if (editItemsList.length === 0) { tbody.innerHTML = '<tr><td colspan="9" class="text-center">ไม่พบข้อมูล</td></tr>'; return; }
    let html = '';
    editItemsList.forEach(row => {
        const statusBadge = `<span class="status-badge ${getStatusBadgeClass(row.STATUS)}">${row.STATUS}</span>`;
        html += `<tr>
            <td>${statusBadge}</td>
            <td>${row.REGISTER_NO_DISPLAY||''}<br><span class="text-xs">${row.RECEIVE_NO_DISPLAY||''}</span></td>
            <td>${row.REQUEST_NO_DISPLAY||''}<br><span class="text-xs">ฎีกา: ${row.DK_NO_DISPLAY||''}</span></td>
            <td>${escapeHtml(row.VENDOR)}</td>
            <td class="max-w-xs truncate">${escapeHtml(row.DESCRIPTION)}</td>
            <td class="text-right">${formatCurrency(row.AMOUNT)}</td>
            <td>${row.DEPT||''}<br><span class="text-xs">${row.SENDER||''}</span></td>
            <td><button class="btn-cancel-item text-red-600" data-uuid="${row.UUID}" ${row.STATUS==='จ่ายแล้ว'?'disabled':''}><i class="fas fa-ban"></i> ยกเลิก</button></td>
            <td><button class="btn-edit-item text-blue-600" data-uuid="${row.UUID}"><i class="fas fa-edit"></i> แก้ไข</button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
    document.querySelectorAll('.btn-cancel-item').forEach(btn => btn.addEventListener('click', () => cancelItem(btn.dataset.uuid)));
    document.querySelectorAll('.btn-edit-item').forEach(btn => btn.addEventListener('click', () => openEditItemModal(btn.dataset.uuid)));
}
async function cancelItem(uuid) {
    const { value: note } = await Swal.fire({ title: 'หมายเหตุยกเลิก', input: 'text', inputPlaceholder: 'กรอกเหตุผล', showCancelButton: true });
    if (note === undefined) return;
    showLoading();
    const res = await API.cancelItem(uuid, note);
    hideLoading();
    if (res.success) { showToast('ยกเลิกรายการสำเร็จ', 'success'); searchEditItems(); }
    else showToast(res.message, 'error');
}
async function openEditItemModal(uuid) {
    const row = editItemsList.find(r => r.UUID === uuid);
    if (!row) return;
    const { value: form } = await Swal.fire({
        title: 'แก้ไขรายการ',
        html: `<input id="swal-request" class="swal2-input" placeholder="เลขที่ใบขอเบิก" value="${row.REQUEST_NO_DISPLAY||''}">
                <input id="swal-dk" class="swal2-input" placeholder="เลขที่ฎีกา" value="${row.DK_NO_DISPLAY||''}">
                <input id="swal-vendor" class="swal2-input" placeholder="เจ้าหนี้" value="${escapeHtml(row.VENDOR)}">
                <input id="swal-amount" class="swal2-input" type="number" step="0.01" placeholder="จำนวนเงิน" value="${row.AMOUNT}">
                <textarea id="swal-desc" class="swal2-textarea" placeholder="รายการ">${escapeHtml(row.DESCRIPTION)}</textarea>`,
        focusConfirm: false,
        preConfirm: () => ({ request: document.getElementById('swal-request').value, dk: document.getElementById('swal-dk').value, vendor: document.getElementById('swal-vendor').value, amount: parseFloat(document.getElementById('swal-amount').value), description: document.getElementById('swal-desc').value })
    });
    if (form) {
        showLoading();
        const updates = { REQUEST_NO: form.request, DK_NO: form.dk, VENDOR: form.vendor, AMOUNT: form.amount, DESCRIPTION: form.description };
        const res = await API.editItem?.(uuid, updates) || await API.editItems([{ uuid, edits: updates }]);
        hideLoading();
        if (res.success) { showToast('แก้ไขสำเร็จ', 'success'); searchEditItems(); }
        else showToast(res.message, 'error');
    }
}
function setupEditItemsTab() {
    document.getElementById('searchEditItemsBtn').onclick = () => { currentEditPage=1; searchEditItems(); };
    document.getElementById('prevEditPage').onclick = () => { if(currentEditPage>1){currentEditPage--; searchEditItems();} };
    document.getElementById('nextEditPage').onclick = () => { if(currentEditPage<editTotalPages){currentEditPage++; searchEditItems();} };
}

// Backup & Restore
function setupBackupTab() {
    document.getElementById('exportBackupBtn').onclick = async () => {
        showLoading();
        const res = await API.exportData?.() || await API.getRegisterList({}, { page:1, limit:10000 });
        hideLoading();
        if (res.success) {
            const dataStr = JSON.stringify(res.data || res);
            const blob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `srdh_backup_${new Date().toISOString().slice(0,19)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else showToast('Export ไม่สำเร็จ', 'error');
    };
    document.getElementById('restoreBtn').onclick = async () => {
        const file = document.getElementById('restoreFile').files[0];
        if (!file) { showToast('กรุณาเลือกไฟล์', 'warning'); return; }
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            let data;
            if (file.name.endsWith('.json')) data = JSON.parse(content);
            else if (file.name.endsWith('.csv')) { /* parse csv */ data = []; }
            else if (file.name.endsWith('.xlsx')) { /* use SheetJS */ data = []; }
            else { showToast('รูปแบบไฟล์ไม่รองรับ', 'error'); return; }
            const confirm = await Swal.fire({ title: 'ยืนยันการกู้คืน', text: 'ข้อมูลทั้งหมดจะถูกแทนที่!', icon: 'warning', showCancelButton: true });
            if (!confirm.isConfirmed) return;
            showLoading();
            const res = await API.restoreData?.(data) || await API.saveSettings({ restore: data });
            hideLoading();
            if (res.success) showToast('กู้คืนข้อมูลสำเร็จ', 'success');
            else showToast(res.message, 'error');
        };
        reader.readAsText(file);
    };
}
