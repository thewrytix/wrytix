(function () {
    const loginRedirect = window.location.origin + '/backend-panel/login.html';

    const userData = localStorage.getItem("user");
    const loggedIn = localStorage.getItem("loggedIn");

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
            '/backend-panel/admin-panel/user-management/manage-roles.html',
            '/backend-panel/admin-panel/user-management/manage-roles',
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
            '/backend-panel/admin-panel/post-management/manage-category.html',
            '/backend-panel/admin-panel/post-management/manage-category',
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
            '/backend-panel/editor/editor-dashboard',
            '/backend-panel/editor/editor-add-post.html',
            '/backend-panel/editor/editor-add-post',
            '/backend-panel/editor/editor-preview.html',
            '/backend-panel/editor/editor-preview',
            '/backend-panel/editor/editor-posts.html',
            '/backend-panel/editor/editor-posts',
            '/backend-panel/editor/editor-edit-post.html',
            '/backend-panel/editor/editor-edit-post',
            '/backend-panel/editor/editor-posts-approval.html',
            '/backend-panel/editor/editor-posts-approval',
            '/backend-panel/editor/editor-edit-submission.html',
            '/backend-panel/editor/editor-edit-submission',
            '/backend-panel/editor/editor-add-user.html',
            '/backend-panel/editor/editor-add-user'
        ],
        author: [
            '/backend-panel/author/author-add-post.html',
            '/backend-panel/author/author-add-post',
            '/backend-panel/author/author-dashboard.html',
            '/backend-panel/author/author-dashboard',
            '/backend-panel/author/author-posts.html',
            '/backend-panel/author/author-posts',
            '/backend-panel/author/edit-rejected-submission.html',
            '/backend-panel/author/edit-rejected-submission'
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

//////////////// Confirmation Helpers //////////////////

// Core confirmation box
function showConfirmation(message, onConfirm, onCancel) {
    // Remove existing one if already open
    document.querySelector('.confirm-box')?.remove();

    const box = document.createElement('div');
    box.className = 'confirm-box';
    box.innerHTML = `
      <div class="confirm-content">
        <p>${message}</p>
        <div class="confirm-actions">
          <button class="btn-confirm">Yes</button>
          <button class="btn-cancel">No</button>
        </div>
      </div>
    `;
    document.body.appendChild(box);

    // Events
    box.querySelector('.btn-confirm').addEventListener('click', () => {
        onConfirm?.();
        box.remove();
    });
    box.querySelector('.btn-cancel').addEventListener('click', () => {
        onCancel?.();
        box.remove();
    });
}

// Quick wrapper (like showError/showSuccess)
function confirmAndRun(message, action, cancelMessage = "❌ Action canceled.") {
    showConfirmation(
        message,
        async () => {
            try {
                await action();
            } catch (err) {
                console.error(err);
                showError(`❌ ${err.message || "Action failed."}`);
            }
        },
        () => cancelMessage && showError(cancelMessage)
    );
}

// Confirmation styling
const confirmStyle = document.createElement('style');
confirmStyle.textContent = `
  .confirm-box {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.5);
    z-index: 10000;
    animation: fadeIn 0.3s ease;
  }
  .confirm-content {
    background: #fff;
    padding: 20px 30px;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    animation: popIn 0.3s ease;
  }
  .confirm-content p {
    margin-bottom: 15px;
    font-size: 16px;
    color: #333;
  }
  .confirm-actions {
    display: flex;
    justify-content: center;
    gap: 15px;
  }
  .confirm-actions button {
    padding: 8px 18px;
    border: none;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
  }
  .btn-confirm { background: #28a745; color: white; }
  .btn-cancel { background: #dc3545; color: white; }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
`;
document.head.appendChild(confirmStyle);


//////////////////// Toast helpers//////////////////////////
function showToast(message, type = 'success', duration = 3000) {
    // Remove existing toast first
    const existingToast = document.querySelector('.alert');
    if (existingToast) existingToast.remove();

    // Create the new toast
    const alertBox = document.createElement('div');
    alertBox.className = `alert ${type}`;
    alertBox.textContent = message;
    document.body.appendChild(alertBox);

    let hideTimeout, removeTimeout;

    function startTimers() {
        hideTimeout = setTimeout(() => {
            alertBox.style.opacity = '0';
            alertBox.style.transform = 'translateX(-50%) translateY(-20px)';
        }, duration - 500);

        removeTimeout = setTimeout(() => alertBox.remove(), duration);
    }

    function clearTimers() {
        clearTimeout(hideTimeout);
        clearTimeout(removeTimeout);
    }

    // Start auto-hide
    startTimers();

    // Pause on hover
    alertBox.addEventListener('mouseenter', clearTimers);

    // Resume when mouse leaves
    alertBox.addEventListener('mouseleave', startTimers);
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
    cursor: pointer;
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
    startSessionTimers(30, 60); // 10 min idle, 20 min absolute
});

async function logout() {
    try {
        await fetch('https://wrytix.onrender.com/logout', { credentials: 'include' });
    } catch (err) {
        // Silent error handling in production
    } finally {
        localStorage.clear();
        window.location.href = loginRedirect;
    }
}

function startSessionTimers(idleLimit = 15, absoluteLimit = 30) {
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
            localStorage.clear();
            window.location.href = loginRedirect;
        });

        document.addEventListener('click', (e) => {
            if (!btn.contains(e.target) && !menu.contains(e.target)) {
                menu.style.display = 'none';
            }
        });
    }
});