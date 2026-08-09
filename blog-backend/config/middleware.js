const express = require('express');
const cors = require('cors');
const { ddosProtection, loginSlowDown } = require('../middleware/slowDown'); // ✅ capital D
const { apiLimiter, authLimiter } = require('../middleware/rateLimit');
const {corsOptions} = require("./cors");
const {use} = require("bcrypt/promises");
const {upload} = require("./multer");
const {requestLogger} = require("../middleware/requestLogger");
const {errorHandler, notFound} = require("../middleware/errorHandler");
const helmet = require("helmet");

/* -----------------------------------------
   1️⃣ Multer Configuration
------------------------------------------ */
use(upload)

/* -----------------------------------------
   2️⃣ CORS Configuration
------------------------------------------ */
use(cors(corsOptions));

/* -----------------------------------------
   3️⃣ Setup Middleware
------------------------------------------ */
const setupMiddleware = (app) => {

    // Trust reverse proxies (important for Render/Netlify)
    app.set('trust proxy', 1);

    /* -------------------------
       Helmet security headers
    -------------------------- */
    app.use(
        helmet()
    );

    /* -----------------------------------------
       Strict-Transport-Security (HTTPS only)
    ------------------------------------------ */
    if (process.env.NODE_ENV === "production") {
        app.use((req, res, next) => {
            res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
            next();
        });
    }

    /* -----------------------------------------
       CORS (LOAD BEFORE LOGGING)
    ------------------------------------------ */
    app.use(cors(corsOptions));

    /* -----------------------------------------
       Body Parsers
    ------------------------------------------ */
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    /* -----------------------------------------
       Request Logger
    ------------------------------------------ */
    app.use(requestLogger);
    // -----------------------------
    // Apply global API rate limiter and DDoS protection
    // -----------------------------
    app.use((req, res, next) => {
        // Skip login route for both protections
        if (req.path.startsWith('/auth/login')) return next();

        apiLimiter(req, res, () => {
            ddosProtection(req, res, next);
        });
    });
    /* -----------------------------------------
       Root Test Route
    ------------------------------------------ */
    app.get("/", (req, res) => {
        res.send("Backend is running 🚀");
    });



    return { upload };

    // ============================================================
// 8. ERROR HANDLING (LAST)
// ============================================================
    app.use(notFound);
    app.use(errorHandler);
};

module.exports = { setupMiddleware, upload, corsOptions };
