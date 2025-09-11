const bcrypt = require('bcrypt');
const { User } = require('../models');
const { logAction } = require('../utils/logger');

const login = async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, status: 'active' }).lean();

    if (!user) {
        await logAction(username, 'login-failed', username, { reason: 'User not found' });
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    bcrypt.compare(password, user.password, (err, result) => {
        if (err || !result) {
            logAction(username, 'login-failed', username, { reason: 'Invalid password' });
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
        };

        logAction(username, 'login-success', username);
        res.json({ message: 'Login successful', user: req.session.user });
    });
};

const logout = (req, res) => {
    const username = req.session.user?.username || 'anonymous';
    req.session.destroy();
    logAction(username, 'logout', 'system');
    res.json({ message: 'Logged out' });
};

const checkAuth = (req, res) => {
    if (req.session && req.session.user) {
        res.json({
            username: req.session.user.username,
            fullName: req.session.user.fullName,
            role: req.session.user.role
        });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
};

const verifySession = (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Session expired' });
    }
    res.json({
        user: {
            id: req.session.user.id,
            username: req.session.user.username,
            role: req.session.user.role
        }
    });
};

module.exports = { login, logout, checkAuth, verifySession };