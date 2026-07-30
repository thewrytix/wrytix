const API_BASE = "https://wrytix.onrender.com";
const REFRESH_INTERVAL_MS = 30000; // re-check every 30s

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
    document.getElementById('profileBtn').textContent = user.username;

    loadHealth();
    setInterval(loadHealth, REFRESH_INTERVAL_MS);
});

function renderSidebar(links) {
    document.getElementById('sidebarLinks').innerHTML = links.map(link => `
        <li><a href="${link.href}"><i class="fa-solid ${link.icon}"></i> ${link.label}</a></li>
    `).join('');
}

async function loadHealth() {
    try {
        const res = await fetch(`${API_BASE}/system/health`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const health = await res.json();

        renderHealthCards(health);
        renderMetrics(health);

        document.getElementById('lastChecked').textContent =
            `Last checked: ${new Date(health.timestamp).toLocaleTimeString()}`;
    } catch (err) {
        console.error('Failed to load system health:', err);
        document.getElementById('healthCards').innerHTML =
            '<p style="color:red;">Failed to load system health data.</p>';
    }
}

function statusColor(status) {
    if (status === 'up') return 'green';
    if (status === 'degraded') return 'yellow';
    return 'red';
}

function renderHealthCards(health) {
    const cards = [
        {
            title: 'Express Server',
            status: health.express,
            desc: health.express === 'up' ? 'Responding normally' : 'Not responding'
        },
        {
            title: 'MongoDB',
            status: health.mongodb,
            desc: health.mongodb === 'up' ? 'Connected' : 'Connection issue detected'
        }
    ];

    document.getElementById('healthCards').innerHTML = cards.map(card => `
        <div class="health-card">
            <div class="status-dot ${statusColor(card.status)}"></div>
            <div class="health-card-info">
                <h3>${card.title}</h3>
                <p>${card.desc}</p>
            </div>
        </div>
    `).join('');
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
}

function renderMetrics(health) {
    const metrics = [
        { label: 'Uptime', value: formatUptime(health.uptimeSeconds) },
        { label: 'Memory (RSS)', value: `${health.memory.rssMB} MB` },
        { label: 'Heap Used', value: `${health.memory.heapUsedMB} MB` },
        { label: 'Heap Total', value: `${health.memory.heapTotalMB} MB` }
    ];

    document.getElementById('metricsGrid').innerHTML = metrics.map(m => `
        <div class="metric-item">
            <div class="value">${m.value}</div>
            <div class="label">${m.label}</div>
        </div>
    `).join('');
}