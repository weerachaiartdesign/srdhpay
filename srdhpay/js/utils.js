// utils.js
// ฟังก์ชันช่วยเหลือทั่วไปสำหรับ Frontend

// ==================== Dark Mode ====================
function initDarkMode() {
    // ตรวจสอบค่าที่เก็บใน localStorage
    const savedMode = localStorage.getItem('srdh_dark_mode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedMode === 'enabled' || (savedMode === null && prefersDark)) {
        enableDarkMode();
    } else {
        disableDarkMode();
    }
    
    // ผูก event กับ toggle button (ถ้ามี)
    const toggleBtn = document.getElementById('darkModeToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleDarkMode);
    }
}

function enableDarkMode() {
    document.documentElement.classList.add('dark');
    localStorage.setItem('srdh_dark_mode', 'enabled');
    updateDarkModeIcon();
}

function disableDarkMode() {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('srdh_dark_mode', 'disabled');
    updateDarkModeIcon();
}

function toggleDarkMode() {
    if (document.documentElement.classList.contains('dark')) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
}

function updateDarkModeIcon() {
    const icon = document.getElementById('darkModeIcon');
    if (!icon) return;
    if (document.documentElement.classList.contains('dark')) {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

// ==================== Formatting ====================
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 
                        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543;
    return `${day} ${month} ${year}`;
}

function formatCurrency(amount) {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    if (num % 1 === 0) return num.toString();
    return num.toFixed(2);
}

function getStatusBadgeClass(status) {
    const statusMap = {
        'รอเอกสาร': 'status-waiting',
        'รับเข้าระบบ': 'status-received',
        'ตรวจสอบ': 'status-checkup',
        'ส่งแก้ไข': 'status-editing',
        'ตรวจผ่าน': 'status-passed',
        'เสนอ': 'status-proposed',
        'อนุมัติ': 'status-approved',
        'จ่ายแล้ว': 'status-paid',
        'ยกเลิก': 'status-cancelled'
    };
    return statusMap[status] || 'status-waiting';
}

// ==================== Storage ====================
function getToken() {
    return localStorage.getItem('srdh_token');
}

function setToken(token) {
    localStorage.setItem('srdh_token', token);
}

function removeToken() {
    localStorage.removeItem('srdh_token');
}

function getUser() {
    const userStr = localStorage.getItem('srdh_user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
}

function setUser(user) {
    localStorage.setItem('srdh_user', JSON.stringify(user));
}

function removeUser() {
    localStorage.removeItem('srdh_user');
}

function clearSession() {
    removeToken();
    removeUser();
}

// ==================== Loading & Toast ====================
let loadingOverlay = null;

function showLoading(message = 'กำลังดำเนินการ...') {
    if (loadingOverlay) return;
    loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    loadingOverlay.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 flex flex-col items-center gap-4 shadow-xl">
            <div class="spinner"></div>
            <p class="text-gray-700 dark:text-gray-300">${message}</p>
        </div>
    `;
    document.body.appendChild(loadingOverlay);
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.remove();
        loadingOverlay = null;
    }
}

function showToast(message, type = 'success') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== Permission ====================
function hasPermission(module, role) {
    // จะใช้ permission matrix จาก backend จริงๆ แต่หน้านี้ใช้ค่า default เบื้องต้น
    const permissions = {
        dashboard: ['admin', 'manager', 'editor', 'checker', 'staff', 'guest'],
        list: ['admin', 'manager', 'editor', 'checker', 'staff', 'guest'],
        import: ['admin', 'manager', 'staff'],
        receive: ['admin', 'manager'],
        verify: ['admin', 'manager', 'editor'],
        approve: ['admin', 'manager'],
        payment: ['admin', 'manager', 'checker'],
        report: ['admin', 'manager'],
        auth_profile: ['admin', 'manager', 'editor', 'checker', 'staff'],
        auth_manage: ['admin', 'manager'],
        settings: ['admin', 'manager'],
        system: ['admin']
    };
    return permissions[module]?.includes(role) || false;
}

// ==================== Event Helpers ====================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==================== Export (global) ====================
window.utils = {
    initDarkMode, enableDarkMode, disableDarkMode, toggleDarkMode,
    formatDate, formatCurrency, formatNumber, getStatusBadgeClass,
    getToken, setToken, removeToken, getUser, setUser, removeUser, clearSession,
    showLoading, hideLoading, showToast,
    hasPermission, debounce
};
