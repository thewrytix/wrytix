const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const setupMiddleware = (app) => {
    app.use(cors({
        origin: ["https://wrytix.netlify.app", "http://localhost:5500"],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
    }));

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
};

module.exports = setupMiddleware;