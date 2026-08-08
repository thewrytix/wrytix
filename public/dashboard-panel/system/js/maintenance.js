let allTasks = [];

document.addEventListener('DOMContentLoaded', () => {
    const userData = localStorage.getItem('user');
    if (!userData) { window.location.href = '/login.html'; return; }

    const user = JSON.parse(userData);
    if (user.role !== 'admin') {
        showToast('Access denied. Admins only.', 'error');
        window.location.href = '/login.html';
        return;
    }

    renderSidebar(window.RoleConfig.admin.sidebar);
    setupSidebarCollapse()
    document.getElementById('profileBtn').textContent = user.username;

    loadMaintenanceStatus();
    loadTasks();

    document.getElementById('maintenanceToggle').addEventListener('change', handleMaintenanceToggle);
    document.getElementById('addTaskBtn').addEventListener('click', handleAddTask);
});

function renderSidebar(links) {
    document.getElementById('sidebarLinks').innerHTML = links.map(link => `
        <li><a href="${link.href}"><i class="fa-solid ${link.icon}"></i> ${link.label}</a></li>
    `).join('');
}

/* ============ Maintenance Toggle ============ */

async function loadMaintenanceStatus() {
    try {
        const res = await fetch(`${API_BASE}/system/maintenance`, { credentials: 'include' });
        const data = await res.json();
        updateMaintenanceUI(data.maintenanceMode);

    } catch (err) {
        console.error('Failed to load maintenance status:', err);
        showError('Failed to update maintenance mode.');

    }
}

function updateMaintenanceUI(isOn) {
    document.getElementById('maintenanceToggle').checked = isOn;
    const statusText = document.getElementById('maintenanceStatusText');
    statusText.textContent = isOn ? 'Maintenance Mode: ON' : 'Maintenance Mode: OFF';
    statusText.className = `maintenance-status-text ${isOn ? 'on' : 'off'}`;

    document.getElementById('maintenancePanel')?.classList.toggle('is-active', isOn);
}

async function handleMaintenanceToggle(e) {

    const newValue = e.target.checked;

    const ok = await showConfirm(newValue
        ? 'This will suspend all editors and authors from the admin panel. Continue?'
        : 'This will restore access for all suspended editors and authors. Continue?',{ title: 'Maintenance Mode', confirmText: 'Okay' });
    e.target.checked = !newValue;

    if (!ok) return;

    try {
        const res = await fetch(`${API_BASE}/system/maintenance`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ maintenanceMode: newValue }),
            credentials: 'include'
        });



        if (!res.ok) throw new Error('Failed to update maintenance mode');
        updateMaintenanceUI(newValue);
        showSuccess(newValue ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
    } catch (err) {
        console.error('Toggle failed:', err);

        showError('Failed to update maintenance mode.');
        e.target.checked = !newValue;
    }
}

/* ============ Task Manager ============ */

async function loadTasks() {
    try {
        const res = await fetch(`${API_BASE}/system/tasks`, { credentials: 'include' });
        allTasks = await res.json();
        renderTasks();
    } catch (err) {

        showError('Failed to load tasks:');
        document.getElementById('taskList').innerHTML = '<p style="color:red;">Failed to load tasks.</p>';
    }
}

function renderTasks() {
    const container = document.getElementById('taskList');

    if (allTasks.length === 0) {
        container.innerHTML = '<p class="tq-empty">No tasks yet. Add one above to get started.</p>';
        return;
    }

    // Open tasks first, sorted by priority urgency; done tasks at the bottom
    const priorityWeight = { urgent: 0, medium: 1, low: 2 };
    const sorted = [...allTasks].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
        return priorityWeight[a.priority] - priorityWeight[b.priority];
    });

    container.innerHTML = sorted.map(task => `
        <div class="task-item priority-${task.priority} ${task.status === 'done' ? 'done' : ''}">
            <div class="task-info">
                <h4>${task.title} <span class="priority-badge ${task.priority}">${task.priority}</span></h4>
                <p>${task.description || ''}</p>
                <p>By ${task.createdBy} — ${new Date(task.createdAt).toLocaleDateString()}</p>
            </div>
            <div class="task-actions">
                ${task.status === 'open'
        ? `<button class="btn approve" onclick="toggleTaskStatus('${task._id}', 'done')"><i class="fa-solid fa-check"></i></button>`
        : `<button class="btn edit" onclick="toggleTaskStatus('${task._id}', 'open')"><i class="fa-solid fa-rotate-left"></i></button>`
    }
                <button class="btn reject" onclick="deleteTask('${task._id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

async function handleAddTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const priority = document.getElementById('taskPriority').value;

    if (!title) {
        showError('Task title is required.');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/system/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, priority }),
            credentials: 'include'
        });

        if (!res.ok) throw new Error('Failed to create task');

        // Clear form
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDescription').value = '';
        document.getElementById('taskPriority').value = 'medium';

        await loadTasks();
        showSuccess('Task created successfully!');   // ✅ added
    } catch (err) {
        showError('Add task failed:');
    }
}

async function toggleTaskStatus(id, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/system/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to update task');
        await loadTasks();
        // ✅ add success toast
        showSuccess(`Task marked as ${newStatus === 'done' ? 'done' : 'open'}!`);
    } catch (err) {
        showError('Update task failed:');
    }
}

async function deleteTask(id) {
    const ok = await showConfirm('Delete this task?', { title: 'Task', confirmText: 'Delete' });
    if (!ok) return;

    try {
        const res = await fetch(`${API_BASE}/system/tasks/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to delete task');
        await loadTasks();
        showSuccess('Task deleted successfully!');
    } catch (err) {
        console.error('Delete task failed:', err);
        showError('Failed to delete task.');
    }
}