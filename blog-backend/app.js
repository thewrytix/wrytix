// app.js
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

// --- Configs ---
const { sessionConfig } = require('./config/session');
const { corsOptions } = require('./config/cors');
const { logger } = require('./config/logger');

// --- Middleware ---
const { requestLogger } = require('./middleware/requestLogger');
const { ddosProtection, loginSlowDown } = require('./middleware/slowDown'); // 👈 camelCase
const { apiLimiter, authLimiter } = require('./middleware/rateLimit'); // 👈 camelCase
const { attachUser } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// --- Routes ---
const routes = require('./routes');

// ============================================================
// 1. INITIALIZE
// ============================================================
const app = express();

// ============================================================
// 2. TRUST PROXY (for Nginx/Cloudflare)
// ============================================================
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', true);
}

// ============================================================
// 3. SECURITY HEADERS (MUST BE FIRST)
// ============================================================
app.use(helmet());

// ============================================================
// 4. MIDDLEWARE ORDER (CRITICAL – DO NOT REARRANGE)
// ============================================================

// --- 4a. Cookie Parser (Before session) ---
app.use(cookieParser());

// --- 4b. CORS ---
app.use(cors(corsOptions));

// --- 4c. Body Parsers ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- 4d. Static Files (Public assets) ---
app.use('/uploads', express.static('uploads'));

// --- 4e. Request Logging (skip in tests) ---
if (process.env.NODE_ENV !== 'test') {
    app.use(requestLogger);
}

// --- 4f. Security: Rate Limiters (BEFORE session) ---
app.use(ddosProtection);   // Soft throttling
app.use(apiLimiter);       // Hard blocking

// --- 4g. Session (Web browsers) ---
app.use(session(sessionConfig));

// --- 4h. Attach user to req.user (for role-based access) ---
app.use(attachUser);

// ============================================================
// 5. HEALTH CHECK (Public)
// ============================================================
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
    });
});

// ============================================================
// 6. PING ENDPOINT (Public - Quick connectivity check)
// ============================================================
app.get('/ping', (req, res) => {
    const username = req.session?.user?.username || req.session?.user?.email || 'anonymous';
    logger.info(`🔄 Backend ping - User: ${username} - IP: ${req.ip}`);

    res.json({
        success: true,
        message: 'Backend is alive!!!',
        timestamp: new Date().toISOString(),
    });
});

// ============================================================
// 7. ALL ROUTES (Mounted under /api)
// ============================================================
app.use('/api', routes);

// ============================================================
// 8. ERROR HANDLING (LAST)
// ============================================================
app.use(notFound);
app.use(errorHandler);

// ============================================================
// 9. EXPORT APP
// ============================================================
module.exports = app;