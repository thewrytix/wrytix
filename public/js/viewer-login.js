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
    const API_BASE = 'https://wrytix.onrender.com'; // Swap for prod, e.g., 'https://your-wrytix-api.com/api'

    let currentUser = null;

    // Seamless UI update: Swap login btn <-> profile dropdown
    function updateViewerUI() {
        if (currentUser) {
            loginBtn.style.display = 'none';
            profileDropdown.style.display = 'block';
            const profileText = document.getElementById('profileText');
            const profileIcon = document.getElementById('profileIcon');
            profileText.textContent = `Hi, ${currentUser.username}!`;
            profileIcon.className = 'fa-solid fa-user-circle';
        } else {
            loginBtn.style.display = 'block';
            profileDropdown.style.display = 'none';
        }
    }

    // Check session on load (populates currentUser)
    async function checkAuthOnLoad() {
        try {
            const res = await fetch(`${API_BASE}/auth/auth/check`, {
                method: 'GET',
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                if (data.username) {
                    currentUser = data; // { username, fullName, role }
                }
            }
        } catch (err) {
            console.error('Auth check failed:', err);
        } finally {
            updateViewerUI(); // Always finalize UI state
        }
    }

    // Loading/Error helpers (dynamic elements)
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
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        if (isSuccess) {
            setTimeout(() => { errorEl.style.display = 'none'; }, 3000); // Auto-hide success
        }
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
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usernameOrEmail, password }),
                credentials: 'include'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');
            await checkAuthOnLoad(); // Pull fresh session data, update UI
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

    // Signup handler
    async function handleSignup(e) {
        e.preventDefault();
        const fullname = document.getElementById('signup-fullname').value.trim();
        const username = document.getElementById('signup-username').value.trim();
        const email = document.getElementById('signup-email').value.trim();
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
                body: JSON.stringify({ fullname, username, email, password }),
                credentials: 'include'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Signup failed');
            // Success: Switch to login modal with green msg
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

    // Modal toggles (your originals, auth-aware)
    loginBtn.addEventListener("click", () => {
        if (!currentUser) {
            loginModal.style.display = "flex";
        }
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

    // Profile dropdown events
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileMenu.style.display = profileMenu.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
        if (!profileBtn.contains(e.target)) {
            profileMenu.style.display = 'none';
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        logout();
        profileMenu.style.display = 'none';
    });

    document.getElementById('viewProfile').addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Opening profile...'); // TODO: Wire to profile modal or route
        profileMenu.style.display = 'none';
    });

    document.getElementById('viewSettings').addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Opening settings...'); // TODO: Wire to settings
        profileMenu.style.display = 'none';
    });

    // Forgot password stub (optional: wire to reset flow)
    document.getElementById('forgot-password').addEventListener('click', (e) => {
        e.preventDefault();
        alert('Forgot password? Coming soon—check your email for reset link!');
    });

    // Form submit listeners
    loginModal.querySelector('form').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);

    // Init: Check auth, set UI state
    checkAuthOnLoad();
});

// Global logout function
function logout() {
    const API_BASE = 'https://wrytix.onrender.com'; // Match above
    fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include'
    })
        .then(() => {
            currentUser = null;
            updateViewerUI(); // Swap back to login btn seamlessly
        })
        .catch(console.error);
}