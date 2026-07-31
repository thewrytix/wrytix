
let currentUser = null;
let currentStatus = 'all';
let currentPage = 1;
let currentItems = [];
let selectedKeys = new Set(); // "source:slug" strings

document.addEventListener('DOMContentLoaded', () => {
    const userData = localStorage.getItem('user');
    if (!userData) { window.location.href = '/login.html'; return; }

    currentUser = JSON.parse(userData);
    renderSidebar(window.RoleConfig[currentUser.role].sidebar);
    setupSidebarCollapse()
    document.getElementById('profileBtn').textContent = currentUser.username;

    // Authors don't need author filter/column, or the pending-visible-to-others distinction
    if (currentUser.role === 'author') {
        document.getElementById('authorColHeader').style.display = 'none';
        document.getElementById('filterAuthor').style.display = 'none';
    }

    setupEventListeners();
    loadPosts();
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
            selectedKeys.clear();
            loadPosts();
        });
    });

    document.getElementById('searchBtn').addEventListener('click', () => { currentPage = 1; loadPosts(); });
    document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterCategory').value = '';
        document.getElementById('filterAuthor').value = '';
        currentPage = 1;
        loadPosts();
    });

    document.getElementById('selectAllCheckbox').addEventListener('change', (e) => {
        document.querySelectorAll('.row-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
            toggleSelection(cb.dataset.key, e.target.checked);
        });
    });

    document.getElementById('clearSelectionBtn').addEventListener('click', () => {
        selectedKeys.clear();
        document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false);
        document.getElementById('selectAllCheckbox').checked = false;
        updateBulkBar();
    });

    document.getElementById('bulkDeleteBtn').addEventListener('click', handleBulkDelete);

    document.getElementById('openAddModalBtn').addEventListener('click', () => openModal('add'));
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closeModal);

    document.getElementById('postThumbnailInput').addEventListener('change', handleThumbnailPreview);
    document.getElementById('postForm').addEventListener('submit', handleFormSubmit);

    document.getElementById('postTitleInput').addEventListener('input', () => {
        // auto-suggest source filename if needed elsewhere; slug handled server-side on create
    });
}

/* ============ Load & Render ============ */

async function loadPosts() {
    const tbody = document.getElementById('postsTableBody');
    tbody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';

    const params = new URLSearchParams({
        status: currentStatus,
        page: currentPage,
        search: document.getElementById('searchInput').value.trim(),
        category: document.getElementById('filterCategory').value.trim(),
        author: document.getElementById('filterAuthor').value.trim()
    });

    try {
        const res = await fetch(`${API_BASE}/posts/manage?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        currentItems = data.items;
        renderTable(data.items);
        renderPagination(data.page, data.totalPages);
    } catch (err) {
        console.error('Failed to load posts:', err);
        tbody.innerHTML = '<tr><td colspan="7">Failed to load posts.</td></tr>';
    }
}

function renderTable(items) {
    const tbody = document.getElementById('postsTableBody');

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No posts found.</td></tr>';
        return;
    }

    tbody.innerHTML = items.map(item => {
        const key = `${item.source}:${item.slug || item.id}`;
        const isChecked = selectedKeys.has(key);

        let statusLabel;
        if (item.source === 'submission') {
            statusLabel = `<span class="status-scheduled">Pending</span>`;
        } else {
            const isLive = new Date(item.schedule) <= new Date();
            statusLabel = isLive
                ? `<span class="status-live">Live</span>`
                : `<span class="status-scheduled">Scheduled</span>`;
        }

        const authorDisplay = item.author || item.submittedBy || 'Unknown';

        return `
            <tr>
                <td><input type="checkbox" class="row-checkbox" data-key="${key}" ${isChecked ? 'checked' : ''} /></td>
                <td>${item.title}</td>
                <td>${item.category || 'Uncategorized'}</td>
                <td>${authorDisplay}</td>
                <td>${statusLabel}</td>
                <td>${item.views || 0}</td>
                <td class="action-buttons">
                    <button class="btn-edit" onclick="openEditModal('${key}')">Edit</button>
                    <button class="delete-btn" onclick="handleSingleDelete('${key}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');

    document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => toggleSelection(e.target.dataset.key, e.target.checked));
    });
}

function renderPagination(page, totalPages) {
    const container = document.getElementById('pagination');
    container.innerHTML = '';
    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = page === 1;
    prevBtn.onclick = () => { currentPage = page - 1; loadPosts(); };
    container.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === page ? 'active-page' : '';
        btn.onclick = () => { currentPage = i; loadPosts(); };
        container.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = page === totalPages;
    nextBtn.onclick = () => { currentPage = page + 1; loadPosts(); };
    container.appendChild(nextBtn);
}

/* ============ Selection & Bulk Actions ============ */

function toggleSelection(key, checked) {
    if (checked) selectedKeys.add(key);
    else selectedKeys.delete(key);
    updateBulkBar();
}

function updateBulkBar() {
    const bar = document.getElementById('bulkBar');
    const count = selectedKeys.size;
    document.getElementById('bulkCount').textContent = `${count} selected`;
    bar.classList.toggle('visible', count > 0);
}

async function handleBulkDelete() {
    if (selectedKeys.size === 0) return;
    if (!confirm(`Delete ${selectedKeys.size} item(s)? This cannot be undone.`)) return;

    const items = [...selectedKeys].map(key => {
        const [source, slug] = key.split(':');
        return { source, slug };
    });

    try {
        const res = await fetch(`${API_BASE}/posts/bulk-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items }),
            credentials: 'include'
        });

        if (!res.ok) throw new Error('Bulk delete failed');
        selectedKeys.clear();
        await loadPosts();
    } catch (err) {
        console.error('Bulk delete error:', err);
        alert('Bulk delete failed.');
    }
}

async function handleSingleDelete(key) {
    if (!confirm('Delete this post?')) return;
    const [source, slug] = key.split(':');

    try {
        const res = await fetch(`${API_BASE}/posts/bulk-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: [{ source, slug }] }),
            credentials: 'include'
        });

        if (!res.ok) throw new Error('Delete failed');
        await loadPosts();
    } catch (err) {
        console.error('Delete error:', err);
        alert('Delete failed.');
    }
}

/* ============ Modal: Add / Edit ============ */

function openModal(mode) {
    document.getElementById('modalTitle').textContent = mode === 'add' ? 'Add New Post' : 'Edit Post';
    document.getElementById('postFormMode').value = mode;
    document.getElementById('postModal').classList.add('visible');
}

function closeModal() {
    document.getElementById('postModal').classList.remove('visible');
    document.getElementById('postForm').reset();
    document.getElementById('postContentEditable').innerHTML = '';
    document.getElementById('thumbnailPreviewContainer').style.display = 'none';
}

function openEditModal(key) {
    const item = currentItems.find(i => `${i.source}:${i.slug || i.id}` === key);
    if (!item) return;

    openModal('edit');
    document.getElementById('postFormSlug').value = item.slug || item.id;
    document.getElementById('postFormSource').value = item.source;
    document.getElementById('postTitleInput').value = item.title;
    document.getElementById('postAuthorInput').value = item.author || item.submittedBy || '';
    document.getElementById('postCategoryInput').value = item.category || '';
    document.getElementById('postFeaturedInput').checked = !!item.featured;

    // Content/source/schedule aren't in the lean list response — fetch full record for edit
    fetchFullPostForEdit(item);
}

async function fetchFullPostForEdit(item) {
    try {
        const url = item.source === 'submission'
            ? `${API_BASE}/postSubmissions/${item.slug || item.id}`
            : `${API_BASE}/posts/${item.slug}`;

        const res = await fetch(url, { credentials: 'include' });
        const full = await res.json();

        document.getElementById('postContentEditable').innerHTML = full.content || '';
        document.getElementById('postSourceInput').value = full.source || '';
        if (full.thumbnail) {
            document.getElementById('thumbnailPreview').src = full.thumbnail;
            document.getElementById('thumbnailPreviewContainer').style.display = 'block';
        }
        if (full.schedule) {
            const d = new Date(full.schedule);
            document.getElementById('postScheduleInput').value = d.toISOString().slice(0, 16);
        }
    } catch (err) {
        console.error('Failed to load full post for edit:', err);
    }
}

function handleThumbnailPreview(e) {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('thumbnailPreview').src = URL.createObjectURL(file);
    document.getElementById('thumbnailPreviewContainer').style.display = 'block';
}

async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) throw new Error('Image upload failed');
    const data = await res.json();
    return data.secure_url;
}

const slugify = text =>
    text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');

async function handleFormSubmit(e) {
    e.preventDefault();

    const mode = document.getElementById('postFormMode').value;
    const title = document.getElementById('postTitleInput').value.trim();
    const author = document.getElementById('postAuthorInput').value.trim();
    const category = document.getElementById('postCategoryInput').value;
    const content = document.getElementById('postContentEditable').innerHTML.trim();
    const source = document.getElementById('postSourceInput').value.trim();
    const featured = document.getElementById('postFeaturedInput').checked;
    const schedule = document.getElementById('postScheduleInput').value;

    const thumbnailInput = document.getElementById('postThumbnailInput');
    let thumbnail;
    if (thumbnailInput.files[0]) {
        try {
            thumbnail = await uploadToCloudinary(thumbnailInput.files[0]);
        } catch (err) {
            alert('Thumbnail upload failed.');
            return;
        }
    }

    const payload = { title, author, category, content, source, featured, schedule };
    if (thumbnail) payload.thumbnail = thumbnail;

    try {
        let res;
        if (mode === 'add') {
            payload.slug = slugify(title);
            // Authors submit for approval; editors/admins publish directly
            const endpoint = currentUser.role === 'author' ? '/postSubmissions' : '/posts';
            res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
        } else {
            const slug = document.getElementById('postFormSlug').value;
            const source = document.getElementById('postFormSource').value;
            const endpoint = source === 'submission' ? `/postSubmissions/${slug}` : `/posts/${slug}`;
            res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
        }

        if (!res.ok) throw new Error('Save failed');

        closeModal();
        await loadPosts();
    } catch (err) {
        console.error('Save error:', err);
        alert('Failed to save post.');
    }
}