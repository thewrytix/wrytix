const API_BASE = "https://wrytix.onrender.com";
const CLOUDINARY_CLOUD_NAME = 'dbtgim7l0';
const CLOUDINARY_UPLOAD_PRESET = 'wrytix_unsigned';

//////////////////// Toast helpers //////////////////////////
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

function showStatus(message) {
    showToast(message, 'status', 3000);
}

function showError(message) {
    showToast(message, 'error', 5000);
}

function showInfo(message) {
    showToast(message, 'info', 3000);
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
  .alert.status { background: #17a2b8; }  /* blue */
  .alert.info   { background: #17a2b8; }  /* same as status, you can change */
  .alert.error  { background: #dc3545; }

  @keyframes slideIn {
    from { opacity: 0; top: 0px; transform: translateX(-50%) translateY(-10px); }
    to { opacity: 1; top: 20px; transform: translateX(-50%) translateY(0); }
  }
`;
document.head.appendChild(toastStyle);


//////////////////// Confirm Modal helper //////////////////////////
function showConfirm(message, { title = 'Are you sure?', confirmText = 'Confirm', cancelText = 'Cancel', danger = true } = {}) {
    return new Promise((resolve) => {
        // Remove any existing confirm modal first
        const existing = document.querySelector('.confirm-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';

        overlay.innerHTML = `
            <div class="confirm-box">
                <h3 class="confirm-title">${title}</h3>
                <p class="confirm-message">${message}</p>
                <div class="confirm-actions">
                    <button class="confirm-btn confirm-cancel">${cancelText}</button>
                    <button class="confirm-btn confirm-ok ${danger ? 'danger' : ''}">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const cleanup = (result) => {
            overlay.remove();
            resolve(result);
        };

        overlay.querySelector('.confirm-cancel').addEventListener('click', () => cleanup(false));
        overlay.querySelector('.confirm-ok').addEventListener('click', () => cleanup(true));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cleanup(false); // click outside closes as cancel
        });
    });
}

// Confirm modal styling
const confirmStyle = document.createElement('style');
confirmStyle.textContent = `
  .confirm-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeInOverlay 0.2s ease-out;
  }

  .confirm-box {
    background: #ffffff;
    border-radius: 10px;
    padding: 1.75rem;
    max-width: 380px;
    width: 90%;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    animation: popIn 0.2s ease-out;
  }

  .confirm-title {
    margin: 0 0 0.5rem 0;
    font-size: 1.15rem;
    color: #1A237E;
  }

  .confirm-message {
    margin: 0 0 1.5rem 0;
    color: #333;
    line-height: 1.5;
  }

  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .confirm-btn {
    padding: 8px 18px;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: filter 0.2s ease;
  }

  .confirm-btn:hover {
    filter: brightness(0.92);
  }

  .confirm-cancel {
    background: #e0e0e0;
    color: #333;
  }

  .confirm-ok {
    background: #1A237E;
    color: white;
  }

  .confirm-ok.danger {
    background: #D32F2F;
  }

  @keyframes fadeInOverlay {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes popIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`;
document.head.appendChild(confirmStyle);