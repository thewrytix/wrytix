const { Role } = require('../models'); // Add this import
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

// Add missing requireHierarchyLevel function
const requireHierarchyLevel = (minLevel) => async (req, res, next) => {
    const user = req.session?.user;
    if (!user) {
        await logAction('anonymous', 'access-denied', req.path, {
            reason: 'No session',
            ip: req.ip
        });
        return res.status(401).json({ message: 'Unauthorized: No session found' });
    }

    if (!Role) {
        console.error('Role model is undefined');
        await logAction(user.username, 'access-denied', req.path, {
            reason: 'Role model undefined',
            userRole: user.role
        });
        return res.status(500).json({ message: 'Server error: Role model unavailable' });
    }

    try {
        const role = await Role.findOne({ name: user.role }).lean();
        if (!role || role.hierarchyLevel < minLevel) {
            await logAction(user.username, 'access-denied', req.path, {
                reason: 'Insufficient hierarchy level',
                requiredLevel: minLevel,
                userRole: user.role,
                userLevel: role?.hierarchyLevel
            });
            return res.status(403).json({ message: 'Forbidden: Insufficient role level' });
        }
        req.user = user;
        next();
    } catch (err) {
        console.error('Error in requireHierarchyLevel:', err);
        await logAction(user.username, 'access-denied', req.path, {
            reason: 'Error checking hierarchy level',
            error: err.message,
            userRole: user.role
        });
        return res.status(500).json({ message: 'Server error: Failed to check hierarchy level' });
    }
};

const requireSuperAdmin = async (req, res, next) => {
    const user = req.session?.user;
    if (!user) {
        await logAction('anonymous', 'access-denied', req.path, {
            reason: 'No session',
            ip: req.ip
        });
        return res.status(401).json({ message: 'Unauthorized: No session found' });
    }

    try {
        const role = await Role.findOne({ name: user.role }).lean();
        if (!role || role.hierarchyLevel < 7) {
            await logAction(user.username, 'access-denied', req.path, {
                reason: 'Not super administrator',
                userRole: user.role,
                requiredLevel: 7
            });
            return res.status(403).json({ message: 'Forbidden: Super Administrator access required' });
        }
        req.user = user;
        next();
    } catch (err) {
        console.error('Error in requireSuperAdmin:', err);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Track-specific middleware
const requireContentRole = (minLevel) => async (req, res, next) => {
    const user = req.session?.user;
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const userRole = await Role.findOne({ name: user.role });
    if (!userRole) {
        return res.status(403).json({ message: 'Invalid role' });
    }

    // Content track or platform track users
    const hasAccess = userRole.track === 'content' ||
        userRole.track === 'platform' ||
        userRole.hierarchyLevel >= 5;

    if (!hasAccess || userRole.hierarchyLevel < minLevel) {
        await logAction(user.username, 'access-denied', req.path, {
            reason: 'Insufficient content track access',
            userRole: user.role,
            requiredLevel: minLevel
        });
        return res.status(403).json({
            message: `Access denied: Requires content track access at level ${minLevel}`
        });
    }

    req.user = user;
    next();
};

const requireAdRole = (minLevel) => async (req, res, next) => {
    const user = req.session?.user;
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const userRole = await Role.findOne({ name: user.role });
    if (!userRole) {
        return res.status(403).json({ message: 'Invalid role' });
    }

    // Advertising track or platform track users
    const hasAccess = userRole.track === 'advertising' ||
        userRole.track === 'platform' ||
        userRole.hierarchyLevel >= 5;

    if (!hasAccess || userRole.hierarchyLevel < minLevel) {
        await logAction(user.username, 'access-denied', req.path, {
            reason: 'Insufficient advertising track access',
            userRole: user.role,
            requiredLevel: minLevel
        });
        return res.status(403).json({
            message: `Access denied: Requires advertising track access at level ${minLevel}`
        });
    }

    req.user = user;
    next();
};

module.exports = {
    verifySession,
    requireRole,
    requireAdmin,
    requireLogin,
    requireEditorOrAdmin,
    requireHierarchyLevel,  // Add this
    requireSuperAdmin,
    requireContentRole,
    requireAdRole           // Complete this
};