// js/import.js
let items = [];      // array of { requestNo, dkNo, vendor, amount, description, moneyType, dept, sender, reserveNo, reserveAmount, egpNo, invoice }
let settings = null;

async function initImportPage() {
    await loadSettings();
    setupEventListeners();
    renderPreview();
    checkRegisterButton();
}

async function loadSettings() {
    const result = await API.getSettings();
    if (result.success) {
        settings = result.settings;
        populateDropdowns();
    } else {
        showToast('ไม่สามารถโหลดข้อมูลการตั้งค่า', 'error');
    }
}

function populateDropdowns() {
    const moneySelect = document.getElementById('moneyType');
    if (moneySelect && settings.money_types) {
        moneySelect.innerHTML = '';
        settings.money_types.forEach(mt => {
            moneySelect.innerHTML += `<option value="${escapeHtml(mt.name)}">${escapeHtml(mt.name)}</option>`;
        });
    }
    const vendorList = document.getElementById('vendorList');
    if (vendorList && settings.vendors) {
        vendorList.innerHTML = '';
        settings.vendors.forEach(v => {
            if (v.active !== false) vendorList.innerHTML += `<option value="${escapeHtml(v.name)}">`;
        });
    }
    // หน่วยงาน และผู้ส่งเอกสาร จะใช้จาก user หรือให้ admin/manager แก้ได้
    const user = getUser();
    if (user.role !== 'admin' && user.role !== 'manager') {
        document.getElementById('dept').value = user.dept || '';
        document.getElementById('dept').readOnly = true;
        document.getElementById('sender').value = user.username || '';
        document.getElementById('sender').readOnly = true;
    } else {
        document.getElementById('dept').readOnly = false;
        document.getElementById('sender').readOnly = false;
        // โหลดหน่วยงานจาก settings.depts สำหรับ admin/manager
        const deptInput = document.getElementById('dept');
        if (settings.depts && deptInput) {
            deptInput.setAttribute('list', 'deptList');
            let datalist = document.getElementById('deptList');
            if (!datalist) {
                datalist = document.createElement('datalist');
                datalist.id = 'deptList';
                document.body.appendChild(datalist);
            }
            datalist.innerHTML = '';
            settings.depts.forEach(d => {
                if (d.active !== false) datalist.innerHTML += `<option value="${escapeHtml(d.name)}">`;
            });
            deptInput.setAttribute('autocomplete', 'off');
        }
    }
}

function setupEventListeners() {
    document.getElementById('addManualBtn').addEventListener('click', () => openModal());
    document.getElementById('registerBtn').addEventListener('click', registerBatch);
    document.getElementById('printRegisterBtn').addEventListener('click', printRegister);
    document.getElementById('closeModalBtn').addEventListener('click', () => closeModal());
    document.getElementById('itemForm').addEventListener('submit', saveItem);
    // XLSX upload
    const fileInput = document.getElementById('fileInput');
    const dropArea = document.querySelector('.border-dashed');
    dropArea.addEventListener('click', () => fileInput.click());
    dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.classList.add('border-purple-700'); });
    dropArea.addEventListener('dragleave', () => dropArea.classList.remove('border-purple-700'));
    dropArea.addEventListener('drop', (e) => { e.preventDefault(); dropArea.classList.remove('border-purple-700'); const file = e.dataTransfer.files[0]; if(file) processFile(file); });
    fileInput.addEventListener('change', (e) => { if(e.target.files[0]) processFile(e.target.files[0]); });
}

function processFile(file) {
    if (file.size > 5 * 1024 * 1024) {
        showToast('ไฟล์ใหญ่เกิน 5MB', 'error');
        return;
    }
    document.getElementById('fileNameDisplay').innerText = file.name;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet);
        const newItems = rows.map(row => ({
            requestNo: row.bgdk_rcvno || '',
            dkNo: row.bgdk_dkno || '',
            vendor: row.bgdk_paytonm || '',
            amount: (parseFloat(row.bgdk_dkamt) || 0) + (parseFloat(row.bgdk_vatamt) || 0),
            description: (row.bgdk_note || '').split('\n')[0],
            moneyType: row.bgtype_name || '',
            egpNo: row.bgdk_egpno || '',
            // other fields may not exist in xlsx, keep blank for manual edit
            dept: '',
            sender: '',
            reserveNo: '',
            reserveAmount: '',
            invoice: ''
        })).filter(item => item.requestNo && item.vendor && item.amount > 0);
        
        if (newItems.length === 0) {
            showToast('ไม่พบข้อมูลที่ถูกต้องในไฟล์', 'error');
            return;
        }
        // merge with existing items? replace? (ตาม design: import แล้วเพิ่มเข้า preview)
        items.push(...newItems);
        renderPreview();
        checkRegisterButton();
        showToast(`นำเข้า ${newItems.length} รายการ กรุณาตรวจสอบ`, 'success');
    };
    reader.readAsArrayBuffer(file);
}

function openModal(itemData = null, index = -1) {
    const isEdit = index >= 0;
    document.getElementById('modalTitle').innerText = isEdit ? 'แก้ไขรายการ' : 'เพิ่มรายการ';
    document.getElementById('editIndex').value = index;
    const fields = ['dept','sender','moneyType','requestNo','dkNo','reserveNo','reserveAmount','egpNo','invoice','vendor','amount','description'];
    if (isEdit && itemData) {
        fields.forEach(f => { const el = document.getElementById(f); if(el) el.value = itemData[f] || ''; });
    } else {
        fields.forEach(f => { const el = document.getElementById(f); if(el && f!=='moneyType' && f!=='dept' && f!=='sender') el.value = ''; });
        const user = getUser();
        if (user.role !== 'admin' && user.role !== 'manager') {
            document.getElementById('dept').value = user.dept || '';
            document.getElementById('sender').value = user.username || '';
        } else {
            document.getElementById('dept').value = '';
            document.getElementById('sender').value = '';
        }
    }
    document.getElementById('itemModal').classList.remove('hidden');
    document.getElementById('itemModal').classList.add('flex');
}

function closeModal() {
    document.getElementById('itemModal').classList.add('hidden');
    document.getElementById('itemModal').classList.remove('flex');
    document.getElementById('itemForm').reset();
}

function saveItem(e) {
    e.preventDefault();
    const idx = parseInt(document.getElementById('editIndex').value);
    const item = {
        requestNo: document.getElementById('requestNo').value.trim(),
        dkNo: document.getElementById('dkNo').value.trim(),
        vendor: document.getElementById('vendor').value.trim(),
        amount: parseFloat(document.getElementById('amount').value) || 0,
        description: document.getElementById('description').value,
        moneyType: document.getElementById('moneyType').value,
        dept: document.getElementById('dept').value.trim(),
        sender: document.getElementById('sender').value.trim(),
        reserveNo: document.getElementById('reserveNo').value.trim(),
        reserveAmount: parseFloat(document.getElementById('reserveAmount').value) || 0,
        egpNo: document.getElementById('egpNo').value.trim(),
        invoice: document.getElementById('invoice').value.trim()
    };
    if (!item.requestNo || !item.vendor || item.amount <= 0 || !item.moneyType) {
        showToast('กรุณากรอกข้อมูลให้ครบ (เลขที่ใบขอเบิก, เจ้าหนี้, จำนวนเงิน, ประเภทเงิน)', 'error');
        return;
    }
    if (isNaN(idx) || idx < 0) {
        items.push(item);
    } else {
        items[idx] = item;
    }
    closeModal();
    renderPreview();
    checkRegisterButton();
}

function renderPreview() {
    const tbody = document.getElementById('previewTableBody');
    const mobileDiv = document.getElementById('mobilePreview');
    if (!tbody && !mobileDiv) return;
    if (items.length === 0) {
        if(tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center">ยังไม่มีรายการ</td></tr>';
        if(mobileDiv) mobileDiv.innerHTML = '<div class="text-center text-gray-500">ยังไม่มีรายการ</div>';
        return;
    }
    // Desktop
    if(tbody) {
        let html = '';
        items.forEach((item, idx) => {
            html += `<tr>
                <td>${escapeHtml(item.requestNo)}</td>
                <td>${escapeHtml(item.dkNo)}</td>
                <td>${escapeHtml(item.vendor)}</td>
                <td class="text-right">${formatCurrency(item.amount)}</td>
                <td class="truncate max-w-xs">${escapeHtml(item.description)}</td>
                <td>${escapeHtml(item.moneyType)}</td>
                <td><button class="text-purple-600 edit-item" data-idx="${idx}"><i class="fas fa-edit"></i></button> 
                    <button class="text-red-600 delete-item" data-idx="${idx}"><i class="fas fa-trash"></i></button></td>
             </tr>`;
        });
        tbody.innerHTML = html;
        document.querySelectorAll('.edit-item').forEach(btn => {
            btn.addEventListener('click', (e) => { const idx = parseInt(btn.dataset.idx); openModal(items[idx], idx); });
        });
        document.querySelectorAll('.delete-item').forEach(btn => {
            btn.addEventListener('click', (e) => { const idx = parseInt(btn.dataset.idx); items.splice(idx,1); renderPreview(); checkRegisterButton(); });
        });
    }
    // Mobile
    if(mobileDiv) {
        let cards = '';
        items.forEach((item, idx) => {
            cards += `<div class="mobile-card"><div class="font-bold">${escapeHtml(item.requestNo)}</div>
            <div>${escapeHtml(item.vendor)}</div><div class="text-purple-600">${formatCurrency(item.amount)}</div>
            <div class="text-sm text-gray-500">${escapeHtml(item.moneyType)}</div>
            <div class="flex gap-2 mt-2"><button class="text-purple-600 edit-item-mob" data-idx="${idx}">แก้ไข</button>
            <button class="text-red-600 delete-item-mob" data-idx="${idx}">ลบ</button></div></div>`;
        });
        mobileDiv.innerHTML = cards;
        document.querySelectorAll('.edit-item-mob').forEach(btn => {
            btn.addEventListener('click', (e) => { const idx = parseInt(btn.dataset.idx); openModal(items[idx], idx); });
        });
        document.querySelectorAll('.delete-item-mob').forEach(btn => {
            btn.addEventListener('click', (e) => { const idx = parseInt(btn.dataset.idx); items.splice(idx,1); renderPreview(); checkRegisterButton(); });
        });
    }
}

function checkRegisterButton() {
    const btn = document.getElementById('registerBtn');
    if (btn) btn.disabled = items.length === 0;
}

async function registerBatch() {
    const user = getUser();
    const maxLimit = (user.role === 'staff') ? 20 : 100;
    if (items.length > maxLimit) {
        showToast(`ไม่สามารถลงทะเบียนเกิน ${maxLimit} รายการต่อครั้ง`, 'error');
        return;
    }
    // แปลง items เป็นรูปแบบที่ API ต้องการ
    const payload = items.map(item => ({
        REQUEST_NO: item.requestNo,
        DK_NO: item.dkNo,
        VENDOR: item.vendor,
        AMOUNT: item.amount,
        DESCRIPTION: item.description,
        MONEY_TYPE: item.moneyType,
        DEPT: item.dept,
        SENDER: item.sender,
        RESERVE_NO: item.reserveNo,
        RESERVE_AMOUNT: item.reserveAmount,
        EGP_NO: item.egpNo,
        INVOICE: item.invoice
    }));
    showLoading('กำลังลงทะเบียน...');
    const result = await API.registerBatch(payload);
    hideLoading();
    if (result.success) {
        showToast(result.message, 'success');
        items = [];
        renderPreview();
        checkRegisterButton();
        // พิมพ์อัตโนมัติหลังลงทะเบียน
        printRegister(result.registerNoDisplay);
    } else {
        showToast(result.message || 'ลงทะเบียนล้มเหลว', 'error');
    }
}

function printRegister(registerNoDisplay) {
    if (!registerNoDisplay && items.length === 0) {
        showToast('ไม่มีรายการที่จะพิมพ์', 'warning');
        return;
    }
    // สร้าง print template
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html><head><title>ใบลงทะเบียน ${registerNoDisplay || ''}</title>
        <style>body{font-family: 'Inter',sans-serif;margin:15mm} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:8px;text-align:left}</style>
        </head><body><h2>ใบนำส่งเอกสารเบิกจ่าย</h2>
        <p>เลขที่ลงทะเบียน: ${registerNoDisplay || ''}</p>
        <p>ผู้ส่งเอกสาร: ${items[0]?.sender || ''}</p>
        <p>หน่วยงาน: ${items[0]?.dept || ''}</p>
        <table><thead><tr><th>วันที่ลงทะเบียน</th><th>ประเภทเงิน</th><th>เลขที่ใบขอเบิก</th><th>ชื่อเจ้าหนี้</th><th>รายการ</th><th>จำนวนเงิน</th></tr></thead><tbody>
        ${items.map(i => `<tr><td>${formatDate(new Date())}</td><td>${escapeHtml(i.moneyType)}</td><td>${escapeHtml(i.requestNo)}</td><td>${escapeHtml(i.vendor)}</td><td>${escapeHtml(i.description)}</td><td class="text-right">${formatCurrency(i.amount)}</td></tr>`).join('')}
        </tbody></table></body></html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, function(m){if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }
