// js/sidebar.js
// Sidebar Component - สร้าง side menu และจัดการ toggle

function renderSidebar() {
    const user = getUser();
    const role = user?.role || 'guest';
    
    // เมนูตามสิทธิ์
    const menus = [
        { icon: 'fas fa-tachometer-alt', label: 'Dashboard', href: 'dashboard.html', roles: ['admin', 'manager', 'editor', 'checker', 'staff', 'guest'] },
        { icon: 'fas fa-list', label: 'ทะเบียนเบิกจ่าย', href: 'list.html', roles: ['admin', 'manager', 'editor', 'checker', 'staff', 'guest'] },
        { icon: 'fas fa-upload', label: 'นำเข้าข้อมูล', href: 'import.html', roles: ['admin', 'manager', 'staff'] },
        { icon: 'fas fa-inbox', label: 'รับเข้าระบบ', href: 'receive.html', roles: ['admin', 'manager'] },
        { icon: 'fas fa-check-double', label: 'บันทึกการตรวจสอบ', href: 'verify.html', roles: ['admin', 'manager', 'editor'] },
        { icon: 'fas fa-thumbs-up', label: 'เสนอและอนุมัติ', href: 'approve.html', roles: ['admin', 'manager'] },
        { icon: 'fas fa-money-bill-wave', label: 'บันทึกการจ่าย', href: 'payment.html', roles: ['admin', 'manager', 'checker'] },
        { icon: 'fas fa-chart-line', label: 'รายงาน', href: 'report.html', roles: ['admin', 'manager'] },
        { icon: 'fas fa-user-circle', label: 'ตั้งค่าผู้ใช้งาน', href: 'auth.html', roles: ['admin', 'manager', 'editor', 'checker', 'staff'] },
        { icon: 'fas fa-sliders-h', label: 'ตั้งค่าโปรแกรม', href: 'settings.html', roles: ['admin', 'manager'] },
        { icon: 'fas fa-cog', label: 'ตั้งค่าระบบ', href: 'system.html', roles: ['admin'] }
    ];
    
    const filteredMenus = menus.filter(menu => menu.roles.includes(role));
    
    let menuHtml = '';
    filteredMenus.forEach(menu => {
        const isActive = window.location.pathname.includes(menu.href.replace('.html', ''));
        menuHtml += `
            <a href="${menu.href}" class="sidebar-menu-item ${isActive ? 'active' : ''}">
                <i class="${menu.icon} w-5"></i>
                <span>${menu.label}</span>
            </a>
        `;
    });
    
    const sidebarHtml = `
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <div class="flex items-center gap-3">
                    <img src="icons/srdhpay-152.png" class="w-10 h-10 rounded-lg" alt="Logo">
                    <div>
                        <div class="font-bold text-purple-700 dark:text-purple-300">SRDH PAY</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">ระบบทะเบียนเบิกจ่าย</div>
                    </div>
                </div>
            </div>
            <div class="sidebar-menu">
                ${menuHtml}
                <hr class="my-4 border-gray-200 dark:border-gray-700">
                <button id="logoutBtn" class="sidebar-menu-item w-full text-left">
                    <i class="fas fa-sign-out-alt w-5"></i>
                    <span>ออกจากระบบ</span>
                </button>
            </div>
        </div>
        <div class="sidebar-overlay" id="sidebarOverlay"></div>
    `;
    
    // ถ้ามี container อยู่แล้วให้แทนที่
    const container = document.getElementById('sidebar-container');
    if (container) {
        container.innerHTML = sidebarHtml;
    } else {
        // ถ้าไม่มี ให้สร้าง container และ append
        const div = document.createElement('div');
        div.id = 'sidebar-container';
        div.innerHTML = sidebarHtml;
        document.body.insertBefore(div, document.body.firstChild);
    }
    
    // Event listeners
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        Swal.fire({
            title: 'ยืนยันการออกจากระบบ',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ออกจากระบบ',
            cancelButtonText: 'ยกเลิก'
        }).then(result => {
            if (result.isConfirmed) {
                logout();
            }
        });
    });
    
    // เปิด/ปิด sidebar (hamburger)
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (hamburger && sidebar && overlay) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('open');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
        });
    }
}

function initHeader() {
    const user = getUser();
    const role = user?.role || 'guest';
    const username = user?.username || (user?.is_guest ? 'ผู้เยี่ยมชม' : 'ไม่ระบุ');
    
    const headerHtml = `
        <header class="main-header no-print">
            <div class="header-left">
                <div class="hamburger" id="hamburger">
                    <i class="fas fa-bars"></i>
                </div>
                <div class="flex items-center gap-2">
                    <img src="icons/srdhpay-152.png" class="w-8 h-8 rounded-lg" alt="Logo">
                    <span class="font-semibold text-gray-800 dark:text-white">SRDH PAY</span>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <span class="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
                    <i class="fas fa-user mr-1"></i> ${username} (${role})
                </span>
                <button id="darkModeToggleHeader" class="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    <i id="darkModeIconHeader" class="fas fa-moon"></i>
                </button>
            </div>
        </header>
    `;
    
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        headerContainer.innerHTML = headerHtml;
        // ผูก dark mode toggle
        const toggleBtn = document.getElementById('darkModeToggleHeader');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleDarkMode);
        }
        updateDarkModeIcon(); // ใช้ฟังก์ชันจาก utils
    }
}

// เรียกใช้เมื่อหน้าโหลด
document.addEventListener('DOMContentLoaded', () => {
    if (!getToken() && !window.location.pathname.includes('index.html')) {
        // ถ้าไม่มี token และไม่อยู่ที่หน้า login ให้ redirect ไป login
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
            return;
        }
    }
    renderSidebar();
    initHeader();
    initInactivityTimer();
});
