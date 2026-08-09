const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { ddosProtection, loginSlowDown } = require('../middleware/slowDown'); // ✅ capital D
const { apiLimiter, authLimiter } = require('../middleware/rateLimit');
const {corsOptions} = require("./cors");
const {use} = require("bcrypt/promises");
const {upload} = require("./multer"); // 👈

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
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: [
                        "'self'",
                        "'unsafe-inline'",
                        "https://wry-tix.com",
                        "https://www.wry-tix.com",
                        "https://cdn.jsdelivr.net",
                        "https://cdnjs.cloudflare.com"
                    ],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: [
                        "'self'",
                        "https://wrytix.onrender.com",
                        "https://www.wry-tix.com"
                    ],
                    styleSrc: [
                        "'self'",
                        "'unsafe-inline'",
                        "https://fonts.googleapis.com",
                        "https://cdn.jsdelivr.net"
                    ],
                    fontSrc: ["'self'", "data:", "https:"]
                },
            },
            crossOriginEmbedderPolicy: false,
            crossOriginResourcePolicy: { policy: "cross-origin" }
        })
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
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        next();
    });
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
};

module.exports = { setupMiddleware, upload, corsOptions };
