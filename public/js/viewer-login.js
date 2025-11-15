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
    const API_BASE = 'https://wrytix.onrender.com'; // Root, flat mount

    let currentUser = null;

    // Seamless UI update: Swap login btn <-> profile dropdown
    function updateViewerUI() {
        if (currentUser) {
            loginBtn.style.display = 'none';
            profileDropdown.style.display = 'block';
            const profileText = document.getElementById('profileText');
            const profileIcon = document.getElementById('profileIcon');
            // SECURE: Escape username for display
            profileText.textContent = SecurityUtils.safeFormat('Hi, {0}!', currentUser.username);
            profileIcon.className = 'fa-solid fa-user-circle';
        } else {
            loginBtn.style.display = 'block';
            profileDropdown.style.display = 'none';
        }
    }

    // Check session on load (populates currentUser)
    async function checkAuthOnLoad() {
        try {
            const res = await fetch(`${API_BASE}/check`, { // Matches your /auth/check
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

                // Optional: Clear any stored data
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('user');
            })
            .catch((error) => {
                console.error('Logout error:', error);
                // Still update UI even if logout request fails
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

    // Secure error messages
    function showError(modal, message, isSuccess = false) {
        let errorEl = modal.querySelector('.error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'error';
            errorEl.style.cssText = `color: ${isSuccess ? 'green' : 'red'}; margin-top: 10px; text-align: center; display: none;`;
            modal.querySelector('form').appendChild(errorEl);
        }
        // SECURE: Escape error messages
        errorEl.innerHTML = SecurityUtils.escapeHtml(message);
        errorEl.style.display = 'block';
        if (isSuccess) setTimeout(() => { errorEl.style.display = 'none'; }, 3000);
    }

    // Login handler
    async function handleLogin(e) {
        e.preventDefault();
        const usernameOrEmail = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!usernameOrEmail || !password) {
            showError(loginModal, 'Please fill all fields');
            return;
        }

        showLoading(loginModal, true);
        const errorEl = loginModal.querySelector('.error');
        if (errorEl) errorEl.style.display = 'none';

        try {
            const res = await fetch(`${API_BASE}/login`, { // Flat /login
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usernameOrEmail, password }),
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

    // Signup handler - SECURE VERSION
    async function handleSignup(e) {
        e.preventDefault();

        // Get raw inputs (for sending to API)
        const rawFullname = document.getElementById('signup-fullname').value.trim();
        const rawUsername = document.getElementById('signup-username').value.trim();
        const rawEmail = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;

        // Create sanitized versions for validation/display
        const sanitizedFullname = SecurityUtils.sanitizeInput(rawFullname, { maxLength: 50 });
        const sanitizedUsername = SecurityUtils.sanitizeInput(rawUsername, { maxLength: 20 });
        const sanitizedEmail = SecurityUtils.sanitizeInput(rawEmail, { maxLength: 100 });

        // Validate using SANITIZED data
        if (!sanitizedFullname || !sanitizedUsername || !sanitizedEmail || !password || !confirm) {
            showError(signupModal, 'Please fill all fields');
            return;
        }

        // Additional validation
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
                // Send RAW data to API (backend should validate)
                body: JSON.stringify({
                    fullname: rawFullname,
                    username: rawUsername,
                    email: rawEmail,
                    password
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

    // Modal toggles (unchanged)
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

    // Profile dropdown events (unchanged)
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

    // Forgot password stub
    document.getElementById('forgot-password').addEventListener('click', (e) => {
        e.preventDefault();
        alert('Forgot password? Coming soon!');
    });

    // Form submit listeners
    loginModal.querySelector('form').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);

    // Init
    checkAuthOnLoad();
});


