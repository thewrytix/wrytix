

const BASE_URL = "https://wrytix.onrender.com";
const statsContainer = document.getElementById("statsContainer");

async function loadAuthorStats() {
    const userData = sessionStorage.getItem("user");
    if (!userData) {
        statsContainer.innerHTML = '<p style="color:red;">⚠️ Please log in to view your dashboard.</p>';
        return;
    }

    const user = JSON.parse(userData);
    const username = (user?.username || "").toLowerCase();

    try {
        const [submissionsRes, approvedRes] = await Promise.all([
            fetch(`${BASE_URL}/postSubmissions`, { credentials: "include" }),
            fetch(`${BASE_URL}/posts/all`, { credentials: "include" })
        ]);

        const submissions = await submissionsRes.json();
        const approved = await approvedRes.json();

        const mySubmissions = submissions.filter(p => (p.submittedBy || "").toLowerCase() === username);
        const myApproved = approved.filter(p => (p.submittedBy || "").toLowerCase() === username);

        const pending = mySubmissions.filter(p => p.status === "pending").length;
        const rejected = mySubmissions.filter(p => p.status === "rejected").length;
        const approvedCount = myApproved.length;
        const total = pending + rejected + approvedCount;

        statsContainer.innerHTML = `
        <div class="card">
          <h3>Total Posts</h3>
          <p>${total}</p>
        </div>
        <div class="card">
          <h3>Approved</h3>
          <p>${approvedCount}</p>
        </div>
        <div class="card">
          <h3>Pending</h3>
          <p>${pending}</p>
        </div>
        <div class="card">
          <h3>Rejected</h3>
          <p>${rejected}</p>
        </div>
      `;
    } catch (err) {
        statsContainer.innerHTML = `<p style="color:red;">Failed to load stats: ${err.message}</p>`;
    }
}

const userData = sessionStorage.getItem('user');
if (!userData) {
    alert("Please log in.");
    window.location.href = '../login.html';
}

const user = JSON.parse(userData);
if (user.role !== 'author') {
    alert("Access denied. You are not an Author.");
    window.location.href = '../login.html';
}


window.addEventListener("DOMContentLoaded", loadAuthorStats);
