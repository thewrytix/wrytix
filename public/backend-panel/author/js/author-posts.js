
const BASE_URL = "https://wrytix.onrender.com";
const postsPerPage = 5;
let currentPage = 1;
let allPosts = [];
let currentUsername = "";

const postsContainer = document.getElementById("postsContainer");
const paginationEl = document.getElementById("pagination");
const statusFilter = document.getElementById("statusFilter");
const dateFilter = document.getElementById("dateFilter");

function showNotLoggedIn() {
    postsContainer.innerHTML = `
      <p style="color:red; font-weight:bold;">
        ⚠️ You are not logged in. Please log in to view your submissions.
      </p>`;
    document.querySelector(".filters").style.display = "none";
    document.getElementById("pagination").style.display = "none";
}

async function fetchPosts() {
    try {
        const userData = sessionStorage.getItem("user");
        if (!userData) return showNotLoggedIn();

        const user = JSON.parse(userData);
        currentUsername = (user.username || "").toLowerCase();

        const [submissionsRes, approvedRes] = await Promise.all([
            fetch(`${BASE_URL}/postSubmissions`, { credentials: 'include' }),
            fetch(`${BASE_URL}/posts/all`, { credentials: 'include' })
        ]);

        const submissions = await submissionsRes.json();
        const approvedPosts = await approvedRes.json();

        const mySubmissions = Array.isArray(submissions)
            ? submissions.filter(p => (p.submittedBy || "").toLowerCase() === currentUsername)
            : [];

        const myApproved = Array.isArray(approvedPosts)
            ? approvedPosts.filter(p => (p.submittedBy || "").toLowerCase() === currentUsername)
            : [];

        allPosts = [
            ...mySubmissions.map(p => ({ ...p, status: p.status || 'pending' })),
            ...myApproved.map(p => ({ ...p, status: 'approved' }))
        ];

        renderPosts();
    } catch (err) {
        postsContainer.innerHTML = `<p style="color:red;">Failed to load posts: ${err.message}</p>`;
    }
}

function renderPosts() {
    const filtered = allPosts.filter(post => {
        const statusMatch = !statusFilter.value || post.status === statusFilter.value;
        const dateMatch = !dateFilter.value || new Date(post.schedule || post.createdAt).toISOString().slice(0,10) === dateFilter.value;
        return statusMatch && dateMatch;
    });

    const start = (currentPage - 1) * postsPerPage;
    const paginated = filtered.slice(start, start + postsPerPage);

    if (paginated.length === 0) {
        postsContainer.innerHTML = "<p>No posts found.</p>";
        paginationEl.innerHTML = "";
        return;
    }

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Title</th>
          <th>Category</th>
          <th>Status</th>
          <th>Scheduled</th>
          <th>Created At</th>
          <th>Views</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${paginated.map(post => {
        const statusClass = `status-${post.status}`;
        const reason = post.rejectionReason || post.editorComments || 'No reason given';
        const escapedReason = reason.replace(/"/g, '&quot;');

        return `
            <tr>
              <td>${post.title}</td>
              <td>${post.category}</td>
              <td class="${statusClass}">${post.status.charAt(0).toUpperCase() + post.status.slice(1)}</td>
              <td>${new Date(post.schedule || post.createdAt).toLocaleString()}</td>
              <td>${new Date(post.createdAt).toLocaleString()}</td>
              <td>${post.views || 0}</td>
              <td>
                ${post.status === 'rejected' ? `
                  <button class="btn view-reason-btn" data-reason="${escapedReason}">View Reason</button>
                  <a class="btn" href="edit-rejected-submission.html?id=${post.id}">Edit</a>
                ` : ""}
              </td>
            </tr>`;
    }).join("")}
      </tbody>
    `;
    postsContainer.innerHTML = "";
    postsContainer.appendChild(table);

    renderPagination(filtered.length);
}

function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / postsPerPage);
    paginationEl.innerHTML = "";
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        if (i === currentPage) btn.disabled = true;
        btn.addEventListener("click", () => {
            currentPage = i;
            renderPosts();
        });
        paginationEl.appendChild(btn);
    }
}

function applyFilters() {
    currentPage = 1;
    renderPosts();
}

function resetFilters() {
    statusFilter.value = "";
    dateFilter.value = "";
    currentPage = 1;
    renderPosts();
}

document.addEventListener("DOMContentLoaded", fetchPosts);

document.addEventListener("click", function (e) {
    if (e.target.classList.contains("view-reason-btn")) {
        const reason = e.target.dataset.reason || "No reason given";
        showError(reason);
    }
});
