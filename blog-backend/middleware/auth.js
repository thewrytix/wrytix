const { logAction } = require('../utils/logger');

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

module.exports = { verifySession, requireRole, requireAdmin, requireLogin, requireEditorOrAdmin };