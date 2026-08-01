

let allLogs = [];
let currentPage = 1;
const pageSize = 15;


document.addEventListener('DOMContentLoaded', async () => {
    const userData = localStorage.getItem('user');
    if (!userData) { window.location.href = '/login.html'; return; }

    const user = JSON.parse(userData);
    if (user.role !== 'admin') {
        alert('Access denied. Admins only.');
        window.location.href = '/login.html';
        return;
    }

    renderSidebar(window.RoleConfig.admin.sidebar);
    setupSidebarCollapse();
    document.getElementById('profileBtn').textContent = user.username;

    setupEventListeners();
    await fetchLogs();
});



function setupEventListeners() {
    const searchActor = document.getElementById('searchActor');
    const searchTarget = document.getElementById('searchTarget');
    const filterAction = document.getElementById('filterAction');
    const filterDate = document.getElementById('filterDate');

    [searchActor, searchTarget, filterAction, filterDate].forEach(input =>
        input.addEventListener('input', handleFilterChange)
    );

    document.getElementById('resetFilters').addEventListener('click', () => {
        searchActor.value = '';
        searchTarget.value = '';
        filterAction.value = '';
        filterDate.value = '';
        currentPage = 1;
        renderLogs();
    });

    document.getElementById('clearLogs').addEventListener('click', () => {
        if (!confirm('Are you sure you want to delete ALL logs? This action cannot be undone.')) return;
        clearAllLogs();
    });
}

function handleFilterChange() {
    currentPage = 1;
    renderLogs();
}

async function fetchLogs(limit = 500) {
    try {
        const url = new URL(`${API_BASE}/logs`);
        url.searchParams.append('limit', limit);
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allLogs = await res.json();

        // Safety net — backend already sorts newest-first, but keep this in case that changes
        allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        renderLogs();
    } catch (err) {
        console.error('Error loading logs:', err);
        document.getElementById('logTableBody').innerHTML =
            '<tr><td colspan="6">Failed to load logs.</td></tr>';
    }
}

function renderLogs() {
    const query = document.getElementById('searchActor').value.toLowerCase();
    const targetQuery = document.getElementById('searchTarget').value.toLowerCase();
    const selectedAction = document.getElementById('filterAction').value.toLowerCase();
    const selectedDate = document.getElementById('filterDate').value;

    const filtered = allLogs.filter(log => {
        const actorMatch = log.actor?.toLowerCase().includes(query);
        const actionMatch = !selectedAction || log.action?.toLowerCase().includes(selectedAction);
        const targetMatch = log.username?.toLowerCase().includes(targetQuery) || log.target?.toLowerCase().includes(targetQuery);
        const dateMatch = !selectedDate || new Date(log.timestamp).toISOString().slice(0, 10) === selectedDate;
        return actorMatch && actionMatch && targetMatch && dateMatch;
    });

    const totalPages = Math.ceil(filtered.length / pageSize);
    const start = (currentPage - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    document.getElementById('logTableBody').innerHTML = paginated.length === 0
        ? '<tr><td colspan="6">No logs found.</td></tr>'
        : paginated.map(log => `
            <tr>
                <td>${log.actor || 'Unknown'}</td>
                <td>${log.action || 'Unknown'}</td>
                <td>${log.username || log.target || 'N/A'}</td>
                <td>${log.ip || 'N/A'}</td>
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td><button class="btn-details" onclick="showLogDetails('${log.id}')">Details</button></td>
            </tr>
        `).join('');

    updatePagination(totalPages);
}

function updatePagination(totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { currentPage--; renderLogs(); };
    pagination.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === currentPage ? 'active-page' : '';
        btn.onclick = () => { currentPage = i; renderLogs(); };
        pagination.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { currentPage++; renderLogs(); };
    pagination.appendChild(nextBtn);
}

window.showLogDetails = (logId) => {
    const log = allLogs.find(l => l.id === logId);
    if (!log) { alert('Log not found'); return; }
    alert(`Log Details:\n\n${JSON.stringify(log, null, 2)}`);
};

async function clearAllLogs() {
    try {
        const res = await fetch(`${API_BASE}/logs`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to clear logs.');
        await fetchLogs();
        showSuccess('All logs cleared!')
    } catch (err) {
     showError('Failed to clear logs.');

    }
}