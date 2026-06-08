// auth.js
// การจัดการ Authentication และ Session สำหรับ Frontend

// ==================== Auth Functions ====================

async function login(email, password) {
    try {
        const response = await API.login(email, password);
        if (response.success) {
            // เก็บ token และ user info ไว้ใน localStorage
            setToken(response.token);
            setUser({
                email: response.email,
                role: response.role,
                username: response.username,
                force_change_password: response.force_change_password
            });
            
            // ถ้าต้องบังคับเปลี่ยนรหัสผ่าน ให้ redirect ไปหน้าเปลี่ยนรหัส
            if (response.force_change_password) {
                window.location.href = 'auth.html?change_password=true';
            }
            return { success: true, username: response.username };
        } else {
            return { success: false, message: response.message };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' };
    }
}

async function guestLogin() {
    try {
        const response = await API.guestLogin();
        if (response.success) {
            setToken(response.token);
            setUser({
                email: response.email,
                role: response.role,
                username: response.username,
                is_guest: true
            });
            return { success: true };
        } else {
            return { success: false, message: response.message };
        }
    } catch (error) {
        console.error('Guest login error:', error);
        return { success: false, message: 'ไม่สามารถเข้าใช้งานแบบผู้เยี่ยมชมได้' };
    }
}

async function logout() {
    const token = getToken();
    if (token) {
        await API.logout();
    }
    clearSession();
    window.location.href = 'index.html';
}

async function validateSession() {
    const token = getToken();
    if (!token) return false;
    
    try {
        const response = await API.validateToken();
        if (response.success && response.session) {
            // อัปเดต user info (เผื่อมีการเปลี่ยนแปลง)
            const user = getUser();
            if (user && user.email !== response.session.email) {
                setUser({
                    email: response.session.email,
                    role: response.session.role,
                    username: response.session.username,
                    is_guest: response.session.is_guest
                });
            }
            return true;
        } else {
            clearSession();
            return false;
        }
    } catch (error) {
        console.error('Session validation error:', error);
        return false;
    }
}

// ==================== Auth Guard ====================
async function requireAuth(allowedRoles = null) {
    const isValid = await validateSession();
    if (!isValid) {
        window.location.href = 'index.html';
        return false;
    }
    
    if (allowedRoles && allowedRoles.length > 0) {
        const user = getUser();
        if (!user || !allowedRoles.includes(user.role)) {
            // ไม่มีสิทธิ์ ให้ไปหน้า dashboard หรือแสดง error
            showToast('คุณไม่มีสิทธิ์เข้าถึงหน้านี้', 'error');
            window.location.href = 'dashboard.html';
            return false;
        }
    }
    return true;
}

// ==================== Auto Logout on Inactivity ====================
let inactivityTimer = null;

function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        // ถ้ามี token และไม่ใช่ guest ให้ logout อัตโนมัติ
        const token = getToken();
        const user = getUser();
        if (token && user && !user.is_guest) {
            showToast('ไม่ได้ใช้งานเป็นเวลานาน กรุณาเข้าสู่ระบบอีกครั้ง', 'warning');
            logout();
        }
    }, 30 * 60 * 1000); // 30 นาที
}

function initInactivityTimer() {
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(event => {
        document.addEventListener(event, resetInactivityTimer);
    });
    resetInactivityTimer();
}

// ==================== Auto Redirect if Already Logged In ====================
async function redirectIfLoggedIn() {
    const isValid = await validateSession();
    if (isValid) {
        window.location.href = 'dashboard.html';
        return true;
    }
    return false;
}

// ==================== Exports (global) ====================
window.auth = {
    login,
    guestLogin,
    logout,
    validateSession,
    requireAuth,
    redirectIfLoggedIn,
    initInactivityTimer
};
