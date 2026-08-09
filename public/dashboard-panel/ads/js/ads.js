

let currentStatus = 'all';
let currentPage = 1;
let currentItems = [];
let selectedIds = new Set();

document.addEventListener('DOMContentLoaded', () => {
    const userData = localStorage.getItem('user');
    if (!userData) { window.location.href = '/login.html'; return; }

    const user = JSON.parse(userData);
    if (user.role !== 'admin') {
        alert('Access denied. Admins only.');
        window.location.href = '/login.html';
        return;
    }

    renderSidebar(window.RoleConfig.admin.sidebar);
    setupSidebarCollapse()
    document.getElementById('profileBtn').textContent = user.username;

    setupEventListeners();
    loadAds();
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
            loadAds();
        });
    });

    document.getElementById('searchBtn').addEventListener('click', () => { currentPage = 1; loadAds(); });
    document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterCategory').value = '';
        currentPage = 1;
        loadAds();
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
    document.getElementById('bulkActivateBtn').addEventListener('click', () => handleBulkToggle(true));
    document.getElementById('bulkDeactivateBtn').addEventListener('click', () => handleBulkToggle(false));

    document.getElementById('openAddModalBtn').addEventListener('click', () => openModal('add'));
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closeModal);

    document.getElementById('adFileInput').addEventListener('change', handleFilePreview);
    document.getElementById('adForm').addEventListener('submit', handleFormSubmit);
}

/* ============ Load & Render ============ */

async function loadAds() {
    const tbody = document.getElementById('adsTableBody');
    tbody.innerHTML = '<tr><td colspan="9">Loading...</td></tr>';

    const params = new URLSearchParams({
        status: currentStatus,
        page: currentPage,
        search: document.getElementById('searchInput').value.trim(),
        category: document.getElementById('filterCategory').value
    });

    try {
        const res = await fetch(`${API_BASE}/ads/manage?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        currentItems = data.items;
        renderTable(data.items);
        renderPagination(data.page, data.totalPages);
    } catch (err) {
        console.error('Failed to load ads:', err);
        tbody.innerHTML = '<tr><td colspan="9">Failed to load ads.</td></tr>';
    }
}

function getAdPreview(ad) {
    if (ad.type === 'image' && ad.file) {
        return `<img src="${ad.file}" alt="Ad Preview" style="max-width:80px;max-height:60px;" loading="lazy" />`;
    }
    if (ad.type === 'video' && ad.file) {
        return `<video src="${ad.file}" style="max-width:100px;max-height:60px;" muted autoplay loop></video>`;
    }
    if (ad.type === 'html' && ad.html) {
        return `<iframe srcdoc="${ad.html.replace(/"/g, '&quot;')}" sandbox style="width:100px;height:60px;border:none;"></iframe>`;
    }
    if (ad.type === 'text' && ad.text) {
        return `<div style="max-width:100px;max-height:60px;overflow:auto;">${ad.text.slice(0, 50)}...</div>`;
    }
    return `<div style="width:80px;height:60px;background:#eee;display:grid;place-items:center;font-size:12px;">No preview</div>`;
}

function renderTable(items) {
    const tbody = document.getElementById('adsTableBody');

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9">No ads found.</td></tr>';
        return;
    }

    tbody.innerHTML = items.map(ad => `
        <tr>
            <td><input type="checkbox" class="row-checkbox" data-id="${ad.id}" ${selectedIds.has(ad.id) ? 'checked' : ''} /></td>
            <td>${getAdPreview(ad)}</td>
            <td>${ad.type}</td>
            <td>${ad.category}</td>
            <td>${ad.company || '—'}</td>
            <td>${ad.startDate?.split('T')[0] || ''}</td>
            <td>${ad.endDate?.split('T')[0] || ''}${new Date(ad.endDate) < new Date() ? ' <span class="status-expired">Expired️</span>' : ''}</td>
            <td>${ad.active ? '<span class="status-active">Active</span>' : '<span class="status-danger">Suspended</span>'}</td>
            <td class="action-buttons">
                <button class="btn-edit" onclick="openEditModal('${ad.id}')">Edit</button>  
                <button class="status-btn" onclick="handleSingleToggle('${ad.id}', ${ad.active})">${ad.active ? 'Deactivate' : 'Activate'}</button>
                <button class="delete-btn" onclick="handleSingleDelete('${ad.id}')">Delete</button>
            </td>
        </tr>
    `).join('');

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
    prevBtn.onclick = () => { currentPage = page - 1; loadAds(); };
    container.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === page ? 'active-page' : '';
        btn.onclick = () => { currentPage = i; loadAds(); };
        container.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = page === totalPages;
    nextBtn.onclick = () => { currentPage = page + 1; loadAds(); };
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
    if (!confirm(`Delete ${selectedIds.size} ad(s)? This cannot be undone.`)) return;

    try {
        const res = await fetch(`${API_BASE}/ads/bulk-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [...selectedIds] }),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Bulk delete failed');
        selectedIds.clear();
        await loadAds();
    } catch (err) {
        console.error(err);
        alert('Bulk delete failed.');
    }
}

async function handleBulkToggle(active) {
    if (selectedIds.size === 0) return;

    try {
        const res = await fetch(`${API_BASE}/ads/bulk-toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [...selectedIds], active }),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Bulk update failed');
        selectedIds.clear();
        await loadAds();
    } catch (err) {
        console.error(err);
        alert('Bulk update failed.');
    }
}

async function handleSingleDelete(id) {
    if (!confirm('Delete this ad?')) return;
    try {
        const res = await fetch(`${API_BASE}/ads/${id}`, { method: 'DELETE', credentials: 'include' });
        if (!res.ok) throw new Error('Delete failed');
        await loadAds();
    } catch (err) {
        console.error(err);
        alert('Delete failed.');
    }
}

async function handleSingleToggle(id, currentStatus) {
    try {
        const res = await fetch(`${API_BASE}/ads/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: !currentStatus }),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Toggle failed');
        await loadAds();
    } catch (err) {
        console.error(err);
        alert('Failed to toggle status.');
    }
}

/* ============ Modal: Add / Edit ============ */

function openModal(mode) {
    document.getElementById('modalTitle').textContent = mode === 'add' ? 'Add New Ad' : 'Edit Ad';
    document.getElementById('adFormMode').value = mode;
    document.getElementById('adModal').classList.add('visible');
}

function closeModal() {
    document.getElementById('adModal').classList.remove('visible');
    document.getElementById('adForm').reset();
    document.getElementById('filePreviewContainer').style.display = 'none';
    document.getElementById('currentAdFileUrl').value = '';
}

function openEditModal(id) {
    const ad = currentItems.find(a => a.id === id);
    if (!ad) return;

    openModal('edit');
    document.getElementById('adFormId').value = ad.id;
    document.getElementById('currentAdFileUrl').value = ad.file || '';
    document.getElementById('adTypeInput').value = ad.type;
    document.getElementById('adHtmlInput').value = ad.html || '';
    document.getElementById('adTextInput').value = ad.text || '';
    document.getElementById('adLinkInput').value = ad.link || '';
    document.getElementById('adCompanyInput').value = ad.company || '';
    document.getElementById('adCategoryInput').value = ad.category;
    document.getElementById('adPositionInput').value = ad.position || '';
    document.getElementById('adStartDateInput').value = ad.startDate?.split('T')[0] || '';
    document.getElementById('adEndDateInput').value = ad.endDate?.split('T')[0] || '';
    document.getElementById('adActiveInput').checked = ad.active;

    if (ad.file) {
        showPreview(ad.type, ad.file);
    }
}

function showPreview(type, url) {
    const container = document.getElementById('filePreviewContainer');
    const img = document.getElementById('filePreviewImg');
    const video = document.getElementById('filePreviewVideo');

    container.style.display = 'block';
    if (type === 'image') {
        img.src = url;
        img.style.display = 'block';
        video.style.display = 'none';
    } else if (type === 'video') {
        video.src = url;
        video.style.display = 'block';
        img.style.display = 'none';
    }
}

function handleFilePreview(e) {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('image') ? 'image' : 'video';
    showPreview(type, url);
}

async function uploadToCloudinary(file) {
    const resourceType = file.type.startsWith('video') ? 'video' : 'image';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) throw new Error('File upload failed');
    const data = await res.json();
    return data.secure_url;
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const mode = document.getElementById('adFormMode').value;
    const fileInput = document.getElementById('adFileInput');
    let fileUrl = document.getElementById('currentAdFileUrl').value || null;

    if (fileInput.files[0]) {
        try {
            fileUrl = await uploadToCloudinary(fileInput.files[0]);
        } catch (err) {
            alert('File upload failed.');
            return;
        }
    }

    const payload = {
        type: document.getElementById('adTypeInput').value,
        category: document.getElementById('adCategoryInput').value,
        position: document.getElementById('adPositionInput').value,
        startDate: document.getElementById('adStartDateInput').value,
        endDate: document.getElementById('adEndDateInput').value,
        link: document.getElementById('adLinkInput').value,
        company: document.getElementById('adCompanyInput').value,
        html: document.getElementById('adHtmlInput').value,
        text: document.getElementById('adTextInput').value,
        active: document.getElementById('adActiveInput').checked,
        file: fileUrl
    };

    try {
        let res;
        if (mode === 'add') {
            res = await fetch(`${API_BASE}/ads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
        } else {
            const id = document.getElementById('adFormId').value;
            res = await fetch(`${API_BASE}/ads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });
        }

        if (!res.ok) throw new Error('Save failed');
        closeModal();
        await loadAds();
    } catch (err) {
        console.error(err);
        alert('Failed to save ad.');
    }
}