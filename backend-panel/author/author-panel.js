async function verifyAndSetSession(requiredRole = 'author') {
    const userData = sessionStorage.getItem("user");
    const loggedIn = sessionStorage.getItem("loggedIn");

    // 🔹 Step 1: No local session → redirect
    if (loggedIn !== "true" || !userData) {
        window.location.href = '../login.html';
        return null;
    }

    const user = JSON.parse(userData);

    try {
        // 🔹 Step 2: Verify with backend
        const res = await fetch('https://wrytix.onrender.com/verify-session', {
            credentials: 'include'
        });

        if (!res.ok) {
            // If backend session expired, clear storage + redirect
            console.warn("⚠️ Server session expired, forcing logout");
            sessionStorage.clear();
            window.location.href = '../login.html';
            return null;
        }

        // Optional: update user info from server if API returns it
        const serverUser = await res.json();
        if (serverUser?.role && serverUser.role !== requiredRole) {
            alert("Access denied. Wrong role.");
            window.location.href = '../login.html';
            return null;
        }

    } catch (err) {
        console.error('❌ Server verification failed:', err);
        // If server is unreachable, fallback to local session
    }

    // 🔹 Step 3: Set UI elements from local session
    sessionStorage.setItem('loggedIn', 'true');
    sessionStorage.setItem('currentUser', user.username);
    sessionStorage.setItem('role', user.role);

    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.textContent = `👤 ${user.username}`;
    }

    return user;
}
