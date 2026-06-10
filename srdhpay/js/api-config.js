// api-config.js
// การตั้งค่าการเชื่อมต่อผ่าน Cloudflare Workers (Hono/Vanilla) Proxy Backend

// ==================== Configuration ====================
// 🔧 1. เปลี่ยน URL ตรงนี้ให้เป็นลิงก์ของ Cloudflare Workers ตัวใหม่ที่คุณเพิ่งกด Deploy มาครับ
const WORKER_BASE_URL = 'https://test001.weerachaiartdesign.workers.dev/';

// Environment detection (สำหรับ debugging)
const IS_DEVELOPMENT = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// ==================== API Client ====================
const API = {
    // Base URL ชี้ไปที่คลาวด์แฟลร์วอร์กเกอร์แทน
    baseUrl: WORKER_BASE_URL,
    
    // Generic POST request
    async post(action, data = {}) {
        // ดึง token จาก localStorage
        const token = localStorage.getItem('srdh_token');
        
        const payload = {
            action: action,
            token: token,
            ...data
        };
        
        try {
            // ยิงข้อมูลไปหาหลังบ้าน Cloudflare (ใช้วิธีส่งแบบ POST เสมอเพื่อให้ซ่อนโครงสร้างได้ปลอดภัย)
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error(`API Error [${action}]:`, error);
            return { success: false, message: 'การเชื่อมต่อล้มเหลว กรุณาลองใหม่อีกครั้ง' };
        }
    },
    
    // Generic GET request (ปรับให้ยิงแบบ POST ผ่าน Proxy เพื่อความปลอดภัยและความง่ายในการสลับข้ามโดเมน)
    async get(path, params = {}) {
        const token = localStorage.getItem('srdh_token');
        
        // สำหรับฟังก์ชันที่เป็น GET เดิม เราจะแปลงข้อมูลส่งเป็นแบบ POST วิ่งเข้าหา Worker เพื่อไม่ให้เกิดปัญหาสิทธิ์หลุด
        const payload = {
            action: path, 
            token: token,
            ...params
        };
        
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error(`API GET Error [${path}]:`, error);
            return { success: false, message: 'การเชื่อมต่อล้มเหลว' };
        }
    },
    
    // ========== Auth API ==========
    login(email, password) {
        return this.post('login', { email, password });
    },
    
    guestLogin() {
        return this.post('guest');
    },
    
    logout() {
        return this.post('logout');
    },
    
    validateToken() {
        return this.get('validate');
    },
    
    // ========== Register (Import) API ==========
    registerBatch(items) {
        return this.post('register', { items });
    },
    
    // ========== Receive API ==========
    receiveItems(items) {
        return this.post('receive', { items });
    },
    
    assignEditor(items, editor) {
        return this.post('assign_editor', { items, editor });
    },
    
    // ========== Verify API ==========
    editItems(items) {
        return this.post('edit', { items });
    },
    
    returnItems(items) {
        return this.post('return', { items });
    },
    
    passItems(items, dkNumbers) {
        return this.post('pass', { items, dkNumbers });
    },
    
    // ========== Approve API ==========
    proposeItems(items) {
        return this.post('propose', { items });
    },
    
    approveItems(items) {
        return this.post('approve', { items });
    },
    
    // ========== Payment API ==========
    payItems(items) {
        return this.post('pay', { items });
    },
    
    // ========== Settings API ==========
    saveSettings(settings) {
        return this.post('save_settings', { settings });
    },
    
    getSettings() {
        return this.post('get_settings');
    },
    
    cancelItem(uuid, note) {
        return this.post('cancel', { uuid, note });
    },
    
    // ========== User Management API ==========
    listUsers() {
        return this.post('list_users');
    },
    
    createUser(user) {
        return this.post('create_user', { user });
    },
    
    updateUser(email, updates) {
        return this.post('update_user', { email, updates });
    },
    
    deleteUser(email) {
        return this.post('delete_user', { email });
    },
    
    // ========== Report API ==========
    getDashboard() {
        return this.post('get_dashboard');
    },
    
    getRegisterList(filters, pagination) {
        return this.post('get_register_list', { filters, pagination });
    }
};

// Export ให้สามารถใช้งานได้ตามโครงสร้างระบบเดิมของคุณ
window.API = API;
window.GAS_BASE_URL = WORKER_BASE_URL; // ใส่ตัวแปรหลอกไว้เผื่อไฟล์อื่นเรียกใช้ตัวแปรนี้ระบบจะได้ไม่พัง
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error(`API Error [${action}]:`, error);
            return { success: false, message: 'การเชื่อมต่อล้มเหลว กรุณาลองใหม่อีกครั้ง' };
        }
    },
    
    // Generic GET request (สำหรับกรณีที่ต้องการใช้ GET)
    async get(path, params = {}) {
        const token = localStorage.getItem('srdh_token');
        const url = new URL(this.baseUrl);
        url.searchParams.append('path', path);
        url.searchParams.append('token', token || '');
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.append(key, value);
        }
        
        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error(`API GET Error [${path}]:`, error);
            return { success: false, message: 'การเชื่อมต่อล้มเหลว' };
        }
    },
    
    // ========== Auth API ==========
    login(email, password) {
        return this.post('login', { email, password });
    },
    
    guestLogin() {
        return this.post('guest');
    },
    
    logout() {
        return this.post('logout');
    },
    
    validateToken() {
        return this.get('validate');
    },
    
    // ========== Register (Import) API ==========
    registerBatch(items) {
        return this.post('register', { items });
    },
    
    // ========== Receive API ==========
    receiveItems(items) {
        return this.post('receive', { items });
    },
    
    assignEditor(items, editor) {
        return this.post('assign_editor', { items, editor });
    },
    
    // ========== Verify API ==========
    editItems(items) {
        return this.post('edit', { items });
    },
    
    returnItems(items) {
        return this.post('return', { items });
    },
    
    passItems(items, dkNumbers) {
        return this.post('pass', { items, dkNumbers });
    },
    
    // ========== Approve API ==========
    proposeItems(items) {
        return this.post('propose', { items });
    },
    
    approveItems(items) {
        return this.post('approve', { items });
    },
    
    // ========== Payment API ==========
    payItems(items) {
        return this.post('pay', { items });
    },
    
    // ========== Settings API ==========
    saveSettings(settings) {
        return this.post('save_settings', { settings });
    },
    
    getSettings() {
        return this.post('get_settings');
    },
    
    cancelItem(uuid, note) {
        return this.post('cancel', { uuid, note });
    },
    
    // ========== User Management API ==========
    listUsers() {
        return this.post('list_users');
    },
    
    createUser(user) {
        return this.post('create_user', { user });
    },
    
    updateUser(email, updates) {
        return this.post('update_user', { email, updates });
    },
    
    deleteUser(email) {
        return this.post('delete_user', { email });
    },
    
    // ========== Report API ==========
    getDashboard() {
        return this.post('get_dashboard');
    },
    
    getRegisterList(filters, pagination) {
        return this.post('get_register_list', { filters, pagination });
    }
};

// Export ให้สามารถใช้งานได้ (ใน browser environment)
window.API = API;
window.GAS_BASE_URL = GAS_BASE_URL;
