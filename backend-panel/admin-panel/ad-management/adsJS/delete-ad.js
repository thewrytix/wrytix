let allAds = [];
let filteredAds = [];
let currentPage = 1;
const adsPerPage = 10;

async function loadAds() {
    try {
        const res = await fetch('https://wrytix.onrender.com/ads');
        allAds = await res.json();
        currentPage = 1;
        filterAndRender();
    } catch (err) {
        document.getElementById('adsTableBody').innerHTML = '<tr><td colspan="4">Error loading ads</td></tr>';
    }
}

function filterAndRender() {
    const cat = document.getElementById('filterCategory').value;
    const type = document.getElementById('filterType').value;
    const search = document.getElementById('searchInput').value.toLowerCase();

    filteredAds = allAds.filter(ad => {
        const categoryMatch = cat ? ad.category === cat : true;
        const typeMatch = type ? ad.type === type : true;
        const companyMatch = search ? ad.company?.toLowerCase().includes(search) : true;
        return categoryMatch && typeMatch && companyMatch;
    });

    document.getElementById('noAdsMsg').style.display = filteredAds.length ? 'none' : 'block';
    renderAdsTable();
    renderPagination();
}

function renderAdsTable() {
    const tbody = document.getElementById('adsTableBody');
    tbody.innerHTML = '';

    const start = (currentPage - 1) * adsPerPage;
    const end = start + adsPerPage;
    const pageAds = filteredAds.slice(start, end);

    if (!pageAds.length) {
        tbody.innerHTML = '<tr><td colspan="4">No ads found.</td></tr>';
        return;
    }

    pageAds.forEach(ad => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td><input type="checkbox" data-id="${ad.id}"></td>
        <td>${ad.category}</td>
        <td>${ad.type}</td>
        <td>${ad.company || '—'}</td>
      `;
        tbody.appendChild(tr);
    });
}

function renderPagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    const totalPages = Math.ceil(filteredAds.length / adsPerPage);
    if (totalPages <= 1) return;

    const createBtn = (text, disabled, handler, active = false) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.disabled = disabled;
        if (active) btn.classList.add('active-page');
        btn.onclick = handler;
        return btn;
    };

    pagination.appendChild(createBtn('Previous', currentPage === 1, () => {
        currentPage--;
        renderAdsTable();
        renderPagination();
    }));

    for (let i = 1; i <= totalPages; i++) {
        pagination.appendChild(createBtn(i, false, () => {
            currentPage = i;
            renderAdsTable();
            renderPagination();
        }, i === currentPage));
    }

    pagination.appendChild(createBtn('Next', currentPage === totalPages, () => {
        currentPage++;
        renderAdsTable();
        renderPagination();
    }));
}

function resetFilters() {
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('searchInput').value = '';
    currentPage = 1;
    filterAndRender();
}

async function deleteSelectedAds() {
    const selected = [...document.querySelectorAll('tbody input[type="checkbox"]:checked')];
    if (!selected.length) return alert('Please select at least one ad to delete.');

    confirmAndRun( 'Are you sure you want to delete selected ads?', async () => {try {
            for (const checkbox of selected) {
                await fetch(`https://wrytix.onrender.com/ads/${checkbox.dataset.id}`, { method: 'DELETE' });
            }
            showSuccess('✅Selected ads deleted successfully.');
            await loadAds();
        } catch (err) {
            console.error(err);
            showError('❌Error deleting selected ads.');
        }},
        "❌ Rejection canceled.");

}

document.getElementById('filterCategory').addEventListener('change', () => { currentPage = 1; filterAndRender(); });
document.getElementById('filterType').addEventListener('change', () => { currentPage = 1; filterAndRender(); });
document.getElementById('searchInput').addEventListener('input', () => { currentPage = 1; filterAndRender(); });
document.getElementById('selectAll').addEventListener('change', e => {
    document.querySelectorAll('tbody input[type="checkbox"]').forEach(cb => cb.checked = e.target.checked);
});

loadAds();