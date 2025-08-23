(function () {
    const loginRedirect = window.location.origin + '/backend-panel/login.html';

    const userData = sessionStorage.getItem("user");
    const loggedIn = sessionStorage.getItem("loggedIn");

    if (loggedIn !== "true" || !userData) {
        showError("Please log in first.");
        setTimeout(() => {
            window.location.href = loginRedirect;
        }, 2000);
        return;
    }

    const user = JSON.parse(userData);
    const role = user.role;
    const currentPath = window.location.pathname.toLowerCase();

    const roleAccess = {
        admin: [
            '/backend-panel/admin-panel/admin-dashboard.html',
            '/backend-panel/admin-panel/admin-dashboard',
            '/backend-panel/admin-panel/user-management/user-dashboard.html',
            '/backend-panel/admin-panel/user-management/user-dashboard',
            '/backend-panel/admin-panel/user-management/users-list.html',
            '/backend-panel/admin-panel/user-management/users-list',
            '/backend-panel/admin-panel/user-management/add-user.html',
            '/backend-panel/admin-panel/user-management/add-user',
            '/backend-panel/admin-panel/user-management/delete-user.html',
            '/backend-panel/admin-panel/user-management/delete-user',
            '/backend-panel/admin-panel/user-management/view-user.html',
            '/backend-panel/admin-panel/user-management/view-user',
            '/backend-panel/admin-panel/user-management/edit-user.html',
            '/backend-panel/admin-panel/user-management/edit-user',
            '/backend-panel/admin-panel/user-management/user-approval-requests.html',
            '/backend-panel/admin-panel/user-management/user-approval-requests',
            '/backend-panel/admin-panel/user-management/approval-view-user.html',
            '/backend-panel/admin-panel/user-management/approval-view-user',
            '/backend-panel/admin-panel/user-management/logs.html',
            '/backend-panel/admin-panel/user-management/logs',
            '/backend-panel/admin-panel/post-management/post-dashboard.html',
            '/backend-panel/admin-panel/post-management/post-dashboard',
            '/backend-panel/admin-panel/post-management/posts-list.html',
            '/backend-panel/admin-panel/post-management/posts-list',
            '/backend-panel/admin-panel/post-management/add-post.html',
            '/backend-panel/admin-panel/post-management/add-post',
            '/backend-panel/admin-panel/post-management/edit-post.html',
            '/backend-panel/admin-panel/post-management/edit-post',
            '/backend-panel/admin-panel/post-management/delete-post.html',
            '/backend-panel/admin-panel/post-management/delete-post',
            '/backend-panel/admin-panel/post-management/post-approval-requests.html',
            '/backend-panel/admin-panel/post-management/post-approval-requests',
            '/backend-panel/admin-panel/post-management/edit-submission.html',
            '/backend-panel/admin-panel/post-management/edit-submission',
            '/backend-panel/admin-panel/ad-management/ads-dashboard.html',
            '/backend-panel/admin-panel/ad-management/ads-dashboard',
            '/backend-panel/admin-panel/ad-management/add-ad.html',
            '/backend-panel/admin-panel/ad-management/add-ad',
            '/backend-panel/admin-panel/ad-management/ads-list.html',
            '/backend-panel/admin-panel/ad-management/ads-list',
            '/backend-panel/admin-panel/ad-management/edit-ad.html',
            '/backend-panel/admin-panel/ad-management/edit-ad',
            '/backend-panel/admin-panel/ad-management/delete-ad.html',
            '/backend-panel/admin-panel/ad-management/delete-ad'
        ],
        editor: [
            '/backend-panel/editor/editor-dashboard.html',
            '/backend-panel/editor/editor-add-post.html',
            '/backend-panel/editor/editor-preview.html',
            '/backend-panel/editor/editor-posts.html',
            '/backend-panel/editor/editor-edit-post.html',
            '/backend-panel/editor/editor-posts-approval.html',
            '/backend-panel/editor/editor-edit-submission.html',
            '/backend-panel/editor/editor-add-user.html',
        ],
        author: [
            '/backend-panel/author/author-add-post.html',
            '/backend-panel/author/author-dashboard.html',
            '/backend-panel/author/author-posts.html',
            '/backend-panel/author/edit-rejected-submission.html',
        ]
    };

    function hasAccess(role, currentPath) {
        const allowedPaths = roleAccess[role] || [];
        return allowedPaths.some(allowed => currentPath.endsWith(allowed));
    }

    // 🔒 SECURE: No console logging of sensitive information
    if (!hasAccess(role, currentPath)) {
        showError("Access denied: You're not allowed to view this page.");
        setTimeout(() => {
            window.location.href = loginRedirect;
        }, 2000);
        return;
    }

    // Optional: Show user profile name in the UI
    const profileBtn = document.getElementById("profileBtn");
    if (profileBtn && user.username) {
        profileBtn.textContent = `👤 ${user.username}`;
    }
})();

// Toast helpers
function showToast(message, type = 'success', duration = 3000) {
    // Remove existing toast first
    const existingToast = document.querySelector('.alert');
    if (existingToast) existingToast.remove();

    // Create the new toast
    const alertBox = document.createElement('div');
    alertBox.className = `alert ${type}`;
    alertBox.textContent = message;
    document.body.appendChild(alertBox);

    // Trigger fade-out before removal
    setTimeout(() => {
        alertBox.style.opacity = '0';
        alertBox.style.transform = 'translateX(-50%) translateY(-20px)';
    }, duration - 500); // fade before removing

    setTimeout(() => alertBox.remove(), duration);
}

// Easy access versions
function showSuccess(message) {
    showToast(message, 'success', 3000);
}

function showError(message) {
    showToast(message, 'error', 5000);
}

// Toast styling
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  .alert {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 8px;
    color: white;
    font-weight: bold;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.4s ease-out;
    transition: opacity 0.5s ease, transform 0.5s ease;
    opacity: 1;
  }

  .alert.success { background: #28a745; }
  .alert.error { background: #dc3545; }

  @keyframes slideIn {
    from { opacity: 0; top: 0px; transform: translateX(-50%) translateY(-10px); }
    to { opacity: 1; top: 20px; transform: translateX(-50%) translateY(0); }
  }
`;
document.head.appendChild(toastStyle);

const loginRedirect = window.location.origin + '/backend-panel/login.html';

window.addEventListener('load', async () => {
    const user = await verifyAndSetSession(); // will auto-redirect if not valid
    startSessionTimers(10, 20); // 10 min idle, 20 min absolute
});

async function logout() {
    try {
        await fetch('https://wrytix.onrender.com/logout', { credentials: 'include' });
    } catch (err) {
        // Silent error handling in production
    } finally {
        sessionStorage.clear();
        window.location.href = loginRedirect;
    }
}

function startSessionTimers(idleLimit = 10, absoluteLimit = 20) {
    let idleTimer = null;
    let absoluteTimer = null;

    function resetIdleTimer() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            logout();
        }, idleLimit * 60 * 1000);
    }

    ['mousemove', 'keydown', 'scroll', 'click'].forEach(evt => {
        document.addEventListener(evt, resetIdleTimer);
    });

    resetIdleTimer(); // Initial call

    absoluteTimer = setTimeout(() => {
        logout();
    }, absoluteLimit * 60 * 1000);
}

document.addEventListener("DOMContentLoaded", () => {
    const dropdownToggles = document.querySelectorAll(".dropdown-toggle");
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener("click", () => {
            const parent = toggle.closest(".dropdown");
            parent.classList.toggle("open");
        });
    });
});

// Toggle profile dropdown independently
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('profileBtn');
    const menu = document.getElementById('profileMenu');

    if (btn && menu) {
        btn.addEventListener('click', () => {
            menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = loginRedirect;
        });

        document.addEventListener('click', (e) => {
            if (!btn.contains(e.target) && !menu.contains(e.target)) {
                menu.style.display = 'none';
            }
        });
    }
});