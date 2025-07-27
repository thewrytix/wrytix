// user-management.js

let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const usersPerPage = 10;

const tbody = document.getElementById('userTableBody');
const pagination = document.getElementById('paginationControls');
const message = document.getElementById('message');

async function loadUsers() {
    try {
        const res = await fetch('http://localhost:3000/users');
        allUsers = await res.json();
        currentPage = 1;
        filterAndRenderUsers();
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="4">Error loading users</td></tr>';
    }
}

function filterAndRenderUsers() {
    const role = document.getElementById('filterRole').value;
    const search = document.getElementById('searchUser').value.toLowerCase();

    filteredUsers = allUsers.filter(user => {
        const roleMatch = role ? user.role === role : true;
        const nameMatch = user.name.toLowerCase().includes(search);
        const emailMatch = user.email.toLowerCase().includes(search);
        return roleMatch && (nameMatch || emailMatch);
    });

    renderUserTable();
    renderPagination();
}

function renderUserTable() {
    tbody.innerHTML = '';
    if (filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No users found.</td></tr>';
        return;
    }

    const start = (currentPage - 1) * usersPerPage;
    const end = start + usersPerPage;
    const pageUsers = filteredUsers.slice(start, end);

    pageUsers.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" data-id="${user.id}"></td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderPagination() {
    pagination.innerHTML = '';
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.classList.toggle('active', i === currentPage);
        btn.onclick = () => {
            currentPage = i;
            renderUserTable();
            renderPagination();
        };
        pagination.appendChild(btn);
    }
}

async function deleteSelectedUsers() {
    const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        message.textContent = 'Please select at least one user to delete.';
        return;
    }

    if (!confirm('Are you sure you want to delete selected users?')) return;

    try {
        for (const box of checkboxes) {
            const id = box.dataset.id;
            await fetch(`http://localhost:3000/users/${id}`, { method: 'DELETE' });
        }
        message.textContent = '✅ Selected users deleted.';
        await loadUsers();
    } catch (err) {
        console.error(err);
        message.textContent = '❌ Error deleting users.';
    }
}

document.getElementById('filterRole').addEventListener('change', () => { currentPage = 1; filterAndRenderUsers(); });
document.getElementById('searchUser').addEventListener('input', () => { currentPage = 1; filterAndRenderUsers(); });
document.getElementById('selectAll').addEventListener('change', e => {
    document.querySelectorAll('tbody input[type="checkbox"]').forEach(cb => cb.checked = e.target.checked);
});

loadUsers();
