const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');

/* -----------------------------------------
   1️⃣ Multer Configuration
------------------------------------------ */
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.fieldname === "avatar") {
            if (!["image/jpeg", "image/png", "image/gif"].includes(file.mimetype)) {
                return cb(new Error("Avatar must be an image (JPEG, PNG, GIF)"));
            }
        } else if (file.fieldname === "pdf") {
            if (file.mimetype !== "application/pdf") {
                return cb(new Error("Document must be a PDF"));
            }
        }
        cb(null, true);
    }
});

/* -----------------------------------------
   2️⃣ CORS Configuration
------------------------------------------ */
const corsOptions = {
    origin: [
        "https://wrytix.netlify.app",
        "https://wry-tix.com",
        "https://www.wry-tix.com",
        "http://localhost:3000",
        "http://localhost:5500"
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
};

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

    /* -----------------------------------------
       Root Test Route
    ------------------------------------------ */
    app.get("/", (req, res) => {
        res.send("Backend is running 🚀");
    });

    return { upload };
};

module.exports = { setupMiddleware, upload, corsOptions };
