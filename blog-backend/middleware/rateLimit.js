// middleware/generalRateLimit.js
const rateLimit = require("express-rate-limit");

const apiRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200, // max 200 requests per IP per minute
    message: { error: "Too many requests. Slow down." }
});

module.exports = apiRateLimiter;
