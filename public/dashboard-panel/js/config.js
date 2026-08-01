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