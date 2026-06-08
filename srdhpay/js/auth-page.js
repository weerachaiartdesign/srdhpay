// js/auth-page.js
let currentUser = null;
let deptList = [];

async function initAuthPage() {
    currentUser = getUser();
    if (!currentUser) return;
    await loadDeptList();
    loadProfile();
    setupEventListeners();
    // ตรวจสอบ query parameter สำหรับเปลี่ยนรหัสผ่านบังคับ
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('change_password') === 'true') {
        document.getElementById('changePwdBtn').click();
    }
    // ถ้า role ไม่มีสิทธิ์จัดการผู้ใช้ ให้ซ่อน tab users
    const canManage = (currentUser.role === 'admin' || currentUser.role === 'manager');
    if (!canManage) {
        document.getElementById('tabUsers').style.display = 'none';
    } else {
        loadUsers();
    }
}

async function loadDeptList() {
    const settings = await API.getSettings();
    if (settings.success && settings.settings.depts) {
        deptList = settings.settings.depts.filter(d => d.active !== false).map(d => d.name);
        const datalist = document.getElementById('deptList');
        if (datalist) {
            datalist.innerHTML = '';
            deptList.forEach(d => datalist.innerHTML += `<option value="${escapeHtml(d)}">`);
        }
    }
}

function loadProfile() {
    document.getElementById('profileEmail').value = currentUser.email || '';
    document.getElementById('profileName').value = currentUser.username || '';
    document.getElementById('profilePosition').value = currentUser.position || '';
    document.getElementById('profileDept').value = currentUser.dept || '';
    document.getElementById('profileRole').value = currentUser.role || '';
}

function setupEventListeners() {
    document.getElementById('tabProfile').addEventListener('click', () => {
        document.getElementById('profileSection').classList.remove('hidden');
        document.getElementById('usersSection').classList.add('hidden');
        document.getElementById('tabProfile').classList.add('border-b-2','border-purple-600','text-purple-600');
        document.getElementById('tabUsers').classList.remove('border-b-2','border-purple-600','text-purple-600');
        document.getElementById('tabUsers').classList.add('text-gray-500');
    });
    document.getElementById('tabUsers').addEventListener('click', () => {
        document.getElementById('profileSection').classList.add('hidden');
        document.getElementById('usersSection').classList.remove('hidden');
        document.getElementById('tabUsers').classList.add('border-b-2','border-purple-600','text-purple-600');
        document.getElementById('tabProfile').classList.remove('border-b-2','border-purple-600','text-purple-600');
        document.getElementById('tabProfile').classList.add('text-gray-500');
        loadUsers();
    });
    document.getElementById('profileForm').addEventListener('submit', saveProfile);
    document.getElementById('changePwdBtn').addEventListener('click', () => openChangePwdModal());
    document.getElementById('addUserBtn')?.addEventListener('click', () => openUserModal());
    document.getElementById('closeUserModal')?.addEventListener('click', () => closeUserModal());
    document.getElementById('userForm')?.addEventListener('submit', saveUser);
    document.getElementById('closePwdModal')?.addEventListener('click', () => closeChangePwdModal());
    document.getElementById('changePwdForm')?.addEventListener('submit', changePassword);
}

async function saveProfile(e) {
    e.preventDefault();
    const updates = {
        username: document.getElementById('profileName').value,
        position: document.getElementById('profilePosition').value
    };
    showLoading('กำลังบันทึก...');
    const result = await API.updateUser(currentUser.email, updates);
    hideLoading();
    if (result.success) {
        showToast('บันทึกข้อมูลสำเร็จ', 'success');
        // อัปเดต local user
        currentUser.username = updates.username;
        currentUser.position = updates.position;
        setUser(currentUser);
    } else {
        showToast(result.message, 'error');
    }
}

function openChangePwdModal() {
    document.getElementById('changePwdModal').classList.remove('hidden');
    document.getElementById('changePwdModal').classList.add('flex');
    document.getElementById('changePwdForm').reset();
}

function closeChangePwdModal() {
    document.getElementById('changePwdModal').classList.add('hidden');
    document.getElementById('changePwdModal').classList.remove('flex');
}

async function changePassword(e) {
    e.preventDefault();
    const oldPwd = document.getElementById('oldPassword').value;
    const newPwd = document.getElementById('newPassword').value;
    const confirmPwd = document.getElementById('confirmPassword').value;
    if (newPwd !== confirmPwd) {
        showToast('รหัสผ่านใหม่ไม่ตรงกัน', 'error');
        return;
    }
    showLoading('กำลังเปลี่ยนรหัสผ่าน...');
    // ต้องมี API changePassword ใน backend (UserService.changePassword)
    const result = await API.changePassword(currentUser.email, oldPwd, newPwd);
    hideLoading();
    if (result.success) {
        showToast('เปลี่ยนรหัสผ่านสำเร็จ', 'success');
        closeChangePwdModal();
    } else {
        showToast(result.message, 'error');
    }
}

// ========== User Management ==========
async function loadUsers() {
    const result = await API.listUsers();
    if (result.success) {
        const users = result.users;
        const activeCount = users.filter(u => u.active).length;
        const inactiveCount = users.length - activeCount;
        document.getElementById('userStats').innerText = `ใช้งาน ${activeCount} / ปิดใช้งาน ${inactiveCount} · ทั้งหมด ${users.length}`;
        const tbody = document.getElementById('userTableBody');
        if (!tbody) return;
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">ไม่มีข้อมูล</td></tr>';
            return;
        }
        let html = '';
        users.forEach(user => {
            const statusBadge = user.active ? '<span class="text-green-600">ใช้งาน</span>' : '<span class="text-red-600">ปิดใช้งาน</span>';
            html += `<tr>
                <td>${escapeHtml(user.email)}</td>
                <td>${escapeHtml(user.username)}</td>
                <td>${escapeHtml(user.dept || '-')}</td>
                <td>${statusBadge}</td>
                <td class="space-x-2">
                    <button class="text-blue-600 edit-user" data-email="${escapeHtml(user.email)}"><i class="fas fa-edit"></i></button>
                    <button class="text-red-600 delete-user" data-email="${escapeHtml(user.email)}"><i class="fas fa-trash"></i></button>
                    <button class="text-purple-600 reset-pwd" data-email="${escapeHtml(user.email)}"><i class="fas fa-key"></i></button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;
        document.querySelectorAll('.edit-user').forEach(btn => btn.addEventListener('click', () => openUserModal(btn.dataset.email)));
        document.querySelectorAll('.delete-user').forEach(btn => btn.addEventListener('click', () => deleteUser(btn.dataset.email)));
        document.querySelectorAll('.reset-pwd').forEach(btn => btn.addEventListener('click', () => resetPassword(btn.dataset.email)));
    } else {
        showToast(result.message, 'error');
    }
}

function openUserModal(email = null) {
    const isEdit = !!email;
    document.getElementById('userModalTitle').innerText = isEdit ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่';
    if (isEdit) {
        // โหลดข้อมูลผู้ใช้จาก current list (หรือ API)
        API.listUsers().then(res => {
            const user = res.users.find(u => u.email === email);
            if (user) {
                document.getElementById('userEmailOriginal').value = user.email;
                document.getElementById('userEmail').value = user.email;
                document.getElementById('userEmail').disabled = true;
                document.getElementById('userName').value = user.username || '';
                document.getElementById('userPosition').value = user.position || '';
                document.getElementById('userDept').value = user.dept || '';
                document.getElementById('userRole').value = user.role || 'staff';
                document.getElementById('userActive').value = user.active ? 'active' : 'inactive';
                document.getElementById('userPassword').disabled = true;
                document.getElementById('userPassword').placeholder = 'ไม่ต้องกรอกเพื่อคงรหัสเดิม';
            }
        });
    } else {
        document.getElementById('userEmailOriginal').value = '';
        document.getElementById('userEmail').disabled = false;
        document.getElementById('userEmail').value = '';
        document.getElementById('userName').value = '';
        document.getElementById('userPosition').value = '';
        document.getElementById('userDept').value = '';
        document.getElementById('userRole').value = 'staff';
        document.getElementById('userActive').value = 'active';
        document.getElementById('userPassword').disabled = false;
        document.getElementById('userPassword').value = '';
    }
    document.getElementById('userModal').classList.remove('hidden');
    document.getElementById('userModal').classList.add('flex');
}

function closeUserModal() {
    document.getElementById('userModal').classList.add('hidden');
    document.getElementById('userModal').classList.remove('flex');
}

async function saveUser(e) {
    e.preventDefault();
    const isEdit = !!document.getElementById('userEmailOriginal').value;
    const email = document.getElementById('userEmail').value;
    const userData = {
        username: document.getElementById('userName').value,
        position: document.getElementById('userPosition').value,
        dept: document.getElementById('userDept').value,
        role: document.getElementById('userRole').value,
        active: document.getElementById('userActive').value === 'active'
    };
    if (!isEdit) {
        userData.email = email;
        userData.password = document.getElementById('userPassword').value;
    }
    showLoading('กำลังบันทึก...');
    let result;
    if (isEdit) {
        result = await API.updateUser(email, userData);
    } else {
        result = await API.createUser(userData);
    }
    hideLoading();
    if (result.success) {
        showToast(result.message, 'success');
        closeUserModal();
        loadUsers();
    } else {
        showToast(result.message, 'error');
    }
}

async function deleteUser(email) {
    const confirm = await Swal.fire({
        title: 'ยืนยันการลบ',
        text: `คุณต้องการลบผู้ใช้ ${email} หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ลบ',
        cancelButtonText: 'ยกเลิก'
    });
    if (!confirm.isConfirmed) return;
    showLoading('กำลังลบ...');
    const result = await API.deleteUser(email);
    hideLoading();
    if (result.success) {
        showToast(result.message, 'success');
        loadUsers();
    } else {
        showToast(result.message, 'error');
    }
}

async function resetPassword(email) {
    const confirm = await Swal.fire({
        title: 'รีเซ็ตรหัสผ่าน',
        text: `คุณต้องการรีเซ็ตรหัสผ่านของผู้ใช้ ${email} หรือไม่? (รหัสผ่านจะถูกตั้งเป็นค่าเริ่มต้น)`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'รีเซ็ต',
        cancelButtonText: 'ยกเลิก'
    });
    if (!confirm.isConfirmed) return;
    showLoading('กำลังรีเซ็ต...');
    const result = await API.resetPassword(email);
    hideLoading();
    if (result.success) {
        showToast(result.message, 'success');
    } else {
        showToast(result.message, 'error');
    }
}

function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, function(m){if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }
