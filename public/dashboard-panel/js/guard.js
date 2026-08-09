const loginRedirect = '../auth/login.html';

async function verifyAndSetSession(requiredRole = 'admin') {
    // Check local session first
    const userData = localStorage.getItem("user");
    const loggedIn = localStorage.getItem("loggedIn");

    if (loggedIn !== "true" || !userData) {
        window.location.href = loginRedirect;
        return null;
    }

    const user = JSON.parse(userData);

    // Optional: Verify with server periodically
    try {
        const res = await fetch(`${API_BASE}/verify-session`, {
            credentials: 'include'
        });
        // If server session expired, still use local session
        if (!res.ok) {
           
        }
    } catch (err) {

        showError('Server verification failed, using local session');
    }

    // Set UI elements
    localStorage.setItem('loggedIn', 'true');
    localStorage.setItem('currentUser', user.username);
    localStorage.setItem('role', user.role);
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.textContent = `👤  ${user.username}`;
    }

    return user;
}



window.addEventListener('load', async () => {
    const user = await verifyAndSetSession(); // will auto-redirect if not valid
    startSessionTimers(30, 60); // 10 min idle, 20 min absolute
});


async function logout() {
    try {
        await fetch(`${API_BASE}/logout`,
        { credentials: 'include' });
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