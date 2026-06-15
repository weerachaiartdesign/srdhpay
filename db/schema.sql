-- ลบตารางเก่าทิ้งถ้ามี (ระวังข้อมูลหายถ้าใช้บน Prod แนะนำให้เรียกสร้างครั้งแรกเท่านั้น)
DROP TABLE IF EXISTS register;
DROP TABLE IF EXISTS auth;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS counters;

-- 1. ตาราง auth (ผู้ใช้งาน)
CREATE TABLE auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'editor', 'checker', 'staff', 'guest')),
    username TEXT NOT NULL,
    position TEXT,
    dept TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    force_change_password INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. ตาราง register (ทะเบียนเบิกจ่าย)
CREATE TABLE register (
    uuid TEXT PRIMARY KEY, -- ใช้ UUID เป็นหลักเพื่ออ้างอิงให้ปลอดภัย
    money_type TEXT NOT NULL,
    dept TEXT NOT NULL,
    sender TEXT,
    reserve_no TEXT,
    reserve_amount REAL DEFAULT 0,
    invoice TEXT,
    vendor TEXT,
    amount REAL NOT NULL DEFAULT 0,
    description TEXT,
    
    register_no_raw TEXT, -- raw form เช่น 690150001
    register_no_display TEXT, -- display form เช่น RG690150001
    register_date DATETIME,
    
    receive_no_raw TEXT, 
    receive_no_display TEXT,
    receive_date DATETIME,
    
    editor TEXT,
    edit_date DATETIME,
    return_date DATETIME,
    
    request_no_raw TEXT, -- 690000001
    request_no_display TEXT, -- 1/69
    
    dk_no_raw TEXT,
    dk_no_display TEXT,
    
    pass_date DATETIME,
    propose_date DATETIME,
    approve_date DATETIME,
    pay_date DATETIME,
    
    cancel_date DATETIME,
    cancel_note TEXT,
    cancel_status INTEGER DEFAULT 0,
    
    egp_no TEXT,
    status TEXT DEFAULT 'WAITING', -- สถานะภาษาอังกฤษเพื่อรองรับระบบ
    source TEXT DEFAULT 'MANUAL',
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT
);

-- 3. ตาราง sessions (จัดการการ Login)
CREATE TABLE sessions (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    username TEXT,
    login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expire_at DATETIME,
    last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    guest_flag INTEGER DEFAULT 0
);

-- 4. ตาราง counters (Running Number ป้องกันการซ้ำ)
CREATE TABLE counters (
    key_name TEXT PRIMARY KEY, -- เช่น REGISTER_69, RECEIVE_69
    current_value INTEGER DEFAULT 0,
    fiscal_year INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);