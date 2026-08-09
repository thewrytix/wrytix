// config/helmet.js
const helmet = require('helmet');

// ============================================================
// 1. HELMET CONFIGURATION
//    Defines Content Security Policy (CSP) and other security headers
// ============================================================

const helmetConfig = {
    // --- Content Security Policy ---
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'", // Required for inline scripts (be cautious)
                "https://wry-tix.com",
                "https://www.wry-tix.com",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com",
            ],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: [
                "'self'",
                "https://wrytix.onrender.com",
                "https://www.wry-tix.com",
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'", // For inline styles (e.g., Bootstrap, custom)
                "https://fonts.googleapis.com",
                "https://cdn.jsdelivr.net",
            ],
            fontSrc: ["'self'", "data:", "https:"],
        },
    },
    // --- Disable COEP (allows cross-origin resources) ---
    crossOriginEmbedderPolicy: false,
    // --- Allow cross-origin resource sharing ---
    crossOriginResourcePolicy: { policy: "cross-origin" },
};

// ============================================================
// 2. EXPORT – The configured Helmet middleware
// ============================================================

module.exports = helmet(helmetConfig);