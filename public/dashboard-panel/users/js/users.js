let currentCategories = [];
let allEditors = [];
let allAuthors = [];

document.addEventListener('DOMContentLoaded', async () => {
    const userData = localStorage.getItem('user');
    if (!userData) { window.location.href = '/login.html'; return; }

    const user = JSON.parse(userData);
    if (user.role !== 'admin') {
        showError('Access denied. Admins only.');
        window.location.href = '/login.html';
        return;
    }

    renderSidebar(window.RoleConfig.admin.sidebar);
    setupSidebarCollapse();
    document.getElementById('profileBtn').textContent = user.username;

    setupEventListeners();
    await loadEditorsAndAuthors();
    await loadCategories();
});

function setupEventListeners() {
    document.getElementById('openAddModalBtn').addEventListener('click', () => openModal('add'));
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
    document.getElementById('categoryForm').addEventListener('submit', handleFormSubmit);
}

async function loadEditorsAndAuthors() {
    try {
        const res = await fetch(`${API_BASE}/users/manage?status=active&role=editor`, { credentials: 'include' });
        const editorData = await res.json();
        allEditors = editorData.items || [];

        const res2 = await fetch(`${API_BASE}/users/manage?status=active&role=author`, { credentials: 'include' });
        const authorData = await res2.json();
        allAuthors = authorData.items || [];

        // FIX: use username as the option value, matching what the backend now expects
        document.getElementById('categoryEditorInput').innerHTML =
            '<option value="">-- Unassigned --</option>' +
            allEditors.map(e => `<option value="${e.username}">${e.fullname || e.username}</option>`).join('');

        document.getElementById('categoryAuthorsCheckboxes').innerHTML = allAuthors.length === 0
            ? '<p>No authors available.</p>'
            : allAuthors.map(a => `
                <label style="display:block;margin-bottom:6px;">
                    <input type="checkbox" class="author-checkbox" value="${a.username}" />
                    ${a.fullname || a.username}
                </label>
            `).join('');
    } catch (err) {
        showError('Failed to load editors/authors: ' + err.message);
    }
}

async function loadCategories() {
    const tbody = document.getElementById('categoriesTableBody');
    tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';

    try {
        const res = await fetch(`${API_BASE}/category`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        currentCategories = await res.json();
        renderTable(currentCategories);
    } catch (err) {
        showError('Failed to load categories: ' + err.message);
        tbody.innerHTML = '<tr><td colspan="4">Failed to load categories.</td></tr>';
    }
}

function renderTable(categories) {
    const tbody = document.getElementById('categoriesTableBody');
    if (categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No categories yet.</td></tr>';
        return;
    }

    tbody.innerHTML = categories.map(cat => `
        <tr>
            <td>${cat.name}</td>
            <td>${cat.editorName || 'N/A'}</td>
            <td>${(cat.authors || []).map(a => a.name).join(', ') || '—'}</td>
            <td class="action-buttons">
                <button class="btn-edit" onclick="openEditModal('${cat.id}')">Edit</button>
                <button class="delete-btn" onclick="handleDelete('${cat.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function openModal(mode) {
    document.getElementById('modalTitle').textContent = mode === 'add' ? 'Add New Category' : 'Edit Category';
    document.getElementById('categoryFormMode').value = mode;
    document.getElementById('categoryModal').classList.add('visible');
}

function closeModal() {
    document.getElementById('categoryModal').classList.remove('visible');
    document.getElementById('categoryForm').reset();
    document.querySelectorAll('.author-checkbox').forEach(cb => cb.checked = false);
}

function openEditModal(id) {
    const cat = currentCategories.find(c => c.id === id);
    if (!cat) return;

    openModal('edit');
    document.getElementById('categoryFormId').value = id;
    document.getElementById('categoryNameInput').value = cat.name;
    document.getElementById('categoryEditorInput').value = cat.editor || ''; // cat.editor is already a username

    // FIX: cat.authors is an array of {username, name} objects (from readCategories), not raw strings —
    // need to check by .username, previously this probably compared against the wrong shape
    const authorUsernames = (cat.authors || []).map(a => a.username);
    document.querySelectorAll('.author-checkbox').forEach(cb => {
        cb.checked = authorUsernames.includes(cb.value);
    });
}

async function handleDelete(id) {
    const ok = await showConfirm('This action cannot be undone.', { title: 'Delete this category?', confirmText: 'Delete' });
    if (!ok) return;

    try {
        const res = await fetch(`${API_BASE}/category/${id}`, { method: 'DELETE', credentials: 'include' });
        if (!res.ok) throw new Error('Delete failed');
        await loadCategories();
        showSuccess('Category deleted.');
    } catch (err) {
        showError('Failed to delete category: ' + err.message);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const mode = document.getElementById('categoryFormMode').value;
    const authors = [...document.querySelectorAll('.author-checkbox:checked')].map(cb => cb.value);

    const payload = {
        name: document.getElementById('categoryNameInput').value.trim(),
        editor: document.getElementById('categoryEditorInput').value,
        authors
    };

    try {
        let res;
        if (mode === 'add') {
            res = await fetch(`${API_BASE}/category`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
        } else {
            const id = document.getElementById('categoryFormId').value;
            res = await fetch(`${API_BASE}/category/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
        }

        const resData = await res.json().catch(() => ({}));
        if (!res.ok) {
            showError(resData?.error || 'Failed to save category.');
            return;
        }

        closeModal();
        await loadCategories();
        showSuccess('Category saved successfully.');
    } catch (err) {
        showError('Failed to save category: ' + err.message);
    }
}