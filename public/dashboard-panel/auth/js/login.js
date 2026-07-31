const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = loginForm.username.value.trim();
    const password = loginForm.password.value.trim();

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
            const { username, role } = data.user;

            localStorage.setItem('loggedIn', 'true');
            localStorage.setItem('user', JSON.stringify(data.user));
            showSuccess("Login successful!");

            // Redirect after a short delay
            setTimeout(() => {
                switch (role) {
                    case 'admin':
                        window.location.href = '../dashboard/dashboard.html';
                        break;
                    case 'editor':
                        window.location.href = '../dashboard/dashboard.html';
                        break;
                    case 'author':
                        window.location.href = '../dashboard/dashboard.html';
                        break;
                    default:
                        showError('Unknown role. Contact admin.');
                }
            }, 1200);
        } else {
            showError('Invalid username or password.');
        }
    } catch (err) {
        console.error('Login failed:', err);
        showError('Server error. Try again.');
    }
});

