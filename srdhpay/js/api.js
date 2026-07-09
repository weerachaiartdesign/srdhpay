// js/api.js - API Client for Srdh Pay

const API_BASE = 'https://srdhpay-api.weerachaiartdesign.workers.dev/api';

// ---- Token Management ----
export function getToken() {
  return localStorage.getItem('srdh_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('srdh_token', token);
  } else {
    localStorage.removeItem('srdh_token');
  }
}

// ---- User Management ----
export function getCurrentUser() {
  const user = localStorage.getItem('srdh_user');
  return user ? JSON.parse(user) : null;
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('srdh_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('srdh_user');
  }
}

// ---- Generic fetch ----
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      setToken(null);
      setCurrentUser(null);
      if (!window.location.pathname.includes('index.html')) {
        window.location.href = '/index.html';
      }
    }
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// ---- Auth APIs ----
export const auth = {
  login: (email, password) => apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  guest: () => apiFetch('/auth/guest', { method: 'POST' }),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  me: () => apiFetch('/auth/me'),
};

// ---- Register APIs ----
export const register = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/register?${qs}`);
  },
  import: (items) => apiFetch('/register/import', {
    method: 'POST',
    body: JSON.stringify({ items }),
  }),
  receive: (uuids) => apiFetch('/register/receive', {
    method: 'POST',
    body: JSON.stringify({ uuids }),
  }),
  assignEditor: (uuids, editor_email) => apiFetch('/register/assign-editor', {
    method: 'POST',
    body: JSON.stringify({ uuids, editor_email }),
  }),
  edit: (uuids) => apiFetch('/register/edit', {
    method: 'POST',
    body: JSON.stringify({ uuids }),
  }),
  return: (uuids) => apiFetch('/register/return', {
    method: 'POST',
    body: JSON.stringify({ uuids }),
  }),
  pass: (uuids, dk_nos) => apiFetch('/register/pass', {
    method: 'POST',
    body: JSON.stringify({ uuids, dk_nos }),
  }),
  propose: (uuids) => apiFetch('/register/propose', {
    method: 'POST',
    body: JSON.stringify({ uuids }),
  }),
  approve: (uuids) => apiFetch('/register/approve', {
    method: 'POST',
    body: JSON.stringify({ uuids }),
  }),
  pay: (uuids) => apiFetch('/register/pay', {
    method: 'POST',
    body: JSON.stringify({ uuids }),
  }),
  cancel: (uuid, note) => apiFetch('/register/cancel', {
    method: 'POST',
    body: JSON.stringify({ uuid, note }),
  }),
  recover: (uuid) => apiFetch('/register/recover', {
    method: 'POST',
    body: JSON.stringify({ uuid }),
  }),
  update: (uuid, data) => apiFetch(`/register/${uuid}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

// ---- Settings APIs ----
export const settings = {
  get: (table, id = null) => {
    const url = id ? `/settings/${table}/${id}` : `/settings/${table}`;
    return apiFetch(url);
  },
  create: (table, data) => apiFetch(`/settings/${table}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (table, id, data) => apiFetch(`/settings/${table}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (table, id) => apiFetch(`/settings/${table}/${id}`, {
    method: 'DELETE',
  }),
};

// ---- User APIs ----
export const users = {
  list: () => apiFetch('/users'),
  create: (data) => apiFetch('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiFetch(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiFetch(`/users/${id}`, { method: 'DELETE' }),
  resetPassword: (email) => apiFetch('/users/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
};

// ---- Report APIs ----
export const report = {
  summary: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/report/summary?${qs}`);
  },
  status: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/report/status?${qs}`);
  },
};

// ---- Audit APIs ----
export const audit = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/audit-logs?${qs}`);
  },
};

// ---- System APIs ----
export const system = {
  permission: {
    get: () => apiFetch('/system/permission'),
    update: (id, data) => apiFetch('/system/permission', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data }),
    }),
  },
  session: {
    get: () => apiFetch('/system/session'),
    update: (key, value) => apiFetch('/system/session', {
      method: 'PUT',
      body: JSON.stringify({ key, value }),
    }),
  },
  retention: {
    get: () => apiFetch('/system/retention'),
    execute: (years) => apiFetch('/system/retention', {
      method: 'POST',
      body: JSON.stringify({ years }),
    }),
  },
  telegram: {
    get: () => apiFetch('/system/telegram'),
    update: (key, value) => apiFetch('/system/telegram', {
      method: 'PUT',
      body: JSON.stringify({ key, value }),
    }),
  },
  backup: {
    download: () => {
      const token = getToken();
      return fetch(`${API_BASE}/system/backup`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
    },
    restore: (data) => apiFetch('/system/backup', {
      method: 'POST',
      body: JSON.stringify({ data }),
    }),
  },
};

// ---- Status Mapping ----
export const statusMap = {
  WAITING: 'รอเอกสาร',
  RECEIVED: 'รับเข้าระบบ',
  CHECKUP: 'ตรวจสอบ',
  EDITING: 'ส่งแก้ไข',
  PASSED: 'ตรวจผ่าน',
  PROPOSED: 'เสนอ',
  APPROVED: 'อนุมัติ',
  PAID: 'จ่ายแล้ว',
  CANCELLED: 'ยกเลิก',
};

export const statusColors = {
  WAITING: 'bg-gray-200 text-gray-700',
  RECEIVED: 'bg-blue-100 text-blue-800',
  CHECKUP: 'bg-yellow-100 text-yellow-800',
  EDITING: 'bg-orange-100 text-orange-800',
  PASSED: 'bg-green-100 text-green-800',
  PROPOSED: 'bg-purple-100 text-purple-800',
  APPROVED: 'bg-indigo-100 text-indigo-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
};
