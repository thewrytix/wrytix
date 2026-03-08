const BASE = "https://wrytix.onrender.com";

async function loadStatsAndChart() {
    try {
        const [postsRes, approvalRes] = await Promise.all([
            fetch(`${BASE}/posts`, { credentials: 'include' }),
            fetch(`${BASE}/postSubmissions`, { credentials: 'include' })
        ]);

        if (!postsRes.ok || !approvalRes.ok) {
            throw new Error(`Unauthorized or error fetching data`);
        }

        const posts = await postsRes.json();
        const approvals = await approvalRes.json();
        const now = new Date();

        const totalPosts = posts.length;
        const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);
        const totalApprovalRequests = approvals.length;

        // Trending: Viewed within last 14 days
        const trendingThreshold = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const trendingPosts = posts.filter(p => {
            const lastViewed = p.lastViewed ? new Date(p.lastViewed) : null;
            return p.views && lastViewed && lastViewed >= trendingThreshold;
        });

        // Popular: Viewed within last 30 days
        const popularThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const popularPosts = posts.filter(p => {
            const lastViewed = p.lastViewed ? new Date(p.lastViewed) : null;
            return p.views && lastViewed && lastViewed >= popularThreshold;
        }).sort((a, b) => (b.views || 0) - (a.views || 0));

        // Live and Scheduled posts
        const livePosts = posts.filter(p => {
            const date = new Date(p.schedule);
            return !isNaN(date.getTime()) && date <= now;
        }).length;
        const scheduledPosts = totalPosts - livePosts;

        document.getElementById("statsContainer").innerHTML = `
        <div class="card"><h3>Total Posts</h3><p>${totalPosts}</p></div>
        <div class="card"><h3>Live Posts</h3><p>${livePosts}</p></div>
        <div class="card"><h3>Scheduled Posts</h3><p>${scheduledPosts}</p></div>
        <div class="card"><h3>Approval Requests</h3><p>${totalApprovalRequests}</p></div>
        <div class="card"><h3>Total Views</h3><p>${totalViews}</p></div>
        <div class="card"><h3>Trending Posts</h3><p>${trendingPosts.length}</p></div>
        <div class="card"><h3>Popular Posts</h3><p>${popularPosts.length}</p></div>
      `;

        const topViewed = popularPosts.slice(0, 5);
        const labels = topViewed.map(p => p.title.slice(0, 15) + (p.title.length > 15 ? '...' : ''));
        const data = topViewed.map(p => p.views || 0);

        new Chart(document.getElementById('viewsChart'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Views',
                    data,
                    backgroundColor: '#ff6b00'
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true }
                },
                responsive: true,
                plugins: {
                    legend: { display: false }
                }
            }
        });

        const recent = approvals.slice(-5).reverse();
        const submissionList = document.getElementById("recentSubmissions");
        submissionList.innerHTML = recent.length === 0
            ? `<li>No recent submissions</li>`
            : recent.map(post => `<li><strong>${post.title}</strong> by ${post.submittedBy || "Unknown"}</li>`).join('');

    } catch (err) {
        console.error("Failed to load dashboard:", err);
        document.getElementById("statsContainer").innerHTML = `<p style="color:red;">${err.message}</p>`;
        document.getElementById("recentSubmissions").innerHTML = `<li>Error loading data.</li>`;
    }
}

const userData = localStorage.getItem('user');
if (!userData) {
    alert("Please log in.");
    window.location.href = '../login.html';
}

const user = JSON.parse(userData);
if (user.role !== 'editor') {
    alert("Access denied. You are not an Editor.");
    window.location.href = '../login.html';
} else {
    window.addEventListener("DOMContentLoaded", loadStatsAndChart);
}

document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.clear();
    window.location.href = '../login.html';
});

document.getElementById("profileBtn").textContent = user.username || "Editor";