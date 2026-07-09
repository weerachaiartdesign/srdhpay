// js/app.js - Main application script

import { auth, getCurrentUser, setCurrentUser, setToken, statusMap } from './api.js';

// ---- Component Loader ----
async function loadComponent(selector, url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const element = document.querySelector(selector);
    if (element) {
      element.innerHTML = html;
    }
    return html;
  } catch (err) {
    console.error(`Failed to load component ${url}:`, err);
  }
}

// Load header and sidebar
export async function loadLayout() {
  await loadComponent('#header-container', '/header.html');
  await loadComponent('#sidebar-container', '/sidebar.html');
  // After loading, setup dynamic parts
  setupUserInfo();
  setupDarkModeToggle();
  highlightActiveMenu();
}

// ---- Auth Guard ----
export function requireAuth(redirect = true) {
  const user = getCurrentUser();
  if (!user) {
    if (redirect && window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
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
  // Update user darkmode preference (if logged in)
  const user = getCurrentUser();
  if (user) {
    // We'll update via API later
  }
  updateDarkModeIcon();
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

// ---- Show loading overlay ----
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

// ---- Toast notification (using simple div, can use SweetAlert2) ----
export function showToast(message, type = 'success') {
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 ${colors[type] || 'bg-gray-500'} text-white px-6 py-3 rounded shadow-lg z-50 transition-opacity duration-500`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// ---- Currency formatter ----
export function formatCurrency(amount) {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

// ---- Date formatter (Thai) ----
export function formatThaiDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
}

// ---- Initialize app ----
export async function initApp() {
  loadDarkModePreference();
  // Load layout if we are not on login page (or if we want header/sidebar everywhere)
  if (!window.location.pathname.includes('index.html')) {
    await loadLayout();
  }
  // Auth guard for pages that require login
  const publicPages = ['index.html', ''];
  const current = window.location.pathname.split('/').pop();
  if (!publicPages.includes(current) && current !== '') {
    const user = requireAuth(true);
    if (user) {
      // Optionally check permission for page
      // We'll implement page-specific permission check later
    }
  }
}

// Run on DOM ready
document.addEventListener('DOMContentLoaded', initApp);

// Expose logout globally
window.logout = logout;
