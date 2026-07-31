
document.addEventListener('DOMContentLoaded', async () => {
    
    const userData = localStorage.getItem('user');
    if (!userData) { window.location.href = '/login.html'; return; }
    

    const user = JSON.parse(userData);
    const config = window.RoleConfig[user.role];
    if (!config) {
        alert('Access denied. contact admin.');
        window.location.href = '/login.html';
        return;
    }
    
    
    renderSidebar(window.RoleConfig[user.role].sidebar);
    setupSidebarCollapse();
    document.getElementById('profileBtn').textContent = user.username;


    document.getElementById('dashboardTitle').textContent = config.title;
    document.getElementById('profileBtn').textContent = user.username || user.role;

    // Show only the sections relevant to this role
    document.getElementById(`${user.role}Sections`)?.style.setProperty('display', 'block');

    if (user.role === 'admin') {
        document.getElementById('headlineSection').style.display = 'block';
        setupHeadlineEditor();
    }

    try {
        const res = await fetch(`${API_BASE}/dashboard-stats`, {
            credentials: 'include'
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const stats = await res.json();

        renderCards(config.cards, stats);
        renderRoleSpecificSections(stats);
    } catch (err) {
        console.error('Failed to load dashboard stats:', err);
        document.getElementById('statsContainer').innerHTML =
            '<p style="color:red;">Failed to load dashboard data.</p>';
    }
});



function renderCards(cardDefs, stats) {
    document.getElementById('statsContainer').innerHTML = cardDefs.map(card => `
        <div class="stat-box${card.id === 'totalViews' ? ' views' : ''}">
            <h2>${stats[card.id] ?? 0}</h2>
            <p>${card.label}</p>
        </div>
    `).join('');
}

function renderRoleSpecificSections(stats) {
    if (stats.role === 'admin') {

        renderPostList('trending-posts-list', stats.trendingPosts);
        renderPostList('popular-posts-list', stats.popularPosts);
        renderActivityList(stats.recentActivity);
        renderUserBreakdown(stats.usersByRole);
        renderRecentAdsTable(stats.recentAds);
        renderExpiringAdsTable(stats.expiringAds);

    } else if (stats.role === 'editor') {
        renderPostList('top-viewed-list', stats.topViewed);
        renderPostList('trending-list', stats.trendingPosts);
        renderPostList('popular-list', stats.popularPosts);
        renderSubmissionList(stats.recentSubmissions);

    } else if (stats.role === 'author') {
        renderPostList('my-posts-list', stats.myPosts);
    }
}

function renderPostList(elementId, posts) {
    const el = document.getElementById(elementId);
    if (!el || !posts) return;
    el.innerHTML = posts.length === 0
        ? '<li>No posts</li>'
        : posts.map(p => `
            <li>
                <a href="edit-post.html?slug=${encodeURIComponent(p.slug)}" class="activity-title">${p.title}</a>
                <span class="activity-date">${p.views || 0} views</span>
            </li>
        `).join('');
}

function renderActivityList(posts) {
    const el = document.getElementById('activityList');
    if (!el || !posts) return;
    el.innerHTML = posts.length === 0
        ? '<li>No recent activity</li>'
        : posts.map(p => {
            const d = new Date(p.schedule);
            const dateStr = isNaN(d.getTime()) ? 'No Schedule' : d.toLocaleDateString();
            return `
                <li>
                    <a href="edit-post.html?slug=${encodeURIComponent(p.slug)}" class="activity-title">${p.title}</a>
                    <span class="activity-date">${dateStr}</span>
                </li>`;
        }).join('');
}

function renderSubmissionList(submissions) {
    const el = document.getElementById('recentSubmissions');
    if (!el || !submissions) return;
    el.innerHTML = submissions.length === 0
        ? '<li>No recent submissions</li>'
        : submissions.map(s => `
            <li>
                <span class="activity-title">${s.title}</span>
                <span class="activity-date">${s.status}</span>
            </li>`).join('');
}

function renderUserBreakdown(byRole) {
    const el = document.getElementById('userBreakdownList');
    if (!el || !byRole) return;
    el.innerHTML = Object.entries(byRole).map(([role, count]) => `
        <li>
            <span class="activity-title">${role.charAt(0).toUpperCase() + role.slice(1)}</span>
            <span class="activity-date">${count}</span>
        </li>`).join('');
}

function renderRecentAdsTable(ads) {
    const tbody = document.querySelector('#recentAdsTable tbody');
    if (!tbody || !ads) return;

    if (ads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No recent ads available.</td></tr>';
        return;
    }

    const statusClass = (status) =>
        status === 'Expired' ? 'status-expired' : status === 'Active' ? 'status-active' : 'status-inactive';

    tbody.innerHTML = ads.map(ad => `
        <tr>
            <td>${ad.type}</td>
            <td>${ad.company || '—'}</td>
            <td>${ad.category}</td>
            <td class="${statusClass(ad.status)}">${ad.status}</td>
            <td>${ad.startDate?.split('T')[0] || ''}</td>
            <td>${ad.endDate?.split('T')[0] || ''}</td>
        </tr>
    `).join('');
}

function renderExpiringAdsTable(ads) {
    const tbody = document.getElementById('soonExpiringBody');
    if (!tbody || !ads) return;

    if (ads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No ads expiring soon.</td></tr>';
        return;
    }

    tbody.innerHTML = ads.map(ad => {
        const highlight = ad.endsIn === 'Today' || ad.endsIn === '1 day(s)' ? 'highlight' : '';
        return `
            <tr class="${highlight}">
                <td>${ad.company}</td>
                <td>${ad.type}</td>
                <td>${ad.category}</td>
                <td>${ad.endsIn}</td>
                <td>${ad.endDate?.split('T')[0] || ''}</td>
            </tr>`;
    }).join('');
}

function setupHeadlineEditor() {
    const headlineInput = document.getElementById('headlineInput');
    const saveBtn = document.getElementById('saveHeadlineBtn');
    const message = document.getElementById('headlineSavedMessage');
    const toggleBtn = document.querySelector('.toggle-headline');

    toggleBtn?.addEventListener('click', () => {
        const content = document.querySelector('.headline-editor-content');
        content.style.display = content.style.display === 'block' ? 'none' : 'block';
    });

    fetch(`${API_BASE}/headline`)
        .then(res => res.json())
        .then(data => { headlineInput.value = data.text || ''; })
        .catch(err => console.error('Error loading headline:', err));

    saveBtn?.addEventListener('click', async () => {
        const newHeadline = headlineInput.value.trim();
        if (!newHeadline) return;

        try {
            await fetch(`${API_BASE}/headline`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: newHeadline }),
                credentials: 'include'
            });
            message.style.display = 'block';
            setTimeout(() => (message.style.display = 'none'), 2000);
        } catch (err) {
            console.error('Error saving headline:', err);
            alert('Failed to update headline.');
        }
    });
}
