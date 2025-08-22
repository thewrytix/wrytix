async function verifyAndSetSession(requiredRole = 'admin') {
    try {
        const res = await fetch('https://wrytix.onrender.com/verify-session', {
            credentials: 'include'
        });
        if (!res.ok) {
            console.error('Fetch response:', res.status, res.statusText);
            throw new Error('Invalid session');
        }
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
        console.error("Session error details:", {
            message: err.message,
            name: err.name,
            stack: err.stack
        });
        sessionStorage.clear();
        window.location.href = '../login.html';
    }
}