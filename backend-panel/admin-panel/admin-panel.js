async function verifyAndSetSession(requiredRole = 'admin') {
    try {
        console.log('Starting session verification...');
        console.log('Target URL:', 'https://wrytix.onrender.com/verify-session');

        // Test basic connectivity first
        console.log('Testing basic connectivity...');
        const pingTest = await fetch('https://wrytix.onrender.com/ping');
        console.log('Ping test status:', pingTest.status);
        console.log('Ping response:', await pingTest.text());

        // Now try the session verification
        console.log('Attempting session verification...');
        const res = await fetch('https://wrytix.onrender.com/verify-session', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('Session verify status:', res.status);
        console.log('Response headers:', Object.fromEntries(res.headers.entries()));

        if (!res.ok) {
            if (res.status === 401) {
                console.log('No valid session - redirecting to login');
                window.location.href = '../login.html';
                return;
            }
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const { user } = await res.json();
        // ... rest of your existing code

    } catch (err) {
        console.error("Detailed error information:");
        console.error("Error type:", err.constructor.name);
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
        console.error("Error toString:", err.toString());

        // Try to determine the exact failure point
        if (err.message.includes('NetworkError') || err.name === 'TypeError') {
            console.error('This is likely a browser-level network blocking or CORS preflight failure');
            console.error('Check browser DevTools Network tab for blocked requests');
        }

        sessionStorage.clear();
        window.location.href = '../login.html';
    }
}