(function () {
    const loginRedirect = window.location.origin + '/index.html/backend-panel/login.html';

    const userData = sessionStorage.getItem("user");
    const loggedIn = sessionStorage.getItem("loggedIn");

    // Debug logs (optional – remove in production)
    console.log("Session LoggedIn:", loggedIn);
    console.log("Session User:", userData);

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
            '/admin-dashboard.html',
            '/user-management/user-dashboard.html',
            '/user-management/users-list.html',
            '/user-management/add-user.html',
            '/user-management/delete-user.html',
            '/user-management/view-user.html',
            '/user-management/edit-user.html',
            '/user-management/user-approval-requests.html',
            '/user-management/approval-view-user.html',
            '/user-management/logs.html',
            '/post-management/post-dashboard.html',
            '/post-management/posts-list.html',
            '/post-management/add-post.html',
            '/post-management/edit-post.html',
            '/post-management/delete-post.html',
            '/post-management/post-approval-requests.html',
            '/post-management/edit-submission.html',
            '/ad-management/ads-dashboard.html',
            '/ad-management/add-ad.html',
            '/ad-management/ads-list.html',
            '/ad-management/edit-ad.html',
            '/ad-management/delete-ad.html'
        ],
        editor: [
            '/editor/editor-dashboard.html',
            '/editor/editor-add-post.html',
            '/editor/editor-preview.html',
            '/editor/editor-posts.html',
            '/editor/editor-edit-post.html',
            '/editor/editor-posts-approval.html',
            '/editor/editor-edit-submission.html',
            '/editor/editor-add-user.html',

        ],
        author: [
            '/author/author-add-post.html',
            '/author/author-dashboard.html',
            '/author/author-posts.html',
            '/author/edit-rejected-submission.html',
        ]
    };

    function hasAccess(role, currentPath) {
        const allowedPaths = roleAccess[role] || [];
        return allowedPaths.some(allowed => currentPath.endsWith(allowed));
    }

    if (!hasAccess(role, currentPath)) {
        console.warn("Access denied:", currentPath, "for role:", role);
        showError("Access denied: You’re not allowed to view this page.");
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

const loginRedirect = window.location.origin + '/index.html/backend-panel/login.html';

window.addEventListener('load', async () => {
    const user = await verifyAndSetSession(); // will auto-redirect if not valid
    startSessionTimers(10, 20); // 10 min idle, 20 min absolute
});

async function logout() {
    try {
        await fetch('https://wrytix.onrender.com/logout', { credentials: 'include' });
    } catch (err) {
        console.error("Logout error:", err);
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
            console.log("Idle limit reached. Logging out...");
            logout();
        }, idleLimit * 60 * 1000);
    }

    ['mousemove', 'keydown', 'scroll', 'click'].forEach(evt => {
        document.addEventListener(evt, resetIdleTimer);
    });

    resetIdleTimer(); // Initial call

    absoluteTimer = setTimeout(() => {
        console.log("Absolute time limit reached. Logging out...");
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
