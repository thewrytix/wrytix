const { logAction } = require('../config/logger');
const { SystemConfig } = require('../models');




const verifySession = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(403).json({ error: 'Forbidden' });
};

const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        const user = req.session?.user;
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized: No session found' });
        }
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient role' });
        }
        next();
    };
};

const requireAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        console.log('Admin access denied:', {
            sessionUser: req.session.user,
            path: req.path,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
        logAction(req.session.user?.username || 'anonymous', 'admin-access-denied', req.path, {
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
        return res.status(403).json({ error: 'Forbidden – Admins only' });
    }
    next();
};

const requireLogin = (req, res, next) => {
    if (!req.session.user) {
        logAction('anonymous', 'login-required', req.path, {
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
        return res.status(401).json({ error: 'Login required' });
    }
    next();
};

const requireEditorOrAdmin = (req, res, next) => {
    if (req.session.user?.role === 'editor' || req.session.user?.role === 'admin') {
        return next();
    }
    return res.status(403).json({ error: 'Forbidden' });
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
module.exports = { verifySession, requireRole, requireAdmin, requireLogin, requireEditorOrAdmin, blockIfMaintenanceMode };