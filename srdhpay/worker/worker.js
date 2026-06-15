// ============================================================
// SRDH PAY - Cloudflare Worker (Backend API)
// Version: 1.0.0
// ============================================================

// --- Constants ---
const COOKIE_NAME   = 'srdh_token';
const STATUS_MAP    = {
  WAITING:   'รอเอกสาร',
  RECEIVED:  'รับเข้าระบบ',
  CHECKUP:   'ตรวจสอบ',
  EDITING:   'ส่งแก้ไข',
  PASSED:    'ตรวจผ่าน',
  PROPOSED:  'เสนอ',
  APPROVED:  'อนุมัติ',
  PAID:      'จ่ายแล้ว',
  CANCELLED: 'ยกเลิก',
};

// ============================================================
// MAIN FETCH HANDLER
// ============================================================
export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    const corsHeaders = {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Token',
    };

    // Helper: JSON Response
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    // Preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ============================================================
      // ROUTES
      // ============================================================

      // Health Check
      if (path === '/' && method === 'GET') {
        return json({ success: true, message: 'SRDH Pay API is running', version: '1.0.0' });
      }

      // ------ AUTH ------
      if (path === '/api/login'       && method === 'POST') return handleLogin(request, env, json);
      if (path === '/api/guest-login' && method === 'POST') return handleGuestLogin(request, env, json);
      if (path === '/api/logout'      && method === 'POST') return handleLogout(request, env, json);
      if (path === '/api/verify-token'&& method === 'GET')  return handleVerifyToken(request, env, json);

      // ------ DASHBOARD ------
      if (path === '/api/dashboard/summary' && method === 'GET') {
        return requireAuth(request, env, json, handleDashboardSummary);
      }

      // ------ REGISTER (LIST) ------
      if (path === '/api/register'         && method === 'GET')  {
        return requireAuth(request, env, json, handleGetRegister);
      }
      if (path === '/api/register'         && method === 'POST') {
        return requireAuth(request, env, json, handleCreateRegister);
      }
      if (path.startsWith('/api/register/') && method === 'PUT') {
        return requireAuth(request, env, json, handleUpdateRegister);
      }
      if (path.startsWith('/api/register/') && method === 'DELETE') {
        return requireAuth(request, env, json, handleCancelRegister);
      }

      // ------ IMPORT ------
      if (path === '/api/import'  && method === 'POST') {
        return requireAuth(request, env, json, handleImport);
      }

      // ------ RECEIVE ------
      if (path === '/api/receive' && method === 'POST') {
        return requireAuth(request, env, json, handleReceive);
      }
      if (path === '/api/receive/assign-editor' && method === 'POST') {
        return requireAuth(request, env, json, handleAssignEditor);
      }

      // ------ VERIFY ------
      if (path === '/api/verify/edit'   && method === 'POST') {
        return requireAuth(request, env, json, handleVerifyEdit);
      }
      if (path === '/api/verify/return' && method === 'POST') {
        return requireAuth(request, env, json, handleVerifyReturn);
      }
      if (path === '/api/verify/pass'   && method === 'POST') {
        return requireAuth(request, env, json, handleVerifyPass);
      }

      // ------ APPROVE ------
      if (path === '/api/approve/propose'  && method === 'POST') {
        return requireAuth(request, env, json, handlePropose);
      }
      if (path === '/api/approve/approve'  && method === 'POST') {
        return requireAuth(request, env, json, handleApprove);
      }

      // ------ PAYMENT ------
      if (path === '/api/payment' && method === 'POST') {
        return requireAuth(request, env, json, handlePayment);
      }

      // ------ SETTINGS ------
      if (path === '/api/settings/app'        && method === 'GET')  {
        return requireAuth(request, env, json, handleGetSettingsApp);
      }
      if (path === '/api/settings/app'        && method === 'POST') {
        return requireAuth(request, env, json, handleSaveSettingsApp);
      }
      if (path === '/api/settings/money-type' && method === 'GET')  {
        return requireAuth(request, env, json, handleGetMoneyType);
      }
      if (path === '/api/settings/money-type' && method === 'POST') {
        return requireAuth(request, env, json, handleSaveMoneyType);
      }
      if (path === '/api/settings/vendor'     && method === 'GET')  {
        return requireAuth(request, env, json, handleGetVendor);
      }
      if (path === '/api/settings/vendor'     && method === 'POST') {
        return requireAuth(request, env, json, handleSaveVendor);
      }
      if (path === '/api/settings/dept'       && method === 'GET')  {
        return requireAuth(request, env, json, handleGetDept);
      }
      if (path === '/api/settings/permission' && method === 'GET')  {
        return requireAuth(request, env, json, handleGetPermission);
      }
      if (path === '/api/settings/permission' && method === 'POST') {
        return requireAuth(request, env, json, handleSavePermission);
      }
      if (path === '/api/settings/system'     && method === 'GET')  {
        return requireAuth(request, env, json, handleGetSystemSettings);
      }
      if (path === '/api/settings/system'     && method === 'POST') {
        return requireAuth(request, env, json, handleSaveSystemSettings);
      }

      // ------ USERS ------
      if (path === '/api/users'              && method === 'GET')  {
        return requireAuth(request, env, json, handleGetUsers);
      }
      if (path === '/api/users'              && method === 'POST') {
        return requireAuth(request, env, json, handleCreateUser);
      }
      if (path.startsWith('/api/users/')     && method === 'PUT')  {
        return requireAuth(request, env, json, handleUpdateUser);
      }
      if (path === '/api/users/change-password' && method === 'POST') {
        return requireAuth(request, env, json, handleChangePassword);
      }

      // ------ LOGS ------
      if (path === '/api/audit-logs' && method === 'GET') {
        return requireAuth(request, env, json, handleGetAuditLogs);
      }

      // 404
      return json({ success: false, message: 'ไม่พบ API ที่เรียกใช้งาน' }, 404);

    } catch (err) {
      console.error('Worker error:', err);
      return json({ success: false, message: 'เกิดข้อผิดพลาดภายในระบบ', error: err.message }, 500);
    }
  },
};

// ============================================================
// MIDDLEWARE: requireAuth
// ============================================================
async function requireAuth(request, env, json, handler) {
  const token = getToken(request);
  if (!token) return json({ success: false, message: 'กรุณาเข้าสู่ระบบ', code: 'NO_TOKEN' }, 401);

  const session = await env.DB.prepare(
    `SELECT * FROM sessions WHERE token = ? AND active = 1`
  ).bind(token).first();

  if (!session) return json({ success: false, message: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่', code: 'INVALID_TOKEN' }, 401);

  // ตรวจ expire
  if (session.expire_at && new Date(session.expire_at) < new Date()) {
    await env.DB.prepare(`UPDATE sessions SET active = 0 WHERE token = ?`).bind(token).run();
    return json({ success: false, message: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่', code: 'TOKEN_EXPIRED' }, 401);
  }

  // อัปเดต last_active
  await env.DB.prepare(
    `UPDATE sessions SET last_active_at = CURRENT_TIMESTAMP WHERE token = ?`
  ).bind(token).run();

  return handler(request, env, json, session);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function getToken(request) {
  return (
    request.headers.get('X-Token') ||
    request.headers.get('Authorization')?.replace('Bearer ', '') ||
    null
  );
}

function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function generateUUID() {
  return crypto.randomUUID();
}

// hash password (SHA-256)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'srdh_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// คำนวณสถานะจากข้อมูล
function computeStatus(row) {
  if (row.cancel_date)   return 'CANCELLED';
  if (row.pay_date)      return 'PAID';
  if (row.approve_date)  return 'APPROVED';
  if (row.propose_date)  return 'PROPOSED';
  if (row.pass_date)     return 'PASSED';
  if (row.edit_date && (!row.return_date || row.return_date < row.edit_date)) return 'EDITING';
  if (row.editor)        return 'CHECKUP';
  if (row.receive_date)  return 'RECEIVED';
  if (row.register_date) return 'WAITING';
  return 'INCOMPLETE';
}

// แปลง request_no: 9 หลัก → display 1/69
function formatRequestNo(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  if (s.length < 9) return s;
  const fy  = s.substring(0, 2);
  const seq = parseInt(s.substring(2), 10);
  return `${seq}/${fy}`;
}

// แปลง request_no display 1/69 → 9 หลัก เช่น 690000001
function parseRequestNo(display, fy2) {
  if (!display) return '';
  if (display.includes('/')) {
    const [seq, fy] = display.split('/');
    return `${fy}${String(parseInt(seq)).padStart(7, '0')}`;
  }
  return display;
}

// แปลง dk_no: 9 หลัก → display 1801/69
function formatDkNo(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  if (s.length < 9) return s;
  const fy  = s.substring(0, 2);
  const seq = parseInt(s.substring(2), 10);
  return `${seq}/${fy}`;
}

// แปลง register_no raw
