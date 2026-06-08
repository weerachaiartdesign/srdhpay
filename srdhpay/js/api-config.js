// api-config.js
// การตั้งค่าการเชื่อมต่อกับ Google Apps Script Backend

// ==================== Configuration ====================
// 🔧 แก้ไข URL นี้เป็น URL ของ GAS Web App ที่ deploy จริง
const GAS_BASE_URL = 'https://script.google.com/macros/s/AKfycbxRsOwPZhsUdolY7_c9ye2TKWJjXBz2Q1W73Hln34PuONm04m5jKGa9NiC5jMklSaWd/exec';

// Environment detection (สำหรับ debugging)
const IS_DEVELOPMENT = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// ==================== API Client ====================
const API = {
    // Base URL
    baseUrl: GAS_BASE_URL,
    
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
