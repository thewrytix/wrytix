const API_BASE = "https://wrytix.onrender.com";
let chartInstance = null;
let currentRange = 'weekly';

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

    setupEventListeners();
    loadAnalytics('weekly');
});

function renderSidebar(links) {
    document.getElementById('sidebarLinks').innerHTML = links.map(link => `
        <li><a href="${link.href}"><i class="fa-solid ${link.icon}"></i> ${link.label}</a></li>
    `).join('');
}

function setupEventListeners() {
    document.querySelectorAll('.range-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.range-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const range = tab.dataset.range;
            const customInputs = document.getElementById('customRangeInputs');

            if (range === 'custom') {
                customInputs.classList.add('visible');
                return; // wait for Apply button
            }

            customInputs.classList.remove('visible');
            currentRange = range;
            loadAnalytics(range);
        });
    });

    document.getElementById('applyCustomRangeBtn').addEventListener('click', () => {
        const from = document.getElementById('fromDate').value;
        const to = document.getElementById('toDate').value;

        if (!from || !to) {
            alert('Please select both start and end dates.');
            return;
        }

        loadAnalytics('custom', from, to);
    });
}

async function loadAnalytics(range, from = null, to = null) {
    const params = new URLSearchParams({ range });
    if (range === 'custom' && from && to) {
        params.set('from', from);
        params.set('to', to);
    }

    try {
        const res = await fetch(`${API_BASE}/users/analytics?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        renderSummary(data);
        renderChart(data.dailyBreakdown);
    } catch (err) {
        console.error('Failed to load analytics:', err);
        document.getElementById('totalVisitsValue').textContent = 'Error';
    }
}

function renderSummary(data) {
    const totalAnonymous = data.dailyBreakdown.reduce((sum, d) => sum + d.anonymous, 0);
    const totalLoggedIn = data.dailyBreakdown.reduce((sum, d) => sum + d.loggedIn, 0);

    document.getElementById('totalVisitsValue').textContent = data.totalVisits;
    document.getElementById('anonymousVisitsValue').textContent = totalAnonymous;
    document.getElementById('loggedInVisitsValue').textContent = totalLoggedIn;
}

function renderChart(dailyBreakdown) {
    const labels = dailyBreakdown.map(d => d.date);
    const totals = dailyBreakdown.map(d => d.total);
    const anonymous = dailyBreakdown.map(d => d.anonymous);
    const loggedIn = dailyBreakdown.map(d => d.loggedIn);

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(document.getElementById('visitsChart'), {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Total Visits',
                    data: totals,
                    borderColor: '#1A237E',
                    backgroundColor: 'rgba(26, 35, 126, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Anonymous',
                    data: anonymous,
                    borderColor: '#CD7F32',
                    backgroundColor: 'transparent',
                    tension: 0.3
                },
                {
                    label: 'Logged-in',
                    data: loggedIn,
                    borderColor: '#28a745',
                    backgroundColor: 'transparent',
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                legend: { display: true, position: 'top' }
            }
        }
    });
}