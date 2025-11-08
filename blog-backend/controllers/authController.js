const bcrypt = require('bcrypt');
const { User } = require('../models');
const { logAction } = require('../utils/logger');

const login = async (req, res) => {
    const { usernameOrEmail, password } = req.body; // Frontend sends 'email' but we map to usernameOrEmail
    let query = { status: 'active' };
    if (usernameOrEmail.includes('@')) {
        query.email = usernameOrEmail; // Login by email
    } else {
        query.username = usernameOrEmail; // Or by username
    }

    const user = await User.findOne(query).lean();

    if (!user) {
        await logAction(usernameOrEmail || 'unknown', 'login-failed', 'system', { reason: 'User not found' });
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    bcrypt.compare(password, user.password, (err, result) => {
        if (err || !result) {
            logAction(user.username, 'login-failed', user.username, { reason: 'Invalid password' });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            fullName: user.fullname, // Assuming schema 'fullname'—swap if camelCase
            role: user.role,
        };

        logAction(user.username, 'login-success', user.username);
        res.json({ message: 'Login successful', user: req.session.user });
    });
};

const signup = async (req, res) => {
    console.log('Signup route HIT with body:', req.body);

    // Extract variables here so they're available in catch block
    const { fullname, username, email, password } = req.body;

    try {
        if (!fullname || !username || !email || !password) {
            return res.status(400).json({ error: 'All fields required' });
        }

        // Check uniqueness
        const existingUser = await User.findOne({ $or: [{ username }, { email }, { fullname }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Username, full name, or email already taken' });
        }

        // Hash and save
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            fullname,
            username,
            email,
            password: hashedPassword,
            role: 'viewer',
            status: 'active'
        });
        await user.save();

        logAction(username, 'signup-success', username);
        res.status(201).json({
            message: 'Account created successfully',
            user: {
                id: user.id,
                username: user.username,
                fullName: user.fullname,
                role: user.role
            }
        });
    } catch (err) {
        // Now username is available in the catch block
        logAction(username || 'unknown', 'signup-failed', 'system', { reason: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};

const logout = (req, res) => {
    const username = req.session.user?.username || 'anonymous';
    req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
    });
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

module.exports = { login, logout, checkAuth, verifySession, signup };