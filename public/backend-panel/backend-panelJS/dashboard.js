document.addEventListener('DOMContentLoaded', async () => {
    const userData = localStorage.getItem('user');
    if (!userData) {
        window.location.href = '/login.html';
        return;
    }

    const user = JSON.parse(userData);
    const config = window.RoleConfig[user.role];
    if (!config) {
        window.location.href = '/login.html';
        return;
    }

    renderSidebar(config.sidebar);
    document.getElementById('dashboardTitle').textContent = config.title;
    document.getElementById('profileBtn').textContent = user.username || user.role;

    try {
        const res = await fetch('https://wrytix.onrender.com/dashboard-stats', {
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

function renderSidebar(links) {
    const nav = document.getElementById('sidebarLinks');
    nav.innerHTML = links.map(link =>
        `<li><a href="${link.href}">${link.label}</a></li>`
    ).join('');
}

function renderCards(cardDefs, stats) {
    const container = document.getElementById('statsContainer');
    container.innerHTML = cardDefs.map(card => `
        <div class="stat-box">
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
    } else if (stats.role === 'editor') {
        renderPostList('top-viewed-list', stats.topViewed);
        renderSubmissionList(stats.recentSubmissions);
    } else if (stats.role === 'author') {
        renderPostList('my-posts-list', stats.myPosts);
    }
}

function renderPostList(elementId, posts) {
    const el = document.getElementById(elementId);
    if (!el || !posts) return;
    el.innerHTML = posts.length === 0
        ? '<li class="no-posts">No posts</li>'
        : posts.map(p => `
            <li>
                <a href="edit-post.html?slug=${encodeURIComponent(p.slug)}">${p.title}</a>
                <span class="post-views">${p.views || 0} views</span>
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
            return `<li><a href="edit-post.html?slug=${encodeURIComponent(p.slug)}">${p.title}</a><span>${dateStr}</span></li>`;
        }).join('');
}

function renderSubmissionList(submissions) {
    const el = document.getElementById('recentSubmissions');
    if (!el || !submissions) return;
    el.innerHTML = submissions.length === 0
        ? '<li>No recent submissions</li>'
        : submissions.map(s => `<li><strong>${s.title}</strong> — ${s.status}</li>`).join('');
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/login.html';
});