// js/list.js
let currentPage = 1;
let currentLimit = 50;
let totalPages = 1;
let currentFilters = {};

async function loadList() {
    showLoading('กำลังโหลดข้อมูล...');
    try {
        const result = await API.getRegisterList(currentFilters, {
            page: currentPage,
            limit: currentLimit,
            sortBy: 'RECEIVE_DATE',
            sortOrder: 'DESC'
        });
        hideLoading();
        if (!result.success) {
            showToast(result.message || 'โหลดข้อมูลล้มเหลว', 'error');
            return;
        }
        renderList(result.data);
        totalPages = result.totalPages;
        document.getElementById('pageInfo').innerText = `หน้า ${currentPage} / ${totalPages}`;
        document.getElementById('prevPage').disabled = currentPage === 1;
        document.getElementById('nextPage').disabled = currentPage === totalPages;
    } catch (err) {
        hideLoading();
        console.error(err);
        showToast('เกิดข้อผิดพลาด', 'error');
    }
}

function renderList(rows) {
    const tbody = document.getElementById('tableBody');
    const mobileContainer = document.getElementById('mobileCards');
    if (!tbody && !mobileContainer) return;

    if (!rows || rows.length === 0) {
        const emptyMsg = '<tr><td colspan="7" class="text-center">ไม่มีข้อมูล</td></tr>';
        if (tbody) tbody.innerHTML = emptyMsg;
        if (mobileContainer) mobileContainer.innerHTML = '<div class="text-center text-gray-500">ไม่มีข้อมูล</div>';
        return;
    }

    // Desktop table
    if (tbody) {
        let html = '';
        rows.forEach((row, idx) => {
            const statusClass = getStatusBadgeClass(row.STATUS);
            html += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" data-uuid="${row.UUID}">
                <td class="whitespace-nowrap text-sm">${formatDate(row.RECEIVE_DATE)}<br><span class="text-xs text-gray-500">${row.RECEIVE_NO_DISPLAY || '-'}</span></td>
                <td><span class="status-badge ${statusClass}">${row.STATUS || '-'}</span></td>
                <td>${row.REQUEST_NO_DISPLAY || '-'}<br><span class="text-xs text-gray-500">ฎีกา: ${row.DK_NO_DISPLAY || '-'}</span></td>
                <td class="font-semibold">${escapeHtml(row.VENDOR || '-')}</td>
                <td class="max-w-xs truncate">${escapeHtml(row.DESCRIPTION || '-')}</td>
                <td class="font-bold text-right">${formatCurrency(row.AMOUNT)}</td>
                <td>${row.MONEY_TYPE || '-'}<br><span class="text-xs text-gray-500">${row.DEPT || '-'}</span></td>
            </tr>`;
        });
        tbody.innerHTML = html;
        // attach click event for detail
        document.querySelectorAll('#tableBody tr').forEach(tr => {
            tr.addEventListener('click', (e) => {
                const uuid = tr.dataset.uuid;
                if (uuid) showDetail(uuid);
            });
        });
    }

    // Mobile cards
    if (mobileContainer) {
        let cards = '';
        rows.forEach(row => {
            const statusClass = getStatusBadgeClass(row.STATUS);
            cards += `
                <div class="mobile-card" data-uuid="${row.UUID}">
                    <div class="flex justify-between items-start mb-2">
                        <span class="status-badge ${statusClass}">${row.STATUS}</span>
                        <span class="text-xs text-gray-500">${row.RECEIVE_NO_DISPLAY || ''}</span>
                    </div>
                    <div class="text-sm"><span class="text-gray-500">ใบขอเบิก:</span> ${row.REQUEST_NO_DISPLAY || '-'}</div>
                    <div class="text-sm"><span class="text-gray-500">ฎีกา:</span> ${row.DK_NO_DISPLAY || '-'}</div>
                    <div class="font-semibold mt-1">${escapeHtml(row.VENDOR || '-')}</div>
                    <div class="text-sm truncate">${escapeHtml(row.DESCRIPTION || '-')}</div>
                    <div class="flex justify-between mt-2">
                        <span class="font-bold text-purple-600">${formatCurrency(row.AMOUNT)}</span>
                        <span class="text-xs text-gray-500">${row.MONEY_TYPE || ''} / ${row.DEPT || ''}</span>
                    </div>
                </div>
            `;
        });
        mobileContainer.innerHTML = cards;
        document.querySelectorAll('.mobile-card').forEach(card => {
            card.addEventListener('click', () => showDetail(card.dataset.uuid));
        });
    }
}

async function showDetail(uuid) {
    showLoading();
    try {
        // ดึงรายการทั้งหมดแล้วกรองหา uuid นั้น (หรือสร้าง API getRegisterItem)
        const result = await API.getRegisterList({ uuid: uuid }, { page: 1, limit: 1 });
        hideLoading();
        if (!result.success || !result.data.length) {
            showToast('ไม่พบข้อมูล', 'error');
            return;
        }
        const row = result.data[0];
        const modal = document.getElementById('detailModal');
        const content = document.getElementById('detailContent');
        content.innerHTML = `
            <h3 class="text-xl font-bold mb-4">รายละเอียดรายการ</h3>
            <div class="space-y-2 text-sm">
                <div><span class="font-semibold">เลขที่รับ:</span> ${row.RECEIVE_NO_DISPLAY || '-'}</div>
                <div><span class="font-semibold">เลขที่ใบขอเบิก:</span> ${row.REQUEST_NO_DISPLAY || '-'}</div>
                <div><span class="font-semibold">เลขที่ฎีกา:</span> ${row.DK_NO_DISPLAY || '-'}</div>
                <div><span class="font-semibold">ประเภทเงิน:</span> ${row.MONEY_TYPE || '-'}</div>
                <div><span class="font-semibold">หน่วยงาน:</span> ${row.DEPT || '-'}</div>
                <div><span class="font-semibold">ผู้ส่งเอกสาร:</span> ${row.SENDER || '-'}</div>
                <div><span class="font-semibold">เลขที่ใบกัน:</span> ${row.RESERVE_NO || '-'}</div>
                <div><span class="font-semibold">จำนวนเงินกัน:</span> ${formatCurrency(row.RESERVE_AMOUNT)}</div>
                <div><span class="font-semibold">เลข e-GP:</span> ${row.EGP_NO || '-'}</div>
                <div><span class="font-semibold">Invoice:</span> ${row.INVOICE || '-'}</div>
                <div><span class="font-semibold">ชื่อเจ้าหนี้/บริษัท:</span> ${escapeHtml(row.VENDOR || '-')}</div>
                <div><span class="font-semibold">จำนวนเงินขอเบิก:</span> ${formatCurrency(row.AMOUNT)}</div>
                <div><span class="font-semibold">รายการ:</span> ${escapeHtml(row.DESCRIPTION || '-')}</div>
                <div><span class="font-semibold">ผู้ตรวจ:</span> ${row.EDITOR || '-'}</div>
                <hr class="my-2">
                <div><span class="font-semibold">รับเข้าระบบ:</span> ${formatDate(row.RECEIVE_DATE)}</div>
                <div><span class="font-semibold">ตรวจสอบ:</span> ${row.EDIT_DATE ? formatDate(row.EDIT_DATE) : '-'}</div>
                <div><span class="font-semibold">ส่งแก้ไข:</span> ${row.EDIT_DATE ? formatDate(row.EDIT_DATE) : '-'}</div>
                <div><span class="font-semibold">ตรวจผ่าน:</span> ${formatDate(row.PASS_DATE)}</div>
                <div><span class="font-semibold">เสนอ:</span> ${formatDate(row.PROPOSE_DATE)}</div>
                <div><span class="font-semibold">อนุมัติ:</span> ${formatDate(row.APPROVE_DATE)}</div>
                <div><span class="font-semibold">จ่ายแล้ว:</span> ${formatDate(row.PAY_DATE)}</div>
            </div>
        `;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.querySelectorAll('.closeModal').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            });
        });
    } catch(e) {
        hideLoading();
        showToast('ไม่สามารถแสดงรายละเอียดได้', 'error');
    }
}

async function loadFilters() {
    const settings = await API.getSettings();
    if (settings.success && settings.settings) {
        const moneySelect = document.getElementById('filterMoneyType');
        const deptSelect = document.getElementById('filterDept');
        if (moneySelect) {
            moneySelect.innerHTML = '<option value="">ทั้งหมด (ประเภทเงิน)</option>';
            settings.settings.money_types.forEach(mt => {
                moneySelect.innerHTML += `<option value="${escapeHtml(mt.name)}">${escapeHtml(mt.name)}</option>`;
            });
        }
        if (deptSelect) {
            deptSelect.innerHTML = '<option value="">ทั้งหมด (หน่วยงาน)</option>';
            settings.settings.depts.forEach(d => {
                deptSelect.innerHTML += `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`;
            });
        }
    }
}

function initListPage() {
    loadFilters();
    const searchBtn = document.getElementById('searchBtn');
    const resetBtn = document.getElementById('resetBtn');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const limitSelect = document.getElementById('pageLimit');

    const gatherFilters = () => {
        currentFilters = {
            REQUEST_NO: document.getElementById('filterRequestNo')?.value,
            DK_NO: document.getElementById('filterDkNo')?.value,
            RECEIVE_NO: document.getElementById('filterReceiveNo')?.value,
            VENDOR: document.getElementById('filterVendor')?.value,
            MONEY_TYPE: document.getElementById('filterMoneyType')?.value,
            DEPT: document.getElementById('filterDept')?.value,
            STATUS: document.getElementById('filterStatus')?.value
        };
        Object.keys(currentFilters).forEach(k => if (!currentFilters[k]) delete currentFilters[k]);
        currentPage = 1;
        loadList();
    };

    searchBtn?.addEventListener('click', gatherFilters);
    resetBtn?.addEventListener('click', () => {
        document.getElementById('filterRequestNo').value = '';
        document.getElementById('filterDkNo').value = '';
        document.getElementById('filterReceiveNo').value = '';
        document.getElementById('filterVendor').value = '';
        document.getElementById('filterMoneyType').value = '';
        document.getElementById('filterDept').value = '';
        document.getElementById('filterStatus').value = '';
        gatherFilters();
    });
    prevBtn?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadList(); } });
    nextBtn?.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; loadList(); } });
    limitSelect?.addEventListener('change', (e) => { currentLimit = parseInt(e.target.value); currentPage = 1; loadList(); });
    gatherFilters();
}
