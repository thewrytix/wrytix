const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'avatar') {
            if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.mimetype)) {
                return cb(new Error('Avatar must be an image (JPEG, PNG, or GIF)'));
            }
        } else if (file.fieldname === 'pdf') {
            if (file.mimetype !== 'application/pdf') {
                return cb(new Error('Document must be a PDF'));
            }
        }
        cb(null, true);
    }
});

const corsOptions = {
    origin: ["https://wrytix.netlify.app",  "https://wry-tix.com", "https://www.wry-tix.com", "http://localhost:3000"],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
};

const setupMiddleware = (app) => {
    // Enable preflight requests - FIXED: Use '/:catchAll' for Express 5 wildcard
    app.options('/:catchAll', cors(corsOptions));

    app.use(cors(corsOptions));

    app.get("/", (req, res) => {
        res.send("Backend is running 🚀");
    });

    app.set('trust proxy', 1);
    app.use(helmet());
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        next();
    });

    return { upload };
};

// Export upload directly for route imports
module.exports = { setupMiddleware, upload, corsOptions };