let submissions = [];
let selectedRejectId = null;

async function loadSubmissions() {
    try {
        const res = await fetch('https://wrytix.onrender.com/postSubmissions', {
            credentials: 'include'
        });
        if (!res.ok) throw new Error(await res.text());
        submissions = await res.json();
        renderTable(submissions);
        populateAuthorFilter(submissions);
    } catch (err) {
        console.error('Error loading submissions:', err.message);
        showError('❌ Failed to load submissions. Please login again.');
    }
}

function renderTable(data) {
    const tbody = document.getElementById('submissionTableBody');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No, pending posts.</td></tr>';
        return;
    }

    tbody.innerHTML = data
        .filter(p => p.status === 'pending')
        .map(post => `
        <tr>
          <td>${post.title}</td>
          <td>${post.submittedBy || 'N/A'}</td>
          <td>${post.category}</td>
          <td>${new Date(post.schedule).toLocaleString()}</td>
          <td>${new Date(post.createdAt || post.date || post.time || Date.now()).toLocaleString()}</td>
          <td>
            <button class="btn approve" onclick="approvePost('${post.id}')">Approve</button>
            <button class="btn edit" onclick="editPost('${post.id}')">Edit</button>
            <button class="btn reject" onclick="openRejectModal('${post.id}')">Reject</button>
          </td>
        </tr>
      `).join('');
}

function populateAuthorFilter(data) {
    const authorSelect = document.getElementById('authorFilter');
    const authors = [...new Set(data.map(p => p.submittedBy).filter(Boolean))];
    authorSelect.innerHTML = '<option value="">Filter by Author</option>';
    authors.forEach(author => {
        const option = document.createElement('option');
        option.value = author;
        option.textContent = author;
        authorSelect.appendChild(option);
    });
}

function applyFilters() {
    const category = document.getElementById('categoryFilter').value;
    const author = document.getElementById('authorFilter').value;

    const filtered = submissions.filter(p =>
        p.status === 'pending' &&
        (category === '' || p.category === category) &&
        (author === '' || p.submittedBy === author)
    );

    renderTable(filtered);
}

function resetFilters() {
    document.getElementById('categoryFilter').value = '';
    document.getElementById('authorFilter').value = '';
    renderTable(submissions.filter(p => p.status === 'pending'));
}

document.getElementById('categoryFilter').addEventListener('change', applyFilters);
document.getElementById('authorFilter').addEventListener('change', applyFilters);

function editPost(id) {
    window.location.href = `editor-edit-submission.html?id=${id}`;
}

async function approvePost(id) {
    try {
        const res = await fetch(`https://wrytix.onrender.com/postSubmissions/${id}`, {
            credentials: 'include'
        });
        const post = await res.json();

        const approved = {
            ...post,
            status: 'approved',
            editorComments: '',
            views: 0,
            lastViewed: new Date().toISOString()
        };

        await fetch('https://wrytix.onrender.com/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(approved)
        });

        await fetch(`https://wrytix.onrender.com/postSubmissions/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        showSuccess('✅ Post approved and published!');
        loadSubmissions();

    } catch (err) {
        console.error('Error approving post:', err.message);
        showError('❌ Failed to approve post.');
    }
}

function openRejectModal(id) {
    selectedRejectId = id;
    document.getElementById('rejectionReason').value = '';
    document.getElementById('rejectModal').style.display = 'flex';
}

function closeModal() {
    selectedRejectId = null;
    document.getElementById('rejectModal').style.display = 'none';
}

async function confirmRejection() {
    const reason = document.getElementById('rejectionReason').value.trim();
    if (!reason) return showError("Rejection reason is required.");

    try {
        const res = await fetch(`https://wrytix.onrender.com/postSubmissions/${selectedRejectId}`, {
            credentials: 'include'
        });
        const post = await res.json();

        const updated = { ...post, status: 'rejected', editorComments: reason };

        await fetch(`https://wrytix.onrender.com/postSubmissions/${selectedRejectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(updated)
        });

        closeModal();
        showSuccess('✅ Post rejected successfully.');
        loadSubmissions();
    } catch (err) {
        console.error('Error rejecting post:', err.message);
        showError('❌ Failed to reject post.');
    }
}



window.onload = loadSubmissions;