// ============================================================
// api.js — Centralized API Client (ข้อ 7.2/7.15)
// ทุกหน้าเรียก API ผ่านไฟล์นี้เท่านั้น เพื่อจัดการ Token/Error ที่จุดเดียว
// ============================================================

// TODO: เปลี่ยนเป็น URL จริงของ Worker หลัง Deploy (ตอนนี้ใส่ตามที่ระบุในเอกสาร)
const API_BASE_URL = 'https://srdhpay-api.weerachaiartdesign.workers.dev';

function getToken() {
  return localStorage.getItem('srdhpay_token') || '';
}

function buildUrl(path, params) {
  const url = new URL(API_BASE_URL + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }
  return url.toString();
}

// core request — รวม retry 1 ครั้งถ้าเจอ network error (ข้อ 7.15: auto retry)
async function request(method, path, { params, body, isFormFile, retried } = {}) {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (!isFormFile) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body ? (isFormFile ? body : JSON.stringify(body)) : undefined
    });
  } catch (networkErr) {
    if (!retried) {
      await new Promise((r) => setTimeout(r, 800));
      return request(method, path, { params, body, isFormFile, retried: true });
    }
    throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = { success: false, message: 'เกิดข้อผิดพลาดในการอ่านข้อมูลจากเซิร์ฟเวอร์' };
  }

  if (res.status === 401) {
    // Session หมดอายุ -> เคลียร์ token แล้วเด้งกลับหน้า login
    localStorage.removeItem('srdhpay_token');
    localStorage.removeItem('srdhpay_user');
    if (!location.pathname.endsWith('index.html') && location.pathname !== '/') {
      location.href = 'index.html';
    }
    throw new Error(data.message || 'กรุณาเข้าสู่ระบบใหม่');
  }

  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'เกิดข้อผิดพลาด');
  }

  return data;
}

const api = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body) => request('POST', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  del: (path, body) => request('DELETE', path, { body }),
  baseUrl: API_BASE_URL
};

window.api = api;
