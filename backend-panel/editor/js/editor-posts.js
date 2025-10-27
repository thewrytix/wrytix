if (sessionStorage.getItem('loggedIn') !== 'true') {
    window.location.href = '../../login.html';
}

let allPosts = [];
const POSTS_PER_PAGE = 10;
let currentPage = 1;

function showStatus(msg, isError = false) {
    let statusEl = document.getElementById('statusMsg');
    if (!statusEl) {
        statusEl = document.createElement('p');
        statusEl.id = 'statusMsg';
        statusEl.style.margin = '10px 0';
        statusEl.style.fontWeight = 'bold';
        document.querySelector('.admin-main').prepend(statusEl);
    }
    statusEl.textContent = msg;
    statusEl.style.color = isError ? 'red' : 'green';
}

function paginatePosts(posts, page) {
    const start = (page - 1) * POSTS_PER_PAGE;
    return posts.slice(start, start + POSTS_PER_PAGE);
}

function renderPagination(posts) {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';

    const pageCount = Math.ceil(posts.length / POSTS_PER_PAGE);
    if (pageCount <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        currentPage--;
        renderPosts(posts);
    };
    paginationContainer.appendChild(prevBtn);

    for (let i = 1; i <= pageCount; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === currentPage ? 'active-page' : '';
        btn.onclick = () => {
            currentPage = i;
            renderPosts(posts);
        };
        paginationContainer.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage === pageCount;
    nextBtn.onclick = () => {
        currentPage++;
        renderPosts(posts);
    };
    paginationContainer.appendChild(nextBtn);
}

function renderPosts(posts) {
    const tbody = document.getElementById('postsList');
    const noPostsMsg = document.getElementById('noPostsMsg');
    tbody.innerHTML = '';

    if (posts.length === 0) {
        noPostsMsg.style.display = 'block';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    noPostsMsg.style.display = 'none';
    const now = new Date();
    const sorted = [...posts].sort((a, b) => new Date(b.schedule || 0) - new Date(a.schedule || 0));
    const paginated = paginatePosts(sorted, currentPage);

    paginated.forEach(post => {
        const publishDate = new Date(post.schedule);
        const isValid = !isNaN(publishDate.getTime());
        const isLive = isValid && publishDate <= now;

        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td>${post.title}</td>
        <td>${post.slug}</td>
        <td>${post.category || 'Uncategorized'}</td>
        <td>${post.author || 'Unknown'}</td>
        <td>${isValid ? publishDate.toLocaleString() : 'N/A'}</td>
        <td class="${isLive ? 'status-live' : (isValid ? 'status-scheduled' : 'status-none')}">
          ${isLive ? 'Live' : (isValid ? 'Scheduled' : 'No Schedule')}
        </td>
        <td>${post.views || 0}</td>
        <td>${post.featured ? 'Yes' : 'No'}</td>
        <td><a href="editor-edit-post.html?slug=${encodeURIComponent(post.slug)}" class="btn btn-edit">Edit</a></td>
      `;
        tbody.appendChild(tr);
    });

    renderPagination(sorted);
}

async function loadPosts() {
    showStatus('Loading posts...');
    try {
        const res = await fetch('https://wrytix.onrender.com/posts/all',{
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to load');
        allPosts = await res.json();
        renderPosts(allPosts);
        showStatus('Posts loaded successfully');
    } catch (err) {
        console.error(err);
        allPosts = JSON.parse(localStorage.getItem('posts')) || [];
        renderPosts(allPosts);
        showStatus('Error loading posts. Showing cached data.', true);
    }
}

function applyFilters() {
    const title = document.getElementById('searchInput').value.trim().toLowerCase();
    const author = document.getElementById('filterAuthor').value.trim().toLowerCase();
    const category = document.getElementById('filterCategory').value.trim().toLowerCase();
    const status = document.getElementById('filterStatus').value;
    const featured = document.getElementById('filterFeatured').value;

    const now = new Date();

    const filtered = allPosts.filter(post => {
        const publishDate = new Date(post.schedule);
        const isValid = !isNaN(publishDate.getTime());
        const isLive = isValid && publishDate <= now;

        const statusMatch = (
            status === '' ||
            (status === 'live' && isLive) ||
            (status === 'scheduled' && isValid && publishDate > now) ||
            (status === 'noschedule' && !isValid)
        );

        const featuredMatch = (
            featured === '' ||
            (featured === 'yes' && post.featured) ||
            (featured === 'no' && !post.featured)
        );

        return (
            post.title.toLowerCase().includes(title) &&
            (post.author || '').toLowerCase().includes(author) &&
            (post.category || '').toLowerCase().includes(category) &&
            statusMatch &&
            featuredMatch
        );
    });

    currentPage = 1;
    renderPosts(filtered);
}

document.getElementById('searchBtn').onclick = applyFilters;
document.getElementById('clearBtn').onclick = () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterAuthor').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterFeatured').value = '';
    renderPosts(allPosts);
};

document.getElementById('logoutBtn').onclick = () => {
    sessionStorage.removeItem('loggedIn');
    window.location.href = '../../login.html';
};

window.onload = loadPosts;