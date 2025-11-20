// middleware/ddos.js
const slowDown = require("express-slow-down");

const ddosProtection = slowDown({
    windowMs: 30 * 1000,
    delayAfter: 50,
    delayMs: () => 200,      // fixed 200ms per extra request
    maxDelayMs: 2000,
});

module.exports = ddosProtection;
