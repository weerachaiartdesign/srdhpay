// js/app.js - Main application script

import { auth, getCurrentUser, setCurrentUser, setToken, statusMap, getToken } from './api.js';

// ---- Component Loader ----
async function loadComponent(selector, url) {
  try {
    console.log(`Loading component: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }
    const html = await response.text();
    const element = document.querySelector(selector);
    if (element) {
      element.innerHTML = html;
      console.log(`Component loaded: ${url}`);
    } else {
      console.warn(`Selector "${selector}" not found for ${url}`);
    }
    return html;
  } catch (err) {
    console.error(`Failed to load component ${url}:`, err);
    const element = document.querySelector(selector);
    if (element) {
      element.innerHTML = `<div class="text-red-500 p-4 text-center">ไม่สามารถโหลด component (${url})</div>`;
    }
    throw err;
  }
}

// Load header and sidebar
export async function loadLayout() {
  console.log('Loading layout...');
  try {
    await loadComponent('#header-container', '/header.html');
    await loadComponent('#sidebar-container', '/sidebar.html');
    setupUserInfo();
    setupDarkModeToggle();
    highlightActiveMenu();
    setupHamburger();
    // เรียกใช้ฟังก์ชันนี้หลังจาก sidebar โหลดเสร็จ
    initSidebarVisibility();
    console.log('Layout loaded successfully');
  } catch (err) {
    console.error('Layout loading failed:', err);
    showToast('เกิดข้อผิดพลาดในการโหลดหน้าเว็บ กรุณารีเฟรช', 'error');
    throw err;
  }
}

// ---- Hamburger Toggle ----
export function toggleSidebar() {
  const sidebar = document.getElementById('sidebar-container');
  if (!sidebar) return;
  
  // ใช้ class hidden สลับ
  if (sidebar.classList.contains('hidden')) {
    sidebar.classList.remove('hidden');
    sidebar.style.display = 'flex'; // หรือ 'block' ก็ได้
  } else {
    sidebar.classList.add('hidden');
    sidebar.style.display = 'none';
  }
}

function setupHamburger() {
  const btn = document.getElementById('hamburgerBtn');
  if (btn) {
    // ลบ event listener เก่า (ถ้ามี) เพื่อป้องกันการซ้อน
    btn.removeEventListener('click', toggleSidebar);
    btn.addEventListener('click', toggleSidebar);
    console.log('Hamburger button setup complete');
  } else {
    console.warn('Hamburger button not found');
  }
}

// ---- Load Layout (ปรับปรุง) ----
export async function loadLayout() {
  console.log('Loading layout...');
  try {
    await loadComponent('#header-container', '/header.html');
    await loadComponent('#sidebar-container', '/sidebar.html');
    setupUserInfo();
    setupDarkModeToggle();
    highlightActiveMenu();
    setupHamburger(); // เรียกหลังจาก header โหลดเสร็จ
    initSidebarVisibility(); // เรียกเพื่อปรับเมนูตาม Role (ถ้ามี)
    console.log('Layout loaded successfully');
  } catch (err) {
    console.error('Layout loading failed:', err);
    showToast('เกิดข้อผิดพลาดในการโหลดหน้าเว็บ กรุณารีเฟรช', 'error');
    throw err;
  }
}

// ---- Sidebar Visibility (ปรับตาม Role) ----
export function initSidebarVisibility() {
  try {
    const user = getCurrentUser();
    if (!user) {
      console.log('No user, sidebar uses default (guest)');
      return;
    }
    const role = user.role || 'guest';
    
    // กำหนดเมนูที่ควรแสดงตาม Role
    const menuConfig = {
      guest: ['menuImport', 'menuReceive', 'menuVerify', 'menuApprove', 'menuPayment', 'menuReport', 'menuAuth', 'menuSettings', 'menuSystem'],
      staff: ['menuSystem'],
      editor: ['menuPayment', 'menuReport', 'menuAuth', 'menuSettings', 'menuSystem'],
      checker: ['menuReport', 'menuAuth', 'menuSettings', 'menuSystem'],
      manager: ['menuSystem'],
      admin: []
    };
    
    const hiddenMenus = menuConfig[role] || menuConfig.guest;
    hiddenMenus.forEach(menuId => {
      const el = document.getElementById(menuId);
      if (el) {
        el.style.display = 'none';
      }
    });
    console.log('Sidebar visibility applied for role:', role);
  } catch (err) {
    console.warn('Sidebar visibility error:', err);
  }
}

// ---- Auth Guard ----
export function requireAuth(redirect = true) {
  const user = getCurrentUser();
  const token = getToken();
  console.log('requireAuth - user:', user, 'token:', token ? 'exists' : 'none');
  if (!user || !token) {
    console.warn('No user or token, redirecting to login');
    if (redirect && !window.location.pathname.includes('index.html')) {
      window.location.href = '/index.html';
    }
    return null;
  }
  return user;
}

export function requireRole(allowedRoles, redirect = true) {
  const user = requireAuth(redirect);
  if (!user) return null;
  if (!allowedRoles.includes(user.role)) {
    console.warn(`Role ${user.role} not allowed, redirecting`);
    if (redirect) {
      window.location.href = '/dashboard.html';
    }
    return null;
  }
  return user;
}

// ---- Dark Mode ----
export function toggleDarkMode() {
  const html = document.documentElement;
  const isDark = html.classList.toggle('dark');
  localStorage.setItem('srdh_darkmode', isDark ? '1' : '0');
  updateDarkModeIcon();
  const user = getCurrentUser();
  if (user) {
    // Optionally update via API later
  }
}

export function loadDarkModePreference() {
  const stored = localStorage.getItem('srdh_darkmode');
  const user = getCurrentUser();
  let dark = false;
  if (stored !== null) {
    dark = stored === '1';
  } else if (user && user.darkmode === 1) {
    dark = true;
  }
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  updateDarkModeIcon();
}

function updateDarkModeIcon() {
  const isDark = document.documentElement.classList.contains('dark');
  const icon = document.getElementById('darkModeIcon');
  if (icon) {
    icon.textContent = isDark ? '☀️' : '🌙';
  }
}

function setupDarkModeToggle() {
  const toggle = document.getElementById('darkModeToggle');
  if (toggle) {
    toggle.addEventListener('click', toggleDarkMode);
  }
}

// ---- User Info in Header ----
function setupUserInfo() {
  const user = getCurrentUser();
  if (user) {
    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    if (nameEl) nameEl.textContent = user.username || user.email;
    if (roleEl) {
      const roleMap = {
        admin: 'ผู้ดูแลระบบ',
        manager: 'ผู้จัดการ',
        editor: 'ผู้ตรวจ',
        checker: 'ผู้จ่าย',
        staff: 'เจ้าหน้าที่',
        guest: 'ผู้เยี่ยมชม',
      };
      roleEl.textContent = roleMap[user.role] || user.role;
    }
  }
}

// ---- Highlight current menu ----
function highlightActiveMenu() {
  const current = window.location.pathname.split('/').pop() || 'dashboard.html';
  const links = document.querySelectorAll('#sidebar-container a');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href === current) {
      link.classList.add('active', 'bg-purple-100', 'dark:bg-purple-900');
    } else {
      link.classList.remove('active', 'bg-purple-100', 'dark:bg-purple-900');
    }
  });
}

// ---- Logout ----
export async function logout() {
  try {
    await auth.logout();
  } catch (e) {
    console.error('Logout error:', e);
  }
  setToken(null);
  setCurrentUser(null);
  window.location.href = '/index.html';
}

// ---- Loading overlay ----
export function showLoading(message = 'กำลังโหลด...') {
  let overlay = document.getElementById('loadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    overlay.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 flex flex-col items-center shadow-xl">
        <div class="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-3 text-gray-700 dark:text-gray-300" id="loadingText">${message}</p>
      </div>
    `;
    document.body.appendChild(overlay);
  } else {
    document.getElementById('loadingText').textContent = message;
    overlay.classList.remove('hidden');
  }
}

export function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.add('hidden');
}

// ---- Toast notification ----
export function showToast(message, type = 'success') {
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 ${colors[type] || 'bg-gray-500'} text-white px-6 py-3 rounded shadow-lg z-50 transition-opacity duration-500 max-w-md`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

// ---- Currency formatter ----
export function formatCurrency(amount) {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

// ---- Date formatter (Thai) ----
export function formatThaiDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
}

// ---- Initialize app ----
export async function initApp() {
  console.log('initApp called, path:', window.location.pathname);
  loadDarkModePreference();
  
  if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    console.log('Login page, skipping layout');
    return;
  }

  try {
    await loadLayout();
    console.log('Layout loaded');
  } catch (err) {
    console.error('initApp layout error:', err);
    showToast('ไม่สามารถโหลดส่วนประกอบของหน้าได้ กรุณารีเฟรช', 'error');
    // ถึงแม้ loadLayout จะล้มเหลว ระบบก็ยังพยายามทำงานต่อ
    // แต่ควรแจ้งผู้ใช้
  }

  const publicPages = ['index.html', ''];
  const current = window.location.pathname.split('/').pop();
  if (!publicPages.includes(current) && current !== '') {
    const user = requireAuth(true);
    if (user) {
      console.log('Authenticated user:', user.email);
    }
  }
}

// Re-export จาก api.js เพื่อให้ import จาก app.js ได้สะดวก
export { getCurrentUser, getToken, setToken, setCurrentUser };

// ---- เรียกใช้ Sidebar Visibility หลังจากโหลด Sidebar เสร็จ ----
export function initSidebarVisibility() {
  // ตรวจสอบว่า sidebar ถูกโหลดหรือยัง
  const sidebar = document.getElementById('sidebar-container');
  if (!sidebar) return;
  
  // รอให้ script ใน sidebar ทำงานก่อน
  setTimeout(() => {
    // ตรวจสอบว่ามี user หรือไม่
    const user = getCurrentUser();
    if (!user) {
      console.log('No user, sidebar will use guest mode');
      return;
    }
    
    // ถ้ามี user และ sidebar ยังไม่ถูกปรับ ให้บังคับปรับอีกครั้ง
    // โดยเรียกใช้ฟังก์ชัน initSidebar ใน sidebar (ถ้ามี)
    try {
      // ตรวจสอบว่า sidebar มีฟังก์ชัน initSidebar หรือไม่
      const sidebarScript = sidebar.querySelector('script');
      if (sidebarScript && typeof window.initSidebar === 'function') {
        window.initSidebar();
      } else {
        // ถ้าไม่มี ให้เช็ค role และซ่อน/แสดงเมนูด้วยตัวเอง
        applyMenuVisibility(user);
      }
    } catch (e) {
      console.warn('Sidebar visibility fallback:', e);
    }
  }, 100);
}

function applyMenuVisibility(user) {
  const role = user.role || 'guest';
  const menuIds = ['menuImport', 'menuReceive', 'menuVerify', 'menuApprove', 'menuPayment', 'menuReport', 'menuAuth', 'menuSettings', 'menuSystem'];
  
  // กำหนดว่า role ไหนควรเห็นเมนูอะไร
  const visibleMenus = {
    admin: menuIds,  // admin เห็นทุกอย่าง
    manager: ['menuImport', 'menuReceive', 'menuVerify', 'menuApprove', 'menuPayment', 'menuReport', 'menuAuth', 'menuSettings'],
    editor: ['menuImport', 'menuReceive', 'menuVerify'],
    checker: ['menuImport', 'menuReceive', 'menuVerify', 'menuPayment'],
    staff: ['menuImport'],
    guest: []  // guest ไม่เห็นอะไรเลย (เหลือแค่ Dashboard + List)
  };
  
  const visible = visibleMenus[role] || [];
  
  menuIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (visible.includes(id)) {
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
    }
  });
}

// Run on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready, calling initApp');
  initApp();
});

// Expose functions globally
window.logout = logout;
window.showToast = showToast;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.toggleSidebar = toggleSidebar;
