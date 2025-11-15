document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const loginModal = document.getElementById("loginModal");
    const signupModal = document.getElementById("signupModal");
    const loginBtn = document.getElementById("loginBtn");
    const viewerContainer = document.getElementById("viewerContainer");
    const profileDropdown = document.getElementById("profileDropdown");
    const profileBtn = document.getElementById("profileBtn");
    const profileMenu = document.getElementById("profileMenu");
    const closes = document.querySelectorAll(".close");
    const API_BASE = 'https://wrytix.onrender.com';

    let currentUser = null;

    // Seamless UI update: Swap login btn <-> profile dropdown
    function updateViewerUI() {
        if (currentUser) {
            loginBtn.style.display = 'none';
            profileDropdown.style.display = 'block';
            const profileText = document.getElementById('profileText');
            const profileIcon = document.getElementById('profileIcon');
            // SECURITY FIX: Safe display of username
            profileText.textContent = SecurityUtils.safeFormat('Hi, {0}!', currentUser.username);
            profileIcon.className = 'fa-solid fa-user-circle';
        } else {
            loginBtn.style.display = 'block';
            profileDropdown.style.display = 'none';
        }
    }

    // Check session on load
    async function checkAuthOnLoad() {
        try {
            const res = await fetch(`${API_BASE}/check`, {
                method: 'GET',
                credentials: 'include'
            });
            const rawText = await res.text();
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = JSON.parse(rawText);
            if (data.username) {
                currentUser = data;
            }
        } catch (err) {
            console.error('Auth check failed:', err);
        } finally {
            updateViewerUI();
        }
    }

    // Global logout
    function logout() {
        fetch(`${API_BASE}/logout`, {
            method: 'POST',
            credentials: 'include'
        })
            .then((response) => {
                currentUser = null;
                updateViewerUI();
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('user');
            })
            .catch((error) => {
                console.error('Logout error:', error);
                currentUser = null;
                updateViewerUI();
            });
    }

    // Loading/Error helpers
    function showLoading(modal, show = true) {
        let loadingEl = modal.querySelector('.loading');
        if (!loadingEl) {
            loadingEl = document.createElement('div');
            loadingEl.className = 'loading';
            loadingEl.textContent = 'Processing...';
            loadingEl.style.cssText = 'text-align: center; color: #007bff; margin-top: 10px; display: none;';
            modal.querySelector('form').appendChild(loadingEl);
        }
        loadingEl.style.display = show ? 'block' : 'none';
    }

    function showError(modal, message, isSuccess = false) {
        let errorEl = modal.querySelector('.error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'error';
            errorEl.style.cssText = `color: ${isSuccess ? 'green' : 'red'}; margin-top: 10px; text-align: center; display: none;`;
            modal.querySelector('form').appendChild(errorEl);
        }
        // SECURITY FIX: Escape error messages
        errorEl.innerHTML = SecurityUtils.escapeHtml(message);
        errorEl.style.display = 'block';
        if (isSuccess) setTimeout(() => { errorEl.style.display = 'none'; }, 3000);
    }

    // Login handler
    async function handleLogin(e) {
        e.preventDefault();
        // SECURITY FIX: Sanitize inputs
        const usernameOrEmail = SecurityUtils.sanitizeInput(document.getElementById('email').value, { maxLength: 100 });
        const password = document.getElementById('password').value;

        if (!usernameOrEmail || !password) {
            showError(loginModal, 'Please fill all fields');
            return;
        }

        showLoading(loginModal, true);
        const errorEl = loginModal.querySelector('.error');
        if (errorEl) errorEl.style.display = 'none';

        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // SECURITY FIX: Escape data before sending
                body: JSON.stringify({
                    usernameOrEmail: SecurityUtils.escapeHtml(usernameOrEmail),
                    password: password
                }),
                credentials: 'include'
            });
            const rawText = await res.text();
            if (!res.ok) {
                let data;
                try { data = JSON.parse(rawText); } catch {}
                throw new Error(data?.error || `Login failed (Status ${res.status})`);
            }
            const data = JSON.parse(rawText);
            await checkAuthOnLoad();
            loginModal.style.display = 'none';
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
        } catch (err) {
            showError(loginModal, err.message);
            console.error('Login error:', err);
        } finally {
            showLoading(loginModal, false);
        }
    }

    // Signup handler - MINIMAL SECURITY ADDITIONS
    async function handleSignup(e) {
        e.preventDefault();
        // SECURITY FIX: Sanitize all inputs
        const fullname = SecurityUtils.sanitizeInput(document.getElementById('signup-fullname').value.trim(), { maxLength: 50 });
        const username = SecurityUtils.sanitizeInput(document.getElementById('signup-username').value.trim(), { maxLength: 20 });
        const email = SecurityUtils.sanitizeInput(document.getElementById('signup-email').value.trim(), { maxLength: 100 });
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;

        if (!fullname || !username || !email || !password || !confirm) {
            showError(signupModal, 'Please fill all fields');
            return;
        }
        if (password !== confirm) {
            showError(signupModal, 'Passwords do not match');
            return;
        }
        if (password.length < 6) {
            showError(signupModal, 'Password must be at least 6 characters');
            return;
        }

        showLoading(signupModal, true);
        const errorEl = signupModal.querySelector('.error');
        if (errorEl) errorEl.style.display = 'none';

        try {
            const res = await fetch(`${API_BASE}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // SECURITY FIX: Escape all user data
                body: JSON.stringify({
                    fullname: SecurityUtils.escapeHtml(fullname),
                    username: SecurityUtils.escapeHtml(username),
                    email: SecurityUtils.escapeHtml(email),
                    password: password
                }),
                credentials: 'include'
            });
            const rawText = await res.text();
            console.log('Signup raw (first 200):', rawText.substring(0, 200), 'Status:', res.status);
            if (!res.ok) {
                let data;
                try { data = JSON.parse(rawText); } catch {}
                throw new Error(data?.error || `Signup failed (Status ${res.status})`);
            }
            const data = JSON.parse(rawText);
            signupModal.style.display = 'none';
            loginModal.style.display = 'flex';
            document.getElementById('signupForm').reset();
            showError(loginModal, 'Account created successfully! Please log in.', true);
        } catch (err) {
            showError(signupModal, err.message);
            console.error('Signup error:', err);
        } finally {
            showLoading(signupModal, false);
        }
    }

    // Rest of your code remains exactly the same...
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

    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileMenu.style.display = profileMenu.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
        if (!profileBtn.contains(e.target)) profileMenu.style.display = 'none';
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        logout();
        profileMenu.style.display = 'none';
    });

    document.getElementById('viewProfile').addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Opening profile...');
        profileMenu.style.display = 'none';
    });

    document.getElementById('viewSettings').addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Opening settings...');
        profileMenu.style.display = 'none';
    });

    document.getElementById('forgot-password').addEventListener('click', (e) => {
        e.preventDefault();
        alert('Forgot password? Coming soon!');
    });

    loginModal.querySelector('form').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);

    checkAuthOnLoad();
});