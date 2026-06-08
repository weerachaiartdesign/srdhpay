// js/report.js
// รวมฟังก์ชันสำหรับ report_type.html และ report_status.html

// ========== Report Type ==========
async function loadTypeReport() {
    document.getElementById('reportDate').innerText = formatDate(new Date());
    showLoading('กำลังโหลดข้อมูล...');
    const result = await API.getRegisterList({}, { page: 1, limit: 10000 });
    hideLoading();
    if (!result.success) {
        document.getElementById('reportContainer').innerHTML = '<div class="text-red-500">โหลดข้อมูลล้มเหลว</div>';
        return;
    }
    const rows = result.data.filter(r => r.STATUS !== 'ยกเลิก');
    // Group by money type, then by dept
    const moneyTypes = [...new Set(rows.map(r => r.MONEY_TYPE).filter(t => t))];
    let html = '';
    for (const mt of moneyTypes) {
        const mtRows = rows.filter(r => r.MONEY_TYPE === mt);
        const deptMap = new Map();
        for (const row of mtRows) {
            const dept = row.DEPT || 'ไม่ระบุ';
            if (!deptMap.has(dept)) {
                deptMap.set(dept, { totalAmount: 0, paidAmount: 0, countTotal: 0, countPaid: 0 });
            }
            const d = deptMap.get(dept);
            d.totalAmount += parseFloat(row.AMOUNT) || 0;
            d.countTotal++;
            if (row.STATUS === 'อนุมัติ' || row.STATUS === 'จ่ายแล้ว') {
                d.paidAmount += parseFloat(row.AMOUNT) || 0;
                d.countPaid++;
            }
        }
        html += `<div class="card p-4 mb-4"><h3 class="text-lg font-bold text-purple-700 mb-3">${escapeHtml(mt)}</h3>
        <div class="overflow-x-auto"><table class="data-table w-full"><thead><tr>
        <th>หน่วยงาน</th><th>ฎีกาที่รับเข้าระบบ</th><th>ฎีกาจ่ายแล้ว</th><th>ฎีกาคงเหลือ</th><th>จำนวนเงินขอเบิกทั้งสิ้น</th><th>จำนวนเงินที่จ่ายแล้ว</th><th>จำนวนเงินคงเหลือยังไม่จ่าย</th></tr></thead><tbody>`;
        for (let [dept, data] of deptMap.entries()) {
            html += `<tr>
                <td>${escapeHtml(dept)}</td>
                <td class="text-center">${data.countTotal}</td>
                <td class="text-center">${data.countPaid}</td>
                <td class="text-center">${data.countTotal - data.countPaid}</td>
                <td class="text-right">${formatCurrency(data.totalAmount)}</td>
                <td class="text-right">${formatCurrency(data.paidAmount)}</td>
                <td class="text-right">${formatCurrency(data.totalAmount - data.paidAmount)}</td>
            </tr>`;
        }
        html += `</tbody></table></div></div>`;
    }
    if (html === '') html = '<div class="text-center">ไม่มีข้อมูล</div>';
    document.getElementById('reportContainer').innerHTML = html;
    document.getElementById('printBtn').addEventListener('click', () => window.print());
}

// ========== Report Status ==========
let currentStatusRows = [];

function initStatusReport() {
    document.getElementById('btnReceived').addEventListener('click', () => loadStatusReport('รับเข้าระบบ'));
    document.getElementById('btnEditing').addEventListener('click', () => loadStatusReport('ส่งแก้ไข'));
    document.getElementById('btnProposed').addEventListener('click', () => loadStatusReport('เสนอ'));
    document.getElementById('printStatusBtn').addEventListener('click', () => printStatusReport());
    // set default date range to current fiscal year
    const now = new Date();
    const fiscalYearStart = new Date(now.getFullYear() - (now.getMonth()<9?1:0), 9, 1);
    const fiscalYearEnd = new Date(now.getFullYear() - (now.getMonth()<9?1:0) + 1, 8, 30);
    document.getElementById('dateFrom').value = fiscalYearStart.toISOString().slice(0,10);
    document.getElementById('dateTo').value = fiscalYearEnd.toISOString().slice(0,10);
}

async function loadStatusReport(status) {
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    if (!dateFrom || !dateTo) {
        showToast('กรุณาเลือกช่วงวันที่', 'warning');
        return;
    }
    showLoading(`กำลังโหลดรายการ ${status}...`);
    const result = await API.getRegisterList({ STATUS: status }, { page: 1, limit: 10000 });
    hideLoading();
    if (!result.success) {
        showToast(result.message, 'error');
        return;
    }
    let rows = result.data;
    // filter by date range using RECEIVE_DATE
    rows = rows.filter(r => {
        if (!r.RECEIVE_DATE) return false;
        const d = new Date(r.RECEIVE_DATE);
        return d >= new Date(dateFrom) && d <= new Date(dateTo);
    });
    currentStatusRows = rows;
    renderStatusTable(rows);
}

function renderStatusTable(rows) {
    const tbody = document.getElementById('tableBody');
    const mobileDiv = document.getElementById('mobileCards');
    if (!tbody && !mobileDiv) return;
    if (rows.length === 0) {
        const empty = '<tr><td colspan="8" class="text-center">ไม่มีข้อมูล</td></tr>';
        if(tbody) tbody.innerHTML = empty;
        if(mobileDiv) mobileDiv.innerHTML = '<div class="text-center text-gray-500">ไม่มีข้อมูล</div>';
        return;
    }
    // Desktop
    if(tbody) {
        let html = '';
        rows.forEach(row => {
            html += `<tr>
                <td>${formatDate(row.RECEIVE_DATE)}</td>
                <td>${row.REQUEST_NO_DISPLAY || '-'}</td>
                <td>${row.DK_NO_DISPLAY || '-'}</td>
                <td>${escapeHtml(row.VENDOR)}</td>
                <td class="max-w-xs truncate">${escapeHtml(row.DESCRIPTION)}</td>
                <td class="text-right">${formatCurrency(row.AMOUNT)}</td>
                <td>${row.DEPT || '-'}</td>
                <td>${row.SENDER || '-'}</td>
            <tr>`;
        });
        tbody.innerHTML = html;
    }
    // Mobile
    if(mobileDiv) {
        let cards = '';
        rows.forEach(row => {
            cards += `<div class="mobile-card">
                <div><span class="text-gray-500">วันที่รับเข้า:</span> ${formatDate(row.RECEIVE_DATE)}</div>
                <div><span class="text-gray-500">เลขที่ใบขอเบิก:</span> ${row.REQUEST_NO_DISPLAY}</div>
                <div><span class="text-gray-500">เลขที่ฎีกา:</span> ${row.DK_NO_DISPLAY}</div>
                <div><span class="text-gray-500">เจ้าหนี้:</span> ${escapeHtml(row.VENDOR)}</div>
                <div><span class="text-gray-500">รายการ:</span> ${escapeHtml(row.DESCRIPTION)}</div>
                <div class="font-bold">${formatCurrency(row.AMOUNT)}</div>
                <div><span class="text-gray-500">หน่วยงาน:</span> ${row.DEPT}</div>
                <div><span class="text-gray-500">ผู้ส่ง:</span> ${row.SENDER}</div>
            </div>`;
        });
        mobileDiv.innerHTML = cards;
    }
}

function printStatusReport() {
    if (currentStatusRows.length === 0) {
        showToast('ไม่มีข้อมูลที่จะพิมพ์', 'warning');
        return;
    }
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html><head><title>รายงานสถานะฎีกา</title>
        <style>body{font-family: 'Inter',sans-serif;margin:15mm} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:8px}</style>
        </head><body><h2>รายงานสถานะฎีกา</h2>
        <p>วันที่พิมพ์: ${formatDate(new Date())}</p>
        <table><thead><tr><th>วันที่รับเข้า</th><th>เลขที่ใบขอเบิก</th><th>เลขที่ฎีกา</th><th>ชื่อเจ้าหนี้</th><th>รายการ</th><th>จำนวนเงิน</th><th>หน่วยงาน</th><th>ผู้ส่งเอกสาร</th></tr></thead><tbody>
        ${currentStatusRows.map(r => `<tr>
            <td>${formatDate(r.RECEIVE_DATE)}</td>
            <td>${r.REQUEST_NO_DISPLAY || '-'}</td>
            <td>${r.DK_NO_DISPLAY || '-'}</td>
            <td>${escapeHtml(r.VENDOR)}</td>
            <td>${escapeHtml(r.DESCRIPTION)}</td>
            <td class="text-right">${formatCurrency(r.AMOUNT)}</td>
            <td>${r.DEPT || '-'}</td>
            <td>${r.SENDER || '-'}</td>
        </tr>`).join('')}
        </tbody></table></body></html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, function(m){if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }
