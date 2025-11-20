// middleware/ddos.js
const slowDown = require("express-slow-down");

const ddosProtection = slowDown({
    windowMs: 30 * 1000,  // 30 seconds window
    delayAfter: 80,       // allow 80 requests then...
    delayMs: 500          // add 0.5s delay per request
});

module.exports = ddosProtection;
