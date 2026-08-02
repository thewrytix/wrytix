let currentUser = null;
let currentStatus = 'all';
let currentPage = 1;
let currentItems = [];
let selectedKeys = new Set();
let rejectTargetKey = null;

document.addEventListener('DOMContentLoaded', async () => {
    const userData = localStorage.getItem('user');
    if (!userData) { window.location.href = '/login.html'; return; }

    currentUser = JSON.parse(userData);
    renderSidebar(window.RoleConfig[currentUser.role].sidebar);
    setupSidebarCollapse();
    document.getElementById('profileBtn').textContent = currentUser.username;

    if (currentUser.role === 'author') {
        document.getElementById('authorColHeader').style.display = 'none';
        document.getElementById('filterAuthor').style.display = 'none';
    }

    renderStatusTabs();
    await loadCategoryOptions();
    setupEventListeners();
    loadPosts();
});

function renderStatusTabs() {
    const container = document.getElementById('statusTabs');

    const tabs = currentUser.role === 'author'
        ? [
            { status: 'all', label: 'All' },
            { status: 'pending', label: 'Pending' },
            { status: 'approved', label: 'Approved' },
            { status: 'rejected', label: 'Rejected' }
        ]
        : [
            { status: 'all', label: 'All' },
            { status: 'live', label: 'Live' },
            { status: 'scheduled', label: 'Scheduled' },
            { status: 'pending', label: 'Pending Approval' }
        ];

    container.innerHTML = tabs.map((t, i) => `
        <button class="status-tab ${i === 0 ? 'active' : ''}" data-status="${t.status}">${t.label}</button>
    `).join('');

    container.querySelectorAll('.status-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            container.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentStatus = tab.dataset.status;
            currentPage = 1;
            selectedKeys.clear();
            loadPosts();
        });
    });
}

async function loadCategoryOptions() {
    try {
        const res = await fetch(`${API_BASE}/category`, { credentials: 'include' });
        const categories = await res.json();

        const filterSelect = document.getElementById('filterCategory');
        const modalSelect = document.getElementById('postCategoryInput');

        const optionsHtml = categories.map(cat =>
            `<option value="${cat.name.toLowerCase()}">${cat.name}</option>`
        ).join('');

        filterSelect.innerHTML = '<option value="">All Categories</option>' + optionsHtml;
        modalSelect.innerHTML = '<option value="">Select a category</option>' + optionsHtml;
    } catch (err) {
        showError('Failed to load categories: ' + err.message);
    }
}

function setupEventListeners() {
    document.getElementById('searchBtn').addEventListener('click', () => { currentPage = 1; loadPosts(); });
    document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterCategory').value = '';
        document.getElementById('filterFeatured').value = '';
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
    document.getElementById('previewPostBtn').addEventListener('click', handlePreview);

    // Reject modal
    document.getElementById('confirmRejectBtn').addEventListener('click', confirmRejection);
    document.getElementById('cancelRejectBtn').addEventListener('click', closeRejectModal);
}

/* ============ Load & Render ============ */

async function loadPosts() {
    const tbody = document.getElementById('postsTableBody');
    tbody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';

    const params = new URLSearchParams({
        status: currentStatus,
        page: currentPage,
        search: document.getElementById('searchInput').value.trim(),
        category: document.getElementById('filterCategory').value,
        featured: document.getElementById('filterFeatured').value,
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
        showError('Failed to load posts: ' + err.message);
        tbody.innerHTML = '<tr><td colspan="8">Failed to load posts.</td></tr>';
    }
}

function renderTable(items) {
    const tbody = document.getElementById('postsTableBody');
    const isAuthor = currentUser.role === 'author';
    const isReviewer = currentUser.role === 'admin' || currentUser.role === 'editor';
    const isPendingTab = currentStatus === 'pending';

    if (items.length === 0) {
        const colspan = isAuthor ? 7 : 8;
        tbody.innerHTML = `<tr><td colspan="${colspan}">No posts found.</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(item => {
        const key = `${item.source}:${item.slug || item.id}`;
        const isChecked = selectedKeys.has(key);

        let statusLabel;
        if (item.source === 'submission') {
            const statusText = item.status === 'rejected' ? 'Rejected' : 'Pending';
            const statusClass = item.status === 'rejected' ? 'status-none' : 'status-scheduled';
            statusLabel = `<span class="${statusClass}">${statusText}</span>`;
        } else {
            const isLive = new Date(item.schedule) <= new Date();
            statusLabel = isAuthor
                ? `<span class="status-live">Approved</span>`
                : (isLive ? `<span class="status-live">Live</span>` : `<span class="status-scheduled">Scheduled</span>`);
        }

        const authorDisplay = item.author || item.submittedBy || 'Unknown';
        const featuredBadge = item.featured ? `<span class="featured-badge">Featured</span>` : '—';

        // Build action buttons based on role + context
        let actions = '';

        if (isReviewer && isPendingTab && item.source === 'submission') {
            // Editor/admin reviewing a pending submission: Approve / Reject / Edit / Delete
            actions = `
                <button class="btn approve" onclick="approveSubmission('${key}')">Approve</button>
                <button class="btn reject" onclick="openRejectModal('${key}')">Reject</button>
                <button class="btn-edit" onclick="openEditModal('${key}')">Edit</button>
                <button class="delete-btn" onclick="handleSingleDelete('${key}')">Delete</button>
            `;
        } else if (item.status === 'rejected') {
            actions = `
                <button class="btn-edit" onclick="showRejectReason('${key}')">View Reason</button>
                <button class="btn-edit" onclick="openEditModal('${key}')">Edit &amp; Resubmit</button>
                <button class="delete-btn" onclick="handleSingleDelete('${key}')">Delete</button>
            `;
        } else {
            actions = `
                <button class="btn-edit" onclick="openEditModal('${key}')">Edit</button>
                <button class="delete-btn" onclick="handleSingleDelete('${key}')">Delete</button>
            `;
        }

        let rowHtml = `
            <td><input type="checkbox" class="row-checkbox" data-key="${key}" ${isChecked ? 'checked' : ''} /></td>
            <td>${item.title}</td>
            <td>${item.category || 'Uncategorized'}</td>
        `;

        if (!isAuthor) {
            rowHtml += `<td>${authorDisplay}</td>`;
        }

        rowHtml += `
            <td>${statusLabel}</td>
            <td>${featuredBadge}</td>
            <td>${item.views || 0}</td>
            <td class="action-buttons">${actions}</td>
        `;

        return `<tr>${rowHtml}</tr>`;
    }).join('');

    document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => toggleSelection(e.target.dataset.key, e.target.checked));
    });
}

function showRejectReason(key) {
    const item = currentItems.find(i => `${i.source}:${i.slug || i.id}` === key);
    showInfo(item?.editorComments || 'No reason given.');
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

/* ============ Approve / Reject (Editor & Admin) ============ */

async function approveSubmission(key) {
    if (!confirm('Approve and publish this post?')) return;
    const [, slug] = key.split(':');

    try {
        const res = await fetch(`${API_BASE}/postSubmissions/${slug}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved' }),
            credentials: 'include'
        });

        const resData = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(resData?.error || 'Approve failed');

        showSuccess('Post approved and published.');
        await loadPosts();
    } catch (err) {
        showError('Failed to approve post: ' + err.message);
    }
}

function openRejectModal(key) {
    rejectTargetKey = key;
    document.getElementById('rejectionReasonInput').value = '';
    document.getElementById('rejectModal').classList.add('visible');
}

function closeRejectModal() {
    rejectTargetKey = null;
    document.getElementById('rejectModal').classList.remove('visible');
}

async function confirmRejection() {
    const reason = document.getElementById('rejectionReasonInput').value.trim();
    if (!reason) {
        showError('Rejection reason is required.');
        return;
    }

    const [, slug] = rejectTargetKey.split(':');

    try {
        const res = await fetch(`${API_BASE}/postSubmissions/${slug}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'rejected', editorComments: reason }),
            credentials: 'include'
        });

        const resData = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(resData?.error || 'Reject failed');

        closeRejectModal();
        showSuccess('Post rejected.');
        await loadPosts();
    } catch (err) {
        showError('Failed to reject post: ' + err.message);
    }
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

        const resData = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(resData?.error || 'Bulk delete failed');

        selectedKeys.clear();
        await loadPosts();
        showSuccess('Bulk deleted successfully.');
    } catch (err) {
        showError(err.message);
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

        const resData = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(resData?.error || 'Delete failed');

        await loadPosts();
        showSuccess('Post deleted.');
    } catch (err) {
        showError('Delete failed: ' + err.message);
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
    document.getElementById('postContent').innerHTML = '';
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

    fetchFullPostForEdit(item);
}

async function fetchFullPostForEdit(item) {
    try {
        const url = item.source === 'submission'
            ? `${API_BASE}/postSubmissions/${item.slug || item.id}`
            : `${API_BASE}/posts/${item.slug}`;

        const res = await fetch(url, { credentials: 'include' });
        const full = await res.json();

        document.getElementById('postContent').innerHTML = full.content || '';
        document.getElementById('postSourceInput').value = full.source || '';
        document.getElementById('postFeaturedInput').checked = !!full.featured;
        if (full.thumbnail) {
            document.getElementById('thumbnailPreview').src = full.thumbnail;
            document.getElementById('thumbnailPreviewContainer').style.display = 'block';
        }
        if (full.schedule) {
            const d = new Date(full.schedule);
            document.getElementById('postScheduleInput').value = d.toISOString().slice(0, 16);
        }
    } catch (err) {
        showError('Failed to load full post for edit: ' + err.message);
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

async function collectFormData() {
    const title = document.getElementById('postTitleInput').value.trim();
    const author = document.getElementById('postAuthorInput').value.trim();
    const category = document.getElementById('postCategoryInput').value;
    const content = document.getElementById('postContent').innerHTML.trim();
    const source = document.getElementById('postSourceInput').value.trim();
    const featured = document.getElementById('postFeaturedInput').checked; // boolean, can legitimately be false
    const schedule = document.getElementById('postScheduleInput').value;

    const thumbnailInput = document.getElementById('postThumbnailInput');
    let thumbnail = document.getElementById('thumbnailPreview').src.startsWith('http')
        ? document.getElementById('thumbnailPreview').src
        : '';

    if (thumbnailInput.files[0]) {
        thumbnail = await uploadToCloudinary(thumbnailInput.files[0]);
    }

    return { title, author, category, thumbnail, content, source, featured, schedule };
}

async function handlePreview() {
    const data = await collectFormData();

    if (!data.title || !data.category || !data.content) {
        showError('Please fill in title, category, and content before previewing.');
        return;
    }

    localStorage.setItem('previewPost', JSON.stringify(data));
    window.open('preview.html', '_blank');
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const mode = document.getElementById('postFormMode').value;

    let payload;
    try {
        payload = await collectFormData();
    } catch (err) {
        showError('Thumbnail upload failed. Please try again.');
        return;
    }

    // FIXED: removed `featured` from this required-fields check —
    // it's a boolean checkbox and `false` is a perfectly valid, common value
    if (!payload.title || !payload.author || !payload.category || !payload.content) {
        showError('Please complete all required fields.');
        return;
    }

    if (!payload.thumbnail) {
        showError('A thumbnail image is required.');
        return;
    }

    try {
        let res;
        if (mode === 'add') {
            payload.slug = slugify(payload.title);
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

        const resData = await res.json().catch(() => ({}));

        if (!res.ok) {
            const msg = resData?.error || resData?.message || `Save failed (${res.status})`;
            throw new Error(msg);
        }

        closeModal();
        await loadPosts();
        showSuccess('Post saved successfully.');
    } catch (err) {
        showError('Failed to save post: ' + err.message);
    }
}