// js/system.js
let currentPermissions = [];

async function initSystemPage() {
    setupTabs();
    await loadPermissions();
    await loadSessionSettings();
    await loadAuditLogs();
    await loadTelegramSettings();
    await loadRetentionSettings();
    setupEventListeners();
}

function setupTabs() {
    const tabs = document.querySelectorAll('.system-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            document.querySelectorAll('.system-tab-content').forEach(content => content.classList.add('hidden'));
            document.getElementById(`${tabId}Tab`).classList.remove('hidden');
            tabs.forEach(t => t.classList.remove('bg-purple-100', 'text-purple-700', 'dark:bg-purple-900'));
            tab.classList.add('bg-purple-100', 'text-purple-700', 'dark:bg-purple-900');
            if (tabId === 'audit') loadAuditLogs();
        });
    });
    document.querySelector('.system-tab').click();
}

// Permission Matrix
async function loadPermissions() {
    const result = await API.getPermissions?.() || await API.getSettings(); // สมมติมี endpoint
    if (result.success && result.permissions) {
        currentPermissions = result.permissions;
        renderPermissionTable(currentPermissions);
    } else {
        // fallback default matrix
        currentPermissions = {
            dashboard: {admin:1,manager:1,editor:1,checker:1,staff:1,guest:1},
            list: {admin:1,manager:1,editor:1,checker:1,staff:1,guest:1},
            import: {admin:1,manager:1,staff:1},
            receive: {admin:1,manager:1},
            verify: {admin:1,manager:1,editor:1},
            approve: {admin:1,manager:1},
            payment: {admin:1,manager:1,checker:1},
            report: {admin:1,manager:1},
            auth_profile: {admin:1,manager:1,editor:1,checker:1,staff:1},
            auth_manage: {admin:1,manager:1},
            settings: {admin:1,manager:1},
            system: {admin:1}
        };
        renderPermissionTable(currentPermissions);
    }
}
function renderPermissionTable(perms) {
    const tbody = document.getElementById('permissionTableBody');
    if (!tbody) return;
    const modules = Object.keys(perms);
    const roles = ['admin','manager','editor','checker','staff','guest'];
    tbody.innerHTML = '';
    modules.forEach(module => {
        const row = tbody.insertRow();
        row.insertCell(0).innerText = module;
        roles.forEach(role => {
            const cell = row.insertCell();
            const isChecked = perms[module]?.[role] === 1 || perms[module]?.[role] === true;
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = isChecked;
            cb.dataset.module = module;
            cb.dataset.role = role;
            cb.addEventListener('change', (e) => {
                currentPermissions[module][role] = cb.checked ? 1 : 0;
            });
            cell.appendChild(cb);
        });
    });
}
async function savePermissions() {
    showLoading();
    const result = await API.savePermissions?.(currentPermissions) || await API.saveSettings({ permissions: currentPermissions });
    hideLoading();
    if (result.success) showToast('บันทึกสิทธิ์สำเร็จ', 'success');
    else showToast(result.message, 'error');
}

// Session Settings
async function loadSessionSettings() {
    const result = await API.getSystemSettings?.() || await API.getSettings();
    if (result.success) {
        const sys = result.settings?.system || {};
        document.getElementById('guestTimeout').value = sys.guest_timeout_hours || 2;
        document.getElementById('inactivityTimeout').value = sys.inactivity_logout_minutes || 30;
        document.getElementById('tokenAge').value = sys.token_age_hours || 12;
        document.getElementById('maxLoginRetry').value = sys.max_login_retry || 5;
    }
}
async function saveSessionSettings() {
    const settings = {
        system: {
            guest_timeout_hours: document.getElementById('guestTimeout').value,
            inactivity_logout_minutes: document.getElementById('inactivityTimeout').value,
            token_age_hours: document.getElementById('tokenAge').value,
            max_login_retry: document.getElementById('maxLoginRetry').value
        }
    };
    showLoading();
    const result = await API.saveSettings(settings);
    hideLoading();
    if (result.success) showToast('บันทึก Session Settings สำเร็จ', 'success');
    else showToast(result.message, 'error');
}

// Audit Logs
async function loadAuditLogs() {
    const result = await API.getAuditLogs?.() || await API.getSettings(); // ต้องมี endpoint จริง
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;
    if (!result.success || !result.logs) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">ไม่สามารถโหลด logs</td></tr>';
        return;
    }
    const logs = result.logs.slice(0, 200);
    tbody.innerHTML = '';
    logs.forEach(log => {
        const row = tbody.insertRow();
        row.insertCell(0).innerText = log.time || '';
        row.insertCell(1).innerText = log.email || log.username || '';
        row.insertCell(2).innerText = log.action || '';
        row.insertCell(3).innerText = log.detail || '';
    });
}
function exportAuditLogs() {
    // เรียก API เพื่อ export logs เป็น CSV
    API.exportAuditLogs?.().then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audit_logs.csv';
        a.click();
        URL.revokeObjectURL(url);
    }).catch(() => showToast('Export ไม่สำเร็จ', 'error'));
}

// Telegram Notification
async function loadTelegramSettings() {
    const result = await API.getTelegramSettings?.() || await API.getSettings();
    if (result.success && result.settings?.telegram) {
        const tg = result.settings.telegram;
        document.getElementById('telegramToken').value = tg.token || '';
        document.getElementById('telegramChatId').value = tg.chat_id || '';
        document.getElementById('telegramEnabled').checked = tg.enabled || false;
        const events = tg.events || [];
        document.querySelectorAll('.telegram-event').forEach(cb => {
            cb.checked = events.includes(cb.value);
        });
    }
}
async function saveTelegramSettings() {
    const events = [];
    document.querySelectorAll('.telegram-event:checked').forEach(cb => events.push(cb.value));
    const settings = {
        telegram: {
            token: document.getElementById('telegramToken').value,
            chat_id: document.getElementById('telegramChatId').value,
            enabled: document.getElementById('telegramEnabled').checked,
            events: events
        }
    };
    showLoading();
    const result = await API.saveSettings(settings);
    hideLoading();
    if (result.success) showToast('บันทึก Telegram Settings สำเร็จ', 'success');
    else showToast(result.message, 'error');
}
async function testTelegram() {
    showLoading('กำลังทดสอบ...');
    const result = await API.testTelegram?.();
    hideLoading();
    if (result.success) showToast('ส่งข้อความทดสอบสำเร็จ', 'success');
    else showToast(result.message || 'ไม่สามารถส่งได้', 'error');
}

// Data Retention
async function loadRetentionSettings() {
    const result = await API.getSystemSettings?.() || await API.getSettings();
    if (result.success) {
        const retention = result.settings?.system || {};
        document.getElementById('retentionEnabled').checked = retention.data_retention_enabled === 'true' || retention.data_retention_enabled === true;
        document.getElementById('retentionYears').value = retention.data_retention_years || 3;
    }
}
async function runRetention() {
    const confirm = await Swal.fire({
        title: 'ยืนยันการลบข้อมูลเก่า',
        text: `ระบบจะลบข้อมูลที่มีอายุเกิน ${document.getElementById('retentionYears').value} ปี โดยจะสำรองข้อมูลอัตโนมัติ`,
        icon: 'warning',
        showCancelButton: true
    });
    if (!confirm.isConfirmed) return;
    showLoading('กำลังดำเนินการ...');
    const result = await API.runDataRetention?.({ years: document.getElementById('retentionYears').value });
    hideLoading();
    if (result.success) showToast('ลบข้อมูลเก่าเสร็จสมบูรณ์', 'success');
    else showToast(result.message, 'error');
}

function setupEventListeners() {
    document.getElementById('savePermissionBtn')?.addEventListener('click', savePermissions);
    document.getElementById('saveSessionBtn')?.addEventListener('click', saveSessionSettings);
    document.getElementById('exportAuditBtn')?.addEventListener('click', exportAuditLogs);
    document.getElementById('refreshAuditBtn')?.addEventListener('click', loadAuditLogs);
    document.getElementById('saveTelegramBtn')?.addEventListener('click', saveTelegramSettings);
    document.getElementById('testTelegramBtn')?.addEventListener('click', testTelegram);
    document.getElementById('runRetentionBtn')?.addEventListener('click', runRetention);
}
