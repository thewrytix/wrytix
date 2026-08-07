let chartInstance = null;
let currentRange = 'daily';

document.addEventListener('DOMContentLoaded', () => {
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
    loadAnalytics('daily');
});

function setupEventListeners() {
    document.querySelectorAll('.range-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.range-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const range = tab.dataset.range;
            const customInputs = document.getElementById('customRangeInputs');

            if (range === 'custom') {
                customInputs.classList.add('visible');
                return;
            }

            customInputs.classList.remove('visible');
            currentRange = range;
            loadAnalytics(range);
        });
    });

    document.getElementById('applyCustomRangeBtn').addEventListener('click', () => {
        const from = document.getElementById('fromDate').value;
        const to = document.getElementById('toDate').value;
        if (!from || !to) { showError('Please select both start and end dates.'); return; }
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

        renderRangeLabel(data);
        renderSummary(data);
        renderChart(data.breakdown, range);
        renderGeoList(data.geoBreakdown);
    } catch (err) {
        showError('Failed to load analytics: ' + err.message);
    }
}

function renderRangeLabel(data) {
    const start = new Date(data.startDate).toLocaleDateString();
    const end = new Date(data.endDate).toLocaleDateString();
    document.getElementById('rangeLabel').textContent = `Showing ${start} – ${end}`;
}

function renderSummary(data) {
    document.getElementById('totalVisitsValue').textContent = data.totalVisits;
    document.getElementById('anonymousVisitsValue').textContent = data.totalAnonymous;
    document.getElementById('loggedInVisitsValue').textContent = data.totalLoggedIn;
}

function renderChart(breakdown, range) {
    const labels = breakdown.map(b => b.label);
    const anonymous = breakdown.map(b => b.anonymous);
    const loggedIn = breakdown.map(b => b.loggedIn);

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(document.getElementById('visitsChart'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Anonymous',
                    data: anonymous,
                    backgroundColor: '#CD7F32',
                    borderRadius: 4
                },
                {
                    label: 'Logged-in',
                    data: loggedIn,
                    backgroundColor: '#1A237E',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
            },
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            }
        }
    });
}

// Converts an ISO 3166-1 alpha-2 code (e.g. "GH", "US") into a flag emoji — pure Unicode math, no assets/dependencies
function countryCodeToFlagEmoji(code) {
    if (!code || code.length !== 2) return '🏳️';
    return code.toUpperCase().replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function renderGeoList(geoBreakdown) {
    const container = document.getElementById('geoList');

    if (!geoBreakdown || geoBreakdown.length === 0) {
        container.innerHTML = '<p>No visit data for this period.</p>';
        return;
    }

    const maxTotal = Math.max(...geoBreakdown.map(g => g.total));

    container.innerHTML = geoBreakdown.map(g => {
        const isUnknown = g.country === 'Unknown';
        const flag = isUnknown ? '🌐' : countryCodeToFlagEmoji(g.country);
        const barWidth = maxTotal > 0 ? Math.round((g.total / maxTotal) * 100) : 0;

        return `
            <div class="geo-row">
                <span class="geo-flag">${flag}</span>
                <span class="geo-country-name">${isUnknown ? 'Unknown' : g.country}</span>
                <div class="geo-bar-track"><div class="geo-bar-fill" style="width:${barWidth}%;"></div></div>
                <span class="geo-count">${g.total}</span>
            </div>
        `;
    }).join('');
}