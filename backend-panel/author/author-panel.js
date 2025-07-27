// 🔐 Verify session globally and store in sessionStorage
async function verifyAndSetSession(requiredRole = 'author') {
    try {
        const res = await fetch('http://localhost:3000/verify-session', {
            credentials: 'include'
        });

        if (!res.ok) throw new Error('Invalid session');

        const { user } = await res.json();

        if (!user || user.role !== requiredRole) {
            alert("Access denied.");
            window.location.href = '../login.html';
            return;
        }

        sessionStorage.setItem('loggedIn', 'true');
        sessionStorage.setItem('currentUser', user.username);
        sessionStorage.setItem('role', user.role);

        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.textContent = `👤 ${user.username}`;
        }

        return user;
    } catch (err) {
        console.error("Session error:", err);
        sessionStorage.clear();
        window.location.href = '../login.html';
    }
}
