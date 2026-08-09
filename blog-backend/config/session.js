// config/session.js
const session = require('express-session');
const MongoStore = require('connect-mongo'); // ✅ Correct import

// ============================================================
// 1. SESSION STORE (MongoDB)
// ============================================================

const sessionStore = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 14 * 24 * 60 * 60,
    autoRemove: 'native',
});

// --- Log store errors for debugging ---
sessionStore.on('error', (error) => {
    console.error('❌ Session store error:', error);
});

// ============================================================
// 2. SESSION CONFIGURATION
// ============================================================

const getSessionConfig = () => {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
        secret: process.env.SESSION_SECRET,
        name: 'sessionId',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000,
        },
    };
};

// ============================================================
// 3. EXPORT – Middleware Setup Function
// ============================================================

const setupSession = (app) => {
    app.use(session(getSessionConfig()));
};

module.exports = setupSession;