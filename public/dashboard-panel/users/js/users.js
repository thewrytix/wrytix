let currentUser = null;
let currentStatus = 'all';
let currentPage = 1;
let currentItems = [];
let selectedIds = new Set();
let isUsernameAvailable = false;
let isEmailAvailable = false;
let usernameTimer, emailTimer;
let editorsList = [];

document.addEventListener('DOMContentLoaded', async () => {
    const userData = localStorage.getItem('user');
    if (!userData) { window.location.href = '/login.html'; return; }

    currentUser = JSON.parse(userData);
    if (!['admin', 'editor'].includes(currentUser.role)) {
        showError('Access denied.');
        window.location.href = '/login.html';
        return;
    }

    renderSidebar(window.RoleConfig[currentUser.role].sidebar);
    setupSidebarCollapse();
    document.getElementById('profileBtn').textContent = currentUser.username;

    await loadEditorsList();
    setupEventListeners();
    setupRoleFieldToggling();
    setupAvailabilityChecks(); // FIX: this was never called before — root cause of the availability bug
    loadUsers();
});

async function loadEditorsList() {
    try {
        const res = await fetch(`${API_BASE}/users/editors`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        editorsList = await res.json();

        const select = document.getElementById('lineManagerInput');
        select.innerHTML = '<option value="">-- No line manager --</option>' +
            editorsList.map(e => `<option value="${e.username}">${e.fullname || e.username}</option>`).join('');
    } catch (err) {
        showError('Failed to load editors list: ' + err.message);
    }
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
    document.getElementById('closeViewModalBtn').addEventListener('click', closeViewModal);

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
    tbody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';

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
        showError('Failed to load users: ' + err.message);
        tbody.innerHTML = '<tr><td colspan="8">Failed to load users.</td></tr>';
    }
}

function renderTable(items) {
    const tbody = document.getElementById('usersTableBody');

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8">No users found.</td></tr>';
        return;
    }

    tbody.innerHTML = items.map(item => {
        const key = item._id || item.id;
        const isPending = item.source === 'pending';
        const fullNameDisplay = item.fullname || item.fullName || '—';

        return `
            <tr>
                <td><input type="checkbox" class="row-checkbox" data-id="${key}" ${selectedIds.has(key) ? 'checked' : ''} /></td>
                <td>${fullNameDisplay}</td>
                <td>${item.username}</td>
                <td>${item.email}</td>
                <td>${item.role}</td>
                <td>${isPending ? '<span class="status-scheduled">Pending</span>' : (item.status === 'active' ? '<span class="status-live">Active</span>' : '<span class="status-none">Inactive</span>')}</td>
                <td>${item.lineManager || '—'}</td>
                <td class="action-buttons">
                    <button class="btn-edit" onclick="openViewModal('${key}', ${isPending})">View</button>
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

/* ============ View Modal ============ */

async function openViewModal(id, isPending) {
    document.getElementById('viewModal').classList.add('visible');
    document.getElementById('viewModalBody').innerHTML = '<p>Loading...</p>';

    try {
        const url = isPending ? `${API_BASE}/pendingUsers/${id}` : `${API_BASE}/users/${id}`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load user details');
        const user = await res.json();

        const avatarHtml = user.avatarId
            ? `<div style="margin:1rem 0;">
                 <img src="${API_BASE}/files/${user.avatarId}" alt="Avatar" style="max-width:150px;border-radius:8px;border:1px solid var(--border-color);" />
                 <br><a href="${API_BASE}/files/${user.avatarId}" download target="_blank" class="btn-edit" style="display:inline-block;margin-top:0.5rem;">Download Avatar</a>
               </div>`
            : '<p><em>No profile picture</em></p>';

        const documentHtml = user.pdfId
            ? `<div style="margin:1rem 0;">
                 <a href="${API_BASE}/files/${user.pdfId}" download target="_blank" class="btn-edit">
                    <i class="fa-solid fa-file-pdf"></i> Download ${user.pdfOriginalName || 'Document'}
                 </a>
               </div>`
            : '<p><em>No document attached</em></p>';

        document.getElementById('viewModalBody').innerHTML = `
            <p><strong>Full Name:</strong> ${user.fullname || user.fullName || '—'}</p>
            <p><strong>Username:</strong> ${user.username}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Role:</strong> ${user.role}</p>
            <p><strong>Status:</strong> ${user.status || 'pending'}</p>
            ${user.lineManager ? `<p><strong>Line Manager:</strong> ${user.lineManager}</p>` : ''}
            ${user.assignedCategories?.length ? `<p><strong>Categories:</strong> ${user.assignedCategories.join(', ')}</p>` : ''}
            <hr style="margin:1rem 0;" />
            <h3>Profile Picture</h3>
            ${avatarHtml}
            <h3>Attached Document</h3>
            ${documentHtml}
        `;
    } catch (err) {
        document.getElementById('viewModalBody').innerHTML = `<p style="color:red;">${err.message}</p>`;
    }
}

function closeViewModal() {
    document.getElementById('viewModal').classList.remove('visible');
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
    const ok = await showConfirm(`Delete ${selectedIds.size} user(s)? This cannot be undone.`, { title: 'Delete users', confirmText: 'Delete' });
    if (!ok) return;

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
        showSuccess('Users deleted.');
    } catch (err) {
        showError('Bulk delete failed: ' + err.message);
    }
}

async function handleSingleDelete(id) {
    const ok = await showConfirm('This action cannot be undone.', { title: 'Delete this user?', confirmText: 'Delete' });
    if (!ok) return;

    try {
        const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE', credentials: 'include' });
        if (!res.ok) throw new Error('Delete failed');
        await loadUsers();
        showSuccess('User deleted.');
    } catch (err) {
        showError('Delete failed: ' + err.message);
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
        showSuccess('User approved.');
    } catch (err) {
        showError('Failed to approve user: ' + err.message);
    }
}

async function rejectPendingUser(id) {
    const ok = await showConfirm('Reject this user submission?', { title: 'Reject user', confirmText: 'Reject' });
    if (!ok) return;

    try {
        const res = await fetch(`${API_BASE}/pendingUsers/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Reject failed');
        await loadUsers();
        showSuccess('User rejected.');
    } catch (err) {
        showError('Failed to reject user: ' + err.message);
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
    document.getElementById('avatarInput').style.display = 'block';
    document.getElementById('documentInput').style.display = 'block';
    document.querySelector('label[for="avatarInput"]').style.display = 'block';
    document.querySelector('label[for="documentInput"]').style.display = 'block';
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
    document.getElementById('fullNameInput').value = user.fullname || user.fullName || '';
    document.getElementById('usernameInput').value = user.username;
    document.getElementById('emailInput').value = user.email;
    document.getElementById('roleInput').value = user.role;
    document.getElementById('roleInput').dispatchEvent(new Event('change'));

    // Editing: username/email already belong to this user, skip the availability gate
    isUsernameAvailable = true;
    isEmailAvailable = true;
    document.getElementById('passwordInput').placeholder = 'Leave blank to keep unchanged';

    // Avatar/document re-upload isn't supported via upload.none() on the update route
    document.getElementById('avatarInput').style.display = 'none';
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
        if (!isUsernameAvailable) { showError('Please choose an available username.'); return; }
        if (!isEmailAvailable) { showError('Please choose an available email.'); return; }
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
            showError(`Failed to save user: ${msg}`);
            return;
        }

        closeModal();
        await loadUsers();
        showSuccess('User saved successfully.');
    } catch (err) {
        showError('Failed to save user: ' + err.message);
    }
}