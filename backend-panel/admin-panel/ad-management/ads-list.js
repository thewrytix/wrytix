let currentPage = 1;
const adsPerPage = 10;
let allFilteredAds = [];

function getAdPreview(ad) {
    try {
        if (ad.type === 'image' && ad.file?.startsWith('data:image') && ad.file.length > 100) {
            return `<img src="${ad.file}" alt="Ad Preview" style="max-width: 80px; max-height: 60px;" />`;
        }
        if (ad.type === 'video' && ad.file?.startsWith('data:video')) {
            return `<video src="${ad.file}" style="max-width:100px;max-height:60px;" muted autoplay loop></video>`;
        }
        if (ad.type === 'html' && ad.html) {
            return `<iframe srcdoc="${ad.html.replace(/"/g, '&quot;')}" sandbox style="width:100px;height:60px;border:none;"></iframe>`;
        }
        if (ad.type === 'text' && ad.text) {
            return `<div style="max-width:100px;max-height:60px;overflow:auto;">${ad.text.slice(0, 50)}...</div>`;
        }
        return `<div style="width:80px;height:60px;background:#eee;display:grid;place-items:center;font-size:12px;">
        No preview<br>available
      </div>`;
    } catch (e) {
        console.error("Preview error:", e);
        return "Error";
    }
}

async function loadAds() {
    const categoryFilter = document.getElementById('filterCategory').value;
    const typeFilter = document.getElementById('filterType').value;
    const statusFilter = document.getElementById('filterStatus').value;
    const searchText = document.getElementById('searchInput').value.trim().toLowerCase();
    const tbody = document.getElementById('adsTableBody');
    tbody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';

    try {
        const res = await fetch('https://wrytix.onrender.com/ads');
        const ads = await res.json();

        allFilteredAds = ads.filter(ad => {
            const categoryMatch = categoryFilter ? ad.category === categoryFilter : true;
            const typeMatch = typeFilter ? ad.type === typeFilter : true;
            const statusMatch = statusFilter ? (statusFilter === 'active' ? ad.active : !ad.active) : true;
            const companyMatch = searchText ? ad.company?.toLowerCase().includes(searchText) : true;
            return categoryMatch && typeMatch && statusMatch && companyMatch;
        });

        currentPage = 1;
        renderAdsTable();
        renderPagination();
    } catch (err) {
        console.error('Failed to load ads:', err);
        tbody.innerHTML = '<tr><td colspan="8">Error loading ads</td></tr>';
    }
}

function renderAdsTable() {
    const tbody = document.getElementById('adsTableBody');
    tbody.innerHTML = '';

    const startIndex = (currentPage - 1) * adsPerPage;
    const pageAds = allFilteredAds.slice(startIndex, startIndex + adsPerPage);

    if (!pageAds.length) {
        tbody.innerHTML = '<tr><td colspan="8">No ads found.</td></tr>';
        return;
    }

    pageAds.forEach(ad => {
        const tr = document.createElement('tr');
        const preview = getAdPreview(ad);
        tr.innerHTML = `
        <td>${preview}</td>
        <td>${ad.type}</td>
        <td>${ad.category}</td>
        <td>${ad.company || '—'}</td>
        <td>${ad.startDate?.split('T')[0] || ''}</td>
        <td>${ad.endDate?.split('T')[0] || ''}${new Date(ad.endDate) < new Date() ? '<span style="color:red;font-weight:bold;"> ⚠️ Expired</span>' : ''}</td>
        <td>${ad.active ? '✅' : '❌'}</td>
        <td class="action-buttons">
          <button class="btn-edit" onclick="editAd('${ad.id}')">Edit</button>
          <button class="status-btn" onclick="toggleAdStatus('${ad.id}', ${ad.active})">${ad.active ? 'Deactivate' : 'Activate'}</button>
          <button class="delete-btn" onclick="deleteAd('${ad.id}')">Delete</button>
        </td>
      `;
        tbody.appendChild(tr);
    });
}

function renderPagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    const pageCount = Math.ceil(allFilteredAds.length / adsPerPage);
    if (pageCount <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        currentPage--;
        renderAdsTable();
        renderPagination();
    };
    pagination.appendChild(prevBtn);

    for (let i = 1; i <= pageCount; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === currentPage ? 'active-page' : '';
        btn.onclick = () => {
            currentPage = i;
            renderAdsTable();
            renderPagination();
        };
        pagination.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage === pageCount;
    nextBtn.onclick = () => {
        currentPage++;
        renderAdsTable();
        renderPagination();
    };
    pagination.appendChild(nextBtn);
}

function editAd(id) {
    window.location.href = `edit-ad.html?id=${id}`;
}

async function deleteAd(id) {
    if (!confirm('Are you sure you want to delete this ad?')) return;
    try {
        const res = await fetch(`https://wrytix.onrender.com/ads/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert('Ad deleted');
            loadAds();
        } else {
            alert('Delete failed');
        }
    } catch (err) {
        alert('Error deleting ad');
        console.error(err);
    }
}

async function toggleAdStatus(id, currentStatus) {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this ad?`)) return;
    try {
        const res = await fetch(`https://wrytix.onrender.com/ads/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: !currentStatus })
        });

        const result = await res.json();
        if (res.ok) {
            alert(`Ad is now ${result.ad.active ? 'active' : 'inactive'}`);
            loadAds();
        } else {
            alert('Failed to update ad: ' + result.error);
        }
    } catch (err) {
        console.error("Toggle error:", err);
        alert('An error occurred while toggling the ad');
    }
}

function resetFilters() {
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('searchInput').value = '';
    currentPage = 1;
    loadAds();
}

document.getElementById('filterCategory').addEventListener('change', () => { currentPage = 1; loadAds(); });
document.getElementById('filterType').addEventListener('change', () => { currentPage = 1; loadAds(); });
document.getElementById('filterStatus').addEventListener('change', () => { currentPage = 1; loadAds(); });
document.getElementById('searchInput').addEventListener('keyup', () => { currentPage = 1; loadAds(); });

loadAds();