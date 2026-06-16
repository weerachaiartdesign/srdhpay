const API_BASE = window.API_BASE || 'https://srdhpay-api.weerachaiartdesign.workers.dev';

const app = document.getElementById('app');

function getToken() {
  return localStorage.getItem('token') || '';
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function logout() {
  localStorage.removeItem('token');
  renderLogin();
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }
  return data;
}

function renderLogin() {
  app.innerHTML = `
    <div class="card" style="max-width:420px;margin:0 auto;">
      <h2>เข้าสู่ระบบ</h2>
      <form id="loginForm">
        <div style="margin-bottom:12px;">
          <label>Email</label>
          <input name="email" type="email" placeholder="admin@srdh.local" required />
        </div>
        <div style="margin-bottom:12px;">
          <label>Password</label>
          <input name="password" type="password" placeholder="1234" required />
        </div>
        <button type="submit">Login</button>
      </form>
      <div id="loginMsg" style="margin-top:12px;color:#dc2626;"></div>
    </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const email = form.get('email');
    const password = form.get('password');
    const msg = document.getElementById('loginMsg');
    msg.textContent = 'กำลังเข้าสู่ระบบ...';

    try {
      const data = await api('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setToken(data.token);
      renderDashboard();
    } catch (err) {
      msg.textContent = err.message;
    }
  });
}

async function renderDashboard() {
  app.innerHTML = `<div class="card">กำลังโหลด...</div>`;

  try {
    const me = await api('/api/me');
    app.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div>
            <h2 style="margin:0 0 8px;">Dashboard</h2>
            <div>ผู้ใช้: <b>${me.user?.username || me.username || '-'}</b></div>
            <div>อีเมล: <b>${me.user?.email || me.email || '-'}</b></div>
            <div>บทบาท: <b>${me.user?.role || me.role || '-'}</b></div>
          </div>
          <button style="width:auto;padding:10px 16px;" id="logoutBtn">Logout</button>
        </div>
      </div>

      <div class="card">
        <h3>เมนูทดสอบ</h3>
        <div class="row">
          <button id="btnDept">โหลด Dept</button>
          <button id="btnMoney">โหลด Money Type</button>
        </div>
        <pre id="output" style="background:#0f172a;color:#e2e8f0;padding:16px;border-radius:12px;overflow:auto;margin-top:12px;"></pre>
      </div>
    `;

    document.getElementById('logoutBtn').addEventListener('click', logout);

    const output = document.getElementById('output');

    document.getElementById('btnDept').addEventListener('click', async () => {
      try {
        const data = await api('/api/settings/dept');
        output.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        output.textContent = err.message;
      }
    });

    document.getElementById('btnMoney').addEventListener('click', async () => {
      try {
        const data = await api('/api/settings/money-type');
        output.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        output.textContent = err.message;
      }
    });

  } catch (err) {
    app.innerHTML = `
      <div class="card">
        <h2>เกิดข้อผิดพลาด</h2>
        <p>${err.message}</p>
        <button id="backLogin">กลับไปหน้า Login</button>
      </div>
    `;
    document.getElementById('backLogin').addEventListener('click', renderLogin);
  }
}

(async function init() {
  if (getToken()) {
    renderDashboard();
  } else {
    renderLogin();
  }
})();
