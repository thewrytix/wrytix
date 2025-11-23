const rateLimit = require("express-rate-limit");

// Global (or export variants for routes)
const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 min (longer window = burst-friendly)
    max: 1000,                 // 1000 req/IP (way up – safe for blog)
    message: { error: "Rate limit hit – try again in a bit! 😌" },
    standardHeaders: true,     // Add X-RateLimit headers for frontend hints
    legacyHeaders: false,      // Cleaner
    skip: (req) => {           // Bypass for key endpoints
        return req.path === '/posts' || req.path.startsWith('/api/forex') || req.path === '/check';
    }
    // Per-IP default; add store: memoryStore({}) if needed
});

module.exports = apiRateLimiter;