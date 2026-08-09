// config/middleware.js
const express = require('express');
const cors = require('cors');
const { ddosProtection, loginSlowDown } = require('../middleware/slowDown');
const { apiLimiter, authLimiter } = require('../middleware/rateLimit');
const { corsOptions } = require('./cors');
const { upload } = require('./multer');
const { requestLogger } = require('../middleware/requestLogger'); // ✅ destructured
const { errorHandler, notFound } = require('../middleware/errorHandler');
const helmet = require('./helmet');
const cookieParser = require("cookie-parser"); // ✅ this exports the configured middleware (function)
const routes = require('../routes');

/* -----------------------------------------
   Setup Middleware
------------------------------------------ */
const setupMiddleware = (app) => {
    // Trust reverse proxies (important for Render/Netlify)
    app.set('trust proxy', 1);

    // --- Helmet security headers ---
    app.use(helmet); // ✅ helmet is a function – no parentheses needed

    // --- Strict-Transport-Security (HTTPS only) ---
    if (process.env.NODE_ENV === "production") {
        app.use((req, res, next) => {
            res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
            next();
        });
    }

    app.use(cookieParser()); // ✅ add this

    // --- CORS ---
    app.use(cors(corsOptions));

    // --- Body Parsers ---
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // --- Request Logger ---
    app.use(requestLogger); // ✅ a function

    // --- Global API rate limiter + DDoS protection (skip login) ---
    app.use((req, res, next) => {
        if (req.path.startsWith('/auth/login')) return next();
        apiLimiter(req, res, () => {
            ddosProtection(req, res, next);
        });
    });

    // --- Root Test Route ---
    app.get("/", (req, res) => {
        res.send("Backend is running 🚀");
    });

    // Setup routes
    app.use(routes);

// --- Error Handling (LAST - before return) ---
    app.use(notFound);
    app.use(errorHandler);



    // --- Return upload helper ---
    return { upload };
};

module.exports = { setupMiddleware };