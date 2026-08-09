const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const signInBtn = loginForm.querySelector('button[type="submit"]');
const loginContainer = document.querySelector('.login-container');

/* ---- Interactive background glow (follows cursor / touch) ---- */
if (loginContainer && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    loginContainer.addEventListener('pointermove', (e) => {
        const rect = loginContainer.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        loginContainer.style.setProperty('--glow-x', `${x}%`);
        loginContainer.style.setProperty('--glow-y', `${y}%`);
    });
}

/* ---- Password visibility toggle ---- */
togglePasswordBtn.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';

    const icon = togglePasswordBtn.querySelector('i');
    icon.classList.toggle('fa-eye', !isHidden);
    icon.classList.toggle('fa-eye-slash', isHidden);

    togglePasswordBtn.setAttribute('aria-pressed', String(isHidden));
    togglePasswordBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
});

function setLoading(isLoading) {
    signInBtn.disabled = isLoading;
    signInBtn.classList.toggle('is-loading', isLoading);
}

/* ---- Submit (showSuccess / showError come from config.js's global toast) ---- */
loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = loginForm.username.value.trim();
    const password = loginForm.password.value.trim();

    if (!username || !password) {
        showError('Please enter both username and password.');
        return;
    }

    setLoading(true);

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (res.ok && data.user) {
            const { role } = data.user;

            localStorage.setItem('loggedIn', 'true');
            localStorage.setItem('user', JSON.stringify(data.user));
            showSuccess('Login successful!');

            setTimeout(() => {
                switch (role) {
                    case 'admin':
                    case 'editor':
                    case 'author':
                        window.location.href = '../dashboard/dashboard.html';
                        break;
                    default:
                        showError('Unknown role. Contact admin.');
                        setLoading(false);
                }
            }, 1200);
        } else {
            showError('Invalid username or password.');
            setLoading(false);
        }
    } catch (err) {
        showError('Server error. Try again.');
        setLoading(false);
    }
});