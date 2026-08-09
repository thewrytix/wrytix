// middleware/slowDown.js
const slowDowns = require('express-slow-down');
const { ipKeyGenerator } = require('express-rate-limit'); // IPv6 helper
const { logger } = require('../config/logger'); // adjust path as needed

// ============================================================
// 1. GLOBAL DDoS PROTECTION (Soft Throttling)
//    Slows down excessive requests instead of blocking
//    Perfect for preventing traffic spikes
// ============================================================
const ddosProtection = slowDowns({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 100,          // 100 requests normal, then delay kicks in
    delayMs: (hits) => (hits - 100) * 100, // 101st = 100ms, 102nd = 200ms...
    maxDelayMs: 1000,         // Cap at 1 second (user-friendly)

    // --- Skip Rules ---
    skip: (req) => {
        // Never slow down static assets or health checks
        return req.path.startsWith('/static') || req.path === '/health';
    },

    // --- Response Message ---
    message: 'Too fast! Slow down please.',

    // --- FIX: IPv6‑safe keyGenerator ---
    keyGenerator: (req) => {
        const ip = req.ip ?? req.socket?.remoteAddress;
        return ip ? ipKeyGenerator(ip) : 'unknown';
    },
});

// ============================================================
// 2. LOGIN SPECIFIC SLOW-DOWN (Exponential Backoff)
//    Targets brute-force password guessing attacks
//    Uses exponential backoff: 3s, 4s, 5s... up to 30s
// ============================================================
const loginSlowDown = slowDowns({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 2,            // After 2 failures, 3rd attempt gets delayed
    delayMs: (hits) => hits * 1000, // 3rd = 3s, 4th = 4s, 5th = 5s...
    maxDelayMs: 30000,        // Cap at 30 seconds (frustrating for bots)
    skipSuccessfulRequests: true, // Successful login resets the counter

    // --- IPv6‑safe keyGenerator ---
    keyGenerator: (req) => {
        const user = req.body?.email || req.body?.username || 'unknown';
        const ip = req.ip ?? req.socket?.remoteAddress;
        const normalizedIp = ip ? ipKeyGenerator(ip) : 'unknown';
        return `loginSlow_${user}_${normalizedIp}`;
    },

    // --- FIX: Removed onLimitReached ---
    // This option was removed from express-rate-limit v7 and never existed in
    // express-slow-down officially. Instead, you can log via a custom middleware
    // or the 'handler' option if you're using rateLimit. For slowDown, just remove it.
    // If you need logging, you can add a custom middleware that checks the
    // request count before passing to slowDown – but that's overkill for most projects.
});

// ============================================================
// 3. EXPORT
// ============================================================
module.exports = {
    ddosProtection,
    loginSlowDown,
};