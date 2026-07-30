const API_BASE = "https://wrytix.onrender.com";
let currentUser = null;
let currentStatus = 'all';
let currentPage = 1;
let currentItems = [];
let selectedIds = new Set();
let isUsernameAvailable = false;
let isEmailAvailable = false;
let usernameTimer, emailTimer;

document.addEventListener('DOMContentLoaded', () => {
    const userData = localStorage.getItem('user');
    if (!userData) { window.location.href = '/login.html'; return; }

    currentUser = JSON.parse(userData);
    if (!['admin', 'editor'].includes(currentUser.role)) {
        alert('Access denied.');
        window.location.href = '/login.html';
        return;
    }

    renderSidebar(window.RoleConfig[currentUser.role].sidebar);
    document.getElementById('profileBtn').textContent = currentUser.username;

    setupEventListeners();
    setupRoleFieldToggling();
    loadUsers();
});

function renderSidebar(links) {
    document.getElementById('sidebarLinks').innerHTML = links.map(link => `
        <li><a href="${link.href}"><i class="fa-solid ${link.icon}"></i> ${link.label}</a></li>
    `).join('');
}

function setupEventListeners() {
    document.querySelectorAll('.status-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentStatus = tab.dataset.status;
            currentPage = 1;
            selectedIds.clear();
            loadUsers();
        });
    });

    document.getElementById('searchBtn').addEventListener('click', () => { currentPage = 1; loadUsers(); });
    document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterRoleSelect').value = '';
        currentPage = 1;
        loadUsers();
    });

    document.getElementById('selectAllCheckbox').addEventListener('change', (e) => {
        document.querySelectorAll('.row-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
            toggleSelection(cb.dataset.id, e.target.checked);
        });
    });

    document.getElementById('clearSelectionBtn').addEventListener('click', () => {
        selectedIds.clear();
        document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false);
        document.getElementById('selectAllCheckbox').checked = false;
        updateBulkBar();
    });

    document.getElementById('bulkDeleteBtn').addEventListener('click', handleBulkDelete);

    document.getElementById('openAddModalBtn').addEventListener('click', () => openModal('add'));
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closeModal);

    document.getElementById('userForm').addEventListener('submit', handleFormSubmit);
}

function setupRoleFieldToggling() {
    document.getElementById('roleInput').addEventListener('change', (e) => {
        const role = e.target.value;
        document.getElementById('lineManagerField').style.display = role === 'author' ? 'block' : 'none';
        document.getElementById('categoriesField').style.display = role === 'editor' ? 'block' : 'none';
    });
}

/* ============ Load & Render ============ */

async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';

    const params = new URLSearchParams({
        status: currentStatus,
        page: currentPage,
        search: document.getElementById('searchInput').value.trim(),
        role: document.getElementById('filterRoleSelect').value
    });

    try {
        const res = await fetch(`${API_BASE}/users/manage?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        currentItems = data.items;
        renderTable(data.items);
        renderPagination(data.page, data.totalPages);
    } catch (err) {
        console.error('Failed to load users:', err);
        tbody.innerHTML = '<tr><td colspan="7">Failed to load users.</td></tr>';
    }
}

function renderTable(items) {
    const tbody = document.getElementById('usersTableBody');

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No users found.</td></tr>';
        return;
    }

    tbody.innerHTML = items.map(item => {
        const key = item._id || item.id;
        const isPending = item.source === 'pending';

        return `
            <tr>
                <td><input type="checkbox" class="row-checkbox" data-id="${key}" ${selectedIds.has(key) ? 'checked' : ''} /></td>
                <td>${item.username}</td>
                <td>${item.email}</td>
                <td>${item.role}</td>
                <td>${isPending ? '<span class="status-scheduled">Pending</span>' : (item.status === 'active' ? '<span class="status-live">Active</span>' : '<span class="status-none">Inactive</span>')}</td>
                <td>${item.lineManager || '—'}</td>
                <td class="action-buttons">
                    ${isPending
            ? `<button class="btn approve" onclick="approvePendingUser('${key}')">Approve</button>
                           <button class="btn reject" onclick="rejectPendingUser('${key}')">Reject</button>`
            : `<button class="btn-edit" onclick="openEditModal('${key}')">Edit</button>
                           <button class="delete-btn" onclick="handleSingleDelete('${key}')">Delete</button>`
        }
                </td>
            </tr>
        `;
    }).join('');

    document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => toggleSelection(e.target.dataset.id, e.target.checked));
    });
}

function renderPagination(page, totalPages) {
    const container = document.getElementById('pagination');
    container.innerHTML = '';
    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = page === 1;
    prevBtn.onclick = () => { currentPage = page - 1; loadUsers(); };
    container.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === page ? 'active-page' : '';
        btn.onclick = () => { currentPage = i; loadUsers(); };
        container.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = page === totalPages;
    nextBtn.onclick = () => { currentPage = page + 1; loadUsers(); };
    container.appendChild(nextBtn);
}

/* ============ Selection & Bulk Actions ============ */

function toggleSelection(id, checked) {
    if (checked) selectedIds.add(id);
    else selectedIds.delete(id);
    updateBulkBar();
}

function updateBulkBar() {
    const bar = document.getElementById('bulkBar');
    document.getElementById('bulkCount').textContent = `${selectedIds.size} selected`;
    bar.classList.toggle('visible', selectedIds.size > 0);
}

async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} user(s)? This cannot be undone.`)) return;

    try {
        const res = await fetch(`${API_BASE}/users/bulk-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [...selectedIds] }),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Bulk delete failed');
        selectedIds.clear();
        await loadUsers();
    } catch (err) {
        console.error(err);
        alert('Bulk delete failed.');
    }
}

async function handleSingleDelete(id) {
    if (!confirm('Delete this user?')) return;
    try {
        const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE', credentials: 'include' });
        if (!res.ok) throw new Error('Delete failed');
        await loadUsers();
    } catch (err) {
        console.error(err);
        alert('Delete failed.');
    }
}

async function approvePendingUser(id) {
    try {
        const res = await fetch(`${API_BASE}/pendingUsers/${id}/approve`, {
            method: 'POST',
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Approve failed');
        await loadUsers();
    } catch (err) {
        console.error(err);
        alert('Failed to approve user.');
    }
}

async function rejectPendingUser(id) {
    if (!confirm('Reject this user submission?')) return;
    try {
        const res = await fetch(`${API_BASE}/pendingUsers/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Reject failed');
        await loadUsers();
    } catch (err) {
        console.error(err);
        alert('Failed to reject user.');
    }
}






/* ============ Modal: Add / Edit ============ */
function setupAvailabilityChecks() {
    const usernameInput = document.getElementById('usernameInput');
    const usernameStatus = document.getElementById('username-status');
    const emailInput = document.getElementById('emailInput');
    const emailStatus = document.getElementById('email-status');

    usernameInput.addEventListener('input', () => {
        clearTimeout(usernameTimer);
        const username = usernameInput.value.trim();

        if (username.length < 3) {
            usernameStatus.textContent = 'Username too short';
            usernameStatus.style.color = 'gray';
            isUsernameAvailable = false;
            return;
        }

        usernameStatus.textContent = 'Checking...';
        usernameStatus.style.color = 'gray';

        usernameTimer = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE}/check-username?username=${encodeURIComponent(username)}`);
                const { available } = await res.json();
                isUsernameAvailable = available;
                usernameStatus.textContent = available ? 'Username available ✅' : 'Username already taken ❌';
                usernameStatus.style.color = available ? 'green' : 'red';
            } catch (err) {
                usernameStatus.textContent = 'Error checking username';
                isUsernameAvailable = false;
            }
        }, 600);
    });

    emailInput.addEventListener('input', () => {
        clearTimeout(emailTimer);
        const email = emailInput.value.trim();

        if (!email.includes('@') || email.length < 5) {
            emailStatus.textContent = 'Enter a valid email.';
            emailStatus.style.color = 'gray';
            isEmailAvailable = false;
            return;
        }

        emailStatus.textContent = 'Checking...';
        emailStatus.style.color = 'gray';

        emailTimer = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE}/check-email?email=${encodeURIComponent(email)}`);
                const { available } = await res.json();
                isEmailAvailable = available;
                emailStatus.textContent = available ? 'Email available ✅' : 'Email already used ❌';
                emailStatus.style.color = available ? 'green' : 'red';
            } catch (err) {
                emailStatus.textContent = 'Error checking email';
                isEmailAvailable = false;
            }
        }, 600);
    });

    document.getElementById('togglePassword').addEventListener('click', () => {
        const passwordInput = document.getElementById('passwordInput');
        const icon = document.getElementById('togglePassword');
        const isHidden = passwordInput.type === 'password';
        passwordInput.type = isHidden ? 'text' : 'password';
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });
}

function openModal(mode) {
    document.getElementById('modalTitle').textContent = mode === 'add' ? 'Add New User' : 'Edit User';
    document.getElementById('userFormMode').value = mode;
    document.getElementById('passwordInput').required = mode === 'add';
    document.getElementById('passwordFieldWrapper').style.display = 'block';
    document.getElementById('userModal').classList.add('visible');
}

function closeModal() {
    document.getElementById('userModal').classList.remove('visible');
    document.getElementById('userForm').reset();
    document.getElementById('lineManagerField').style.display = 'none';
    document.getElementById('categoriesField').style.display = 'none';
    document.getElementById('username-status').textContent = '';
    document.getElementById('email-status').textContent = '';
    isUsernameAvailable = false;
    isEmailAvailable = false;
}

function openEditModal(id) {
    const user = currentItems.find(u => (u._id || u.id) === id);
    if (!user) return;

    openModal('edit');
    document.getElementById('userFormId').value = id;
    document.getElementById('fullNameInput').value = user.fullName || user.fullname || '';
    document.getElementById('usernameInput').value = user.username;
    document.getElementById('emailInput').value = user.email;
    document.getElementById('roleInput').value = user.role;
    document.getElementById('roleInput').dispatchEvent(new Event('change'));

    // Editing: username/email already exist for this user, skip availability blocking
    isUsernameAvailable = true;
    isEmailAvailable = true;
    document.getElementById('passwordInput').placeholder = 'Leave blank to keep unchanged';
    document.getElementById('avatarInput').style.display = 'none'; // avatar/doc re-upload not supported in edit via upload.none()
    document.getElementById('documentInput').style.display = 'none';
    document.querySelector('label[for="avatarInput"]').style.display = 'none';
    document.querySelector('label[for="documentInput"]').style.display = 'none';

    if (user.role === 'author') document.getElementById('lineManagerInput').value = user.lineManager || '';
    if (user.role === 'editor') document.getElementById('categoriesInput').value = (user.assignedCategories || []).join(', ');
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const mode = document.getElementById('userFormMode').value;
    const role = document.getElementById('roleInput').value;

    if (mode === 'add') {
        if (!isUsernameAvailable) { alert('Please choose an available username.'); return; }
        if (!isEmailAvailable) { alert('Please choose an available email.'); return; }
    }

    const formData = new FormData();
    formData.append('fullName', document.getElementById('fullNameInput').value.trim());
    formData.append('username', document.getElementById('usernameInput').value.trim());
    formData.append('email', document.getElementById('emailInput').value.trim());
    formData.append('role', role);

    const password = document.getElementById('passwordInput').value.trim();
    if (password) formData.append('password', password);

    if (role === 'author') {
        formData.append('lineManager', document.getElementById('lineManagerInput').value.trim());
    }
    if (role === 'editor') {
        const categories = document.getElementById('categoriesInput').value
            .split(',').map(c => c.trim()).filter(Boolean);
        formData.append('assignedCategories', JSON.stringify(categories));
    }

    if (mode === 'add') {
        formData.append('submittedBy', currentUser.username);
        const avatar = document.getElementById('avatarInput').files[0];
        const documentFile = document.getElementById('documentInput').files[0];
        if (avatar) formData.append('avatar', avatar);
        if (documentFile) formData.append('pdf', documentFile);
    }

    try {
        let res;
        if (mode === 'add') {
            const endpoint = currentUser.role === 'editor' ? '/pendingUsers' : '/users';
            res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
        } else {
            const id = document.getElementById('userFormId').value;
            res = await fetch(`${API_BASE}/users/${id}`, {
                method: 'PUT',
                body: formData,
                credentials: 'include'
            });
        }

        const resData = await res.json().catch(() => ({}));

        if (!res.ok) {
            const msg = resData?.message || resData?.error || 'Unknown error';
            alert(`Failed to save user: ${msg}`);
            return;
        }

        closeModal();
        await loadUsers();
    } catch (err) {
        console.error(err);
        alert('Failed to save user.');
    }
}


