// middleware/ddos.js
const slowDown = require("express-slow-down");

// Global (or per-route)
const ddosProtection = slowDown({
    windowMs: 15 * 60 * 1000,  // 15min window (longer = less trigger-happy)
    delayAfter: 100,           // Allow 100 reqs before delay (up from 50)
    delayMs: (reqCount) => (reqCount - 100) * 100,  // Ramp slower: 100ms/extra
    maxDelayMs: 1000,          // Cap at 1s (down from 2s)
    skip: (req) => req.path === '/posts' || req.path.startsWith('/api/forex'),  // Bypass for your light endpoints
    message: 'Too many requests – chill for a sec! 😎'  // Fun error
});

module.exports = ddosProtection;