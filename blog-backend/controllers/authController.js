const bcrypt = require('bcrypt');
const { User } = require('../models');
const mongoose = require('mongoose');
const { logAction } = require('../utils/logger');

// Brute force protection storage (in production, use Redis)
const failedAttempts = new Map();
const lockedAccounts = new Map();

const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

const login = async (req, res) => {
    try {
        // Handle both field names for compatibility
        const usernameOrEmail = req.body.usernameOrEmail || req.body.username;
        const password = req.body.password;
        const clientIP = req.ip || req.connection.remoteAddress;

        if (!usernameOrEmail || !password) {
            return res.status(400).json({ error: 'Username/email and password required' });
        }

        // Check if IP is locked
        const ipKey = `ip:${clientIP}`;
        if (failedAttempts.get(ipKey) >= MAX_ATTEMPTS) {
            return res.status(429).json({
                error: 'Too many failed attempts. Please try again in 15 minutes.'
            });
        }

        let query = { status: 'active' };
        if (usernameOrEmail.includes('@')) {
            query.email = usernameOrEmail;
        } else {
            query.username = usernameOrEmail;
        }

        const user = await User.findOne(query).lean();

        if (!user) {
            // Increment failed attempts for this IP
            const attempts = failedAttempts.get(ipKey) || 0;
            failedAttempts.set(ipKey, attempts + 1);

            // Set expiration for IP lockout
            setTimeout(() => {
                failedAttempts.delete(ipKey);
            }, LOCKOUT_TIME);

            await logAction(usernameOrEmail || 'unknown', 'login-failed', 'system', {
                reason: 'User not found',
                attempts: attempts + 1,
                ip: clientIP
            });

            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if this specific account is locked
        const accountKey = `user:${user.username}`;
        if (lockedAccounts.has(accountKey)) {
            const lockTime = lockedAccounts.get(accountKey);
            if (Date.now() < lockTime) {
                return res.status(429).json({
                    error: 'Account temporarily locked due to too many failed attempts. Please try again later.'
                });
            } else {
                lockedAccounts.delete(accountKey);
            }
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            // Increment failed attempts for both IP and account
            const ipAttempts = failedAttempts.get(ipKey) || 0;
            failedAttempts.set(ipKey, ipAttempts + 1);

            const userAttempts = failedAttempts.get(accountKey) || 0;
            const newUserAttempts = userAttempts + 1;
            failedAttempts.set(accountKey, newUserAttempts);

            // Lock account if max attempts reached
            if (newUserAttempts >= MAX_ATTEMPTS) {
                const lockUntil = Date.now() + LOCKOUT_TIME;
                lockedAccounts.set(accountKey, lockUntil);

                // Auto-unlock after timer
                setTimeout(() => {
                    lockedAccounts.delete(accountKey);
                    failedAttempts.delete(accountKey);
                }, LOCKOUT_TIME);
            }

            // Set expiration for IP lockout
            setTimeout(() => {
                failedAttempts.delete(ipKey);
            }, LOCKOUT_TIME);

            await logAction(user.username, 'login-failed', user.username, {
                reason: 'Invalid password',
                attempts: newUserAttempts,
                ip: clientIP,
                locked: newUserAttempts >= MAX_ATTEMPTS
            });

            // Return remaining attempts
            const remainingAttempts = MAX_ATTEMPTS - newUserAttempts;
            return res.status(401).json({
                error: `Invalid credentials. ${remainingAttempts > 0 ? `${remainingAttempts} attempts remaining` : 'Account locked'}`
            });
        }

        // SUCCESSFUL LOGIN - Reset counters
        failedAttempts.delete(ipKey);
        failedAttempts.delete(accountKey);
        lockedAccounts.delete(accountKey);

        req.session.user = {
            id: user.id,
            username: user.username,
            fullName: user.fullname,
            role: user.role,
        };

        await logAction(user.username, 'login-success', user.username, { ip: clientIP });
        res.json({ message: 'Login successful', user: req.session.user });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};

// Add this cleanup function to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    // Clean up expired IP locks
    for (let [key, attempts] of failedAttempts.entries()) {
        // If it's an IP key and we haven't seen activity in 2x lockout time, clean it up
        if (key.startsWith('ip:')) {
            // Simple cleanup - in production, use Redis with TTL
            if (Math.random() < 0.1) { // Random cleanup to avoid performance hit
                failedAttempts.delete(key);
            }
        }
    }
}, 30 * 60 * 1000); // Cleanup every 30 minutes

// Your existing signup, logout, checkAuth functions remain the same...
const signup = async (req, res) => {
    const { fullname, username, email, password } = req.body;

    try {
        if (!fullname || !username || !email || !password) {
            return res.status(400).json({ error: 'All fields required' });
        }

        const existingUser = await User.findOne({ $or: [{ username }, { email }] });

        if (existingUser) {
            return res.status(400).json({ error: 'Username, full name, or email already taken' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            id: new mongoose.Types.ObjectId().toString(),
            fullname,
            username,
            email,
            password: hashedPassword,
            role: 'viewer',
            status: 'active'
        });

        await user.save();

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
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
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