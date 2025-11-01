async function verifyAndSetSession(requiredRole = 'editor') {
    // Check local session first
    const userData = sessionStorage.getItem("user");
    const loggedIn = sessionStorage.getItem("loggedIn");

    if (loggedIn !== "true" || !userData) {
        window.location.href = '../login.html';
        return null;
    }

    const user = JSON.parse(userData);

    // Optional: Verify with server periodically
    try {
        const res = await fetch('https://wrytix.onrender.com/verify-session', {
            credentials: 'include'
        });
        // If server session expired, still use local session
        if (!res.ok) {
            console.debug('Server session expired, using local session');
        }
    } catch (err) {
        console.log('Server verification failed, using local session');
    }

    // Set UI elements
    sessionStorage.setItem('loggedIn', 'true');
    sessionStorage.setItem('currentUser', user.username);
    sessionStorage.setItem('role', user.role);
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.textContent = `👤 ${user.username}`;
    }

    return user;
}