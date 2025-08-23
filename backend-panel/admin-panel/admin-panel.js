async function verifyAndSetSession(requiredRole = 'admin') {
    try {
        console.log('Making request to verify-session...');
        console.log('Current cookies:', document.cookie);

        const res = await fetch('https://wrytix.onrender.com/verify-session', {
            credentials: 'include'
        });

        console.log('Response status:', res.status);
        console.log('Response headers:', [...res.headers.entries()]);

        if (!res.ok) {
            if (res.status === 401) {
                console.log('No valid session - redirecting to login');
                window.location.href = '../login.html';
                return;
            }
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const { user } = await res.json();
        // ... rest of your code

    } catch (err) {
        console.error("Session error details:", {
            message: err.message,
            name: err.name,
            stack: err.stack
        });

        // Check if it's a genuine network error vs HTTP error
        if (err.message.includes('NetworkError') || err.message.includes('fetch')) {
            console.error('This appears to be a network/CORS issue, not an auth issue');
        }

        sessionStorage.clear();
        window.location.href = '../login.html';
    }
}