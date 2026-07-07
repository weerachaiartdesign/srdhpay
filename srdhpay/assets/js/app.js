// ============================================================
// app.js — Utility กลางของทุกหน้า (Component Loader, Auth Guard, Format, Shortcuts)
// ============================================================

const STATUS_TH = {
  WAITING: 'รอเอกสาร', RECEIVED: 'รับเข้าระบบ', CHECKUP: 'ตรวจสอบ', EDITING: 'ส่งแก้ไข',
  PASSED: 'ตรวจผ่าน', PROPOSED: 'เสนอ', APPROVED: 'อนุมัติ', PAID: 'จ่ายแล้ว', CANCELLED: 'ยกเลิก'
};

// เมนูที่แต่ละ role เห็นได้ (ตรงกับค่าเริ่มต้นของ Permission Matrix ข้อ 5.12.1)
// หมายเหตุ: นี่คือ "ความสะดวกในการแสดงผล" เท่านั้น — สิทธิ์จริงถูกตรวจที่ Backend ทุกครั้งเสมอ (ข้อ 7.17)
const MENU_PERMISSION = {
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

const App = {
  getToken() { return localStorage.getItem('srdhpay_token') || ''; },
  getUser() {
    try { return JSON.parse(localStorage.getItem('srdhpay_user') || 'null'); } catch { return null; }
  },
  setSession(token, user) {
    localStorage.setItem('srdhpay_token', token);
    localStorage.setItem('srdhpay_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('srdhpay_token');
    localStorage.removeItem('srdhpay_user');
  },

  // เรียกในทุกหน้าที่ต้อง login (ยกเว้น index.html)
  requireLogin() {
    if (!this.getToken()) {
      location.href = 'index.html';
      return false;
    }
    return true;
  },

  // ซ่อนเมนูที่ role ปัจจุบันไม่มีสิทธิ์ (เรียกหลังโหลด sidebar component แล้ว)
  applyMenuPermission() {
    const user = this.getUser();
    if (!user) return;
    document.querySelectorAll('[data-menu]').forEach((el) => {
      const key = el.getAttribute('data-menu');
      const allowed = MENU_PERMISSION[key] || [];
      if (!allowed.includes(user.role)) el.classList.add('hidden');
    });
  },

  // โหลด header.html / sidebar.html มาแทรกในหน้า (Component Loader Pattern)
  async loadComponents() {
    const headerHolder = document.getElementById('header-placeholder');
    const sidebarHolder = document.getElementById('sidebar-placeholder');
    if (headerHolder) {
      headerHolder.innerHTML = await (await fetch('components/header.html')).text();
    }
    if (sidebarHolder) {
      sidebarHolder.innerHTML = await (await fetch('components/sidebar.html')).text();
    }
    this.applyMenuPermission();
    this.highlightCurrentMenu();
    this.bindHeaderEvents();
    this.initDarkMode();
  },

  highlightCurrentMenu() {
    const page = location.pathname.split('/').pop();
    document.querySelectorAll('#sidebar-placeholder a[href]').forEach((a) => {
      if (a.getAttribute('href') === page) a.classList.add('bg-[var(--color-primary-soft)]', 'font-semibold');
    });
  },

  bindHeaderEvents() {
    const user = this.getUser();
    const nameEl = document.getElementById('header-username');
    const posEl = document.getElementById('header-position');
    if (nameEl && user) nameEl.textContent = user.isGuest ? `ผู้เยี่ยมชม (${user.email})` : user.username;
    if (posEl && user) posEl.textContent = user.isGuest ? 'Guest' : (user.position || user.role);

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', () => this.confirmLogout());

    const darkToggle = document.getElementById('btn-darkmode');
    if (darkToggle) darkToggle.addEventListener('click', () => this.toggleDarkMode());

    const hamburger = document.getElementById('btn-hamburger');
    if (hamburger) hamburger.addEventListener('click', () => {
      document.getElementById('sidebar-placeholder')?.classList.toggle('mobile-open');
    });
  },

  async confirmLogout() {
    const result = await Swal.fire({
      title: 'ออกจากระบบ?', text: 'ต้องการออกจากระบบใช่หรือไม่', icon: 'question',
      showCancelButton: true, confirmButtonText: 'ออกจากระบบ', cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#9F7AEA'
    });
    if (!result.isConfirmed) return;
    try { await api.post('/api/auth/logout'); } catch { /* ignore */ }
    this.clearSession();
    location.href = 'index.html';
  },

  // ---------------- Dark Mode ----------------
  initDarkMode() {
    const user = this.getUser();
    const saved = localStorage.getItem('srdhpay_darkmode');
    const isDark = saved !== null ? saved === '1' : !!(user && user.darkmode);
    document.documentElement.classList.toggle('dark', isDark);
  },
  async toggleDarkMode() {
    const isDark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('srdhpay_darkmode', isDark ? '1' : '0');
    const user = this.getUser();
    if (user && !user.isGuest) {
      try { await api.put('/api/auth/profile', { darkmode: isDark }); } catch { /* ไม่ critical */ }
    }
  },

  // ---------------- Format ----------------
  thaiDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  },
  money(amount) {
    const n = Number(amount || 0);
    return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  statusBadge(status) {
    const label = STATUS_TH[status] || status || '-';
    return `<span class="badge badge-${status}">${label}</span>`;
  },
  emptyDash(v) { return (v === null || v === undefined || v === '') ? '-' : v; },

  // ---------------- Misc ----------------
  debounce(fn, wait = 400) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  },
  toast(message, icon = 'success') {
    Swal.fire({ toast: true, position: 'top-end', icon, title: message, showConfirmButton: false, timer: 2500, timerProgressBar: true });
  },
  errorAlert(err) {
    Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message || String(err), confirmButtonColor: '#9F7AEA' });
  },
  showLoading(title = 'กำลังประมวลผล...') {
    Swal.fire({ title, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  },
  closeLoading() { Swal.close(); },

  // ---------------- Keyboard Shortcuts (ข้อ 7.12) ----------------
  setupShortcuts({ onSave } = {}) {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (onSave) onSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        const search = document.querySelector('input[data-search-box]');
        if (search) { e.preventDefault(); search.focus(); }
      }
      if (e.key === 'Escape') {
        if (Swal.isVisible()) Swal.close();
      }
    });
  }
};

window.App = App;

// Local fallback ของ Local pagination/sort/filter preference (ข้อ 7.6)
const Pref = {
  get(key, def) {
    try { return JSON.parse(localStorage.getItem('pref_' + key)) ?? def; } catch { return def; }
  },
  set(key, value) { localStorage.setItem('pref_' + key, JSON.stringify(value)); }
};
window.Pref = Pref;
