document.addEventListener("DOMContentLoaded", () => {
    const loginModal = document.getElementById("loginModal");
    const signupModal = document.getElementById("signupModal");
    const loginBtn = document.getElementById("loginBtn");
    const closes = document.querySelectorAll(".close");
    const API_BASE = '"https://wrytix.onrender.com/user"i'; // Your base

    let currentUser = null;

    // Update btn
    function updateLoginBtn() {
        if (currentUser) {
            loginBtn.innerHTML = `<span>Welcome, ${currentUser.username}!</span><i class="fa-solid fa-user"></i><button onclick="logout()" style="margin-left: 10px; background: none; border: none; color: red; cursor: pointer;">Logout</button>`;
        } else {
            loginBtn.innerHTML = `<span>Login / Sign Up</span><i class="fa-solid fa-user"></i>`;
        }
    }

    // Check auth on load
    async function checkAuthOnLoad() {
        try {
            const res = await fetch(`${API_BASE}/auth/auth/check`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok && data.username) {
                currentUser = data;
                updateLoginBtn();
            }
        } catch (err) {
            console.error('Auth check failed:', err);
        }
    }

    // Helpers (loading/error as before)
    function showLoading(modal, show = true) {
        let loadingEl = modal.querySelector('.loading');
        if (!loadingEl) {
            loadingEl = document.createElement('div');
            loadingEl.className = 'loading';
            loadingEl.textContent = 'Processing...';
            loadingEl.style.cssText = 'text-align: center; color: #007bff; margin-top: 10px;';
            modal.querySelector('form').appendChild(loadingEl);
        }
        loadingEl.style.display = show ? 'block' : 'none';
    }

    function showError(modal, message) {
        let errorEl = modal.querySelector('.error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'error';
            errorEl.style.cssText = 'color: red; margin-top: 10px; text-align: center;';
            modal.querySelector('form').appendChild(errorEl);
        }
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    // Login handler
    async function handleLogin(e) {
        e.preventDefault();
        const usernameOrEmail = document.getElementById('email').value; // Treat as usernameOrEmail
        const password = document.getElementById('password').value;

        showLoading(loginModal, true);
        let errorEl = loginModal.querySelector('.error');
        if (errorEl) errorEl.style.display = 'none';

        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usernameOrEmail, password }),
                credentials: 'include'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');
            // Fetch fresh user from session
            await checkAuthOnLoad();
            loginModal.style.display = 'none';
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
        } catch (err) {
            showError(loginModal, err.message);
        } finally {
            showLoading(loginModal, false);
        }
    }

    // Signup handler
    async function handleSignup(e) {
        e.preventDefault();
        const fullname = document.getElementById('signup-fullname').value;
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;

        if (password !== confirm) {
            showError(signupModal, 'Passwords do not match');
            return;
        }

        showLoading(signupModal, true);
        let errorEl = signupModal.querySelector('.error');
        if (errorEl) errorEl.style.display = 'none';

        try {
            const res = await fetch(`${API_BASE}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullname, username, email, password }),
                credentials: 'include'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Signup failed');
            // Success: Close, switch to login, or auto-login? Here, prompt login
            signupModal.style.display = 'none';
            loginModal.style.display = 'flex';
            document.getElementById('signupForm').reset();
            showError(loginModal, 'Account created! Please log in.'); // Temp as success msg
        } catch (err) {
            showError(signupModal, err.message);
        } finally {
            showLoading(signupModal, false);
        }
    }

    // Your modal toggles (unchanged)
    loginBtn.addEventListener("click", () => {
        if (!currentUser) loginModal.style.display = "flex";
    });

    document.getElementById("switch-to-signup").addEventListener("click", (e) => {
        e.preventDefault();
        loginModal.style.display = "none";
        signupModal.style.display = "flex";
    });

    document.getElementById("switch-to-login").addEventListener("click", (e) => {
        e.preventDefault();
        signupModal.style.display = "none";
        loginModal.style.display = "flex";
    });

    closes.forEach((close) => {
        close.addEventListener("click", () => {
            loginModal.style.display = "none";
            signupModal.style.display = "none";
        });
    });

    window.addEventListener("click", (e) => {
        if (e.target === loginModal) loginModal.style.display = "none";
        if (e.target === signupModal) signupModal.style.display = "none";
    });

    // Form listeners
    loginModal.querySelector('form').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);

    // Init
    checkAuthOnLoad();
});

// Global logout
function logout() {
    fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' })
        .then(() => {
            currentUser = null;
            updateLoginBtn();
        })
        .catch(console.error);
}