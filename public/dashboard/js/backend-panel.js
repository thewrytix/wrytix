
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