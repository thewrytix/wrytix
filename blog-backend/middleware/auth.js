// middleware/auth.js
const { User } = require('../models');
const { SystemConfig } = require('../models');
const { logger } = require('../config/logger');

// ============================================================
// 1. REQUIRE AUTH (Unified - Session + JWT)
//    Recommended for all protected routes
//    Checks session first, then falls back to JWT
// ============================================================
const requireAuth = async (req, res, next) => {
    // --- 1a. Check Session (Web Browsers) ---
    if (req.session && req.session.userId) {
        try {
            const user = await User.findById(req.session.userId).select('-password');
            if (user) {
                req.user = user; // Attach user to request
                req.authMethod = 'session'; // Track authentication method
                return next();
            }
        } catch (err) {
            logger.error('❌ Session auth error:', err);
        }
    }

    // --- 1b. Check JWT (Mobile/APIs) ---
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = verifyToken(token);

            if (decoded) {
                const user = await User.findById(decoded.userId).select('-password');
                if (user) {
                    req.user = user; // Attach user to request
                    req.authMethod = 'jwt'; // Track authentication method
                    return next();
                }
            }
        } catch (err) {
            logger.error('❌ JWT auth error:', err);
        }
    }

    // --- 1c. Neither is valid → Unauthorized ---
    return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please log in.',
        authMethods: ['session', 'jwt'],
    });
};

// ============================================================
// 2. SESSION AUTH (Web browsers only)
//    Checks session cookie only - no JWT support
//    Use for traditional web routes (server-rendered pages)
// ============================================================
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }

    return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please log in.',
    });
};

const blockIfMaintenanceMode = async (req, res, next) => {
    try {
        const user = req.session?.user;
        if (user && ['admin', 'viewer'].includes(user.role)) {
            return next(); // admin and viewer always allowed
        }

        const config = await SystemConfig.findOne().lean();
        if (config?.maintenanceMode) {
            return res.status(503).json({
                error: 'The admin panel is currently under maintenance. Please try again later.'
            });
        }

        next();
    } catch (err) {
        // Fail open rather than lock everyone out if this check itself errors
        console.error('Maintenance mode check failed:', err);
        next();
    }
};

// ============================================================
// 3. ATTACH USER (For role-based access)
//    Attaches user to req.user if logged in (session only)
//    Does NOT block unauthenticated requests
//    Use for routes that optionally need user info
// ============================================================
const attachUser = async (req, res, next) => {
    if (req.session && req.session.userId) {
        try {
            const user = await User.findById(req.session.userId).select('-password');
            if (user) {
                req.user = user;
            }
        } catch (err) {
            logger.error('❌ Attach user error:', err);
        }
    }
    next(); // Always proceed, even if no user found
};

// ============================================================
// 4. JWT AUTH (Mobile/APIs only)
//    Checks JWT token only - no session support
//    Use for mobile apps or third-party API access
// ============================================================
const authenticateJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // --- Check if Authorization header exists ---
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authorization header missing or invalid',
            });
        }

        // --- Extract and verify token ---
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token',
            });
        }

        // --- Find user from decoded token ---
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
            });
        }

        // --- Attach user and proceed ---
        req.user = user;
        req.authMethod = 'jwt';
        next();
    } catch (err) {
        logger.error('❌ JWT auth error:', err);
        return res.status(500).json({
            success: false,
            message: 'Server error during authentication',
        });
    }
};

// ============================================================
// 5. EXPORTS
// ============================================================
module.exports = {
    requireAuth, // Unified (Session + JWT) - RECOMMENDED
    isAuthenticated, // Session only (web browsers)
    attachUser, // Attach user to req.user (optional)
    authenticateJWT, // JWT only (mobile/APIs)
    blockIfMaintenanceMode,
};