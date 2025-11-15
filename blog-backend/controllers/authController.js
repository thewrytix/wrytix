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
        const usernameOrEmail = req.body.usernameOrEmail || req.body.username;
        const password = req.body.password;
        const clientIP = req.ip || req.connection.remoteAddress;

        if (!usernameOrEmail || !password) {
            return res.status(400).json({ error: 'Username/email and password required' });
        }

        // Check if IP is locked
        const ipKey = `ip:${clientIP}`;
        const ipAttempts = failedAttempts.get(ipKey) || 0;

        if (ipAttempts >= MAX_ATTEMPTS) {
            return res.status(429).json({
                error: 'Too many failed attempts. Please try again in 15 minutes.'
            });
        }

        // FIX: Try BOTH username and email queries to find the user
        let user = null;

        // First, try to find by username (for backend panel users)
        user = await User.findOne({
            username: usernameOrEmail,
            status: 'active'
        }).lean();

        // If not found by username and input contains @, try email (for website viewers)
        if (!user && usernameOrEmail.includes('@')) {
            user = await User.findOne({
                email: usernameOrEmail,
                status: 'active'
            }).lean();
        }

        // If still not found, try without status filter as fallback
        if (!user) {
            user = await User.findOne({
                username: usernameOrEmail
            }).lean();

            if (!user && usernameOrEmail.includes('@')) {
                user = await User.findOne({
                    email: usernameOrEmail
                }).lean();
            }
        }

        if (!user) {
            // Increment failed attempts for this IP
            failedAttempts.set(ipKey, ipAttempts + 1);

            // Set expiration for IP lockout
            setTimeout(() => {
                failedAttempts.delete(ipKey);
            }, LOCKOUT_TIME);

            await logAction(usernameOrEmail || 'unknown', 'login-failed', 'system', {
                reason: 'User not found',
                attempts: ipAttempts + 1,
                ip: clientIP
            });

            const remainingAttempts = MAX_ATTEMPTS - (ipAttempts + 1);
            return res.status(401).json({
                error: `Invalid credentials. ${remainingAttempts > 0 ? `${remainingAttempts} attempts remaining` : 'Too many attempts'}`
            });
        }

        // Check if user is active
        if (user.status !== 'active') {
            await logAction(user.username, 'login-failed', user.username, {
                reason: `Account is ${user.status}`,
                ip: clientIP
            });
            return res.status(403).json({
                error: `Account is ${user.status}. Please contact administrator.`
            });
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
            failedAttempts.set(ipKey, ipAttempts + 1);

            const userAttempts = failedAttempts.get(accountKey) || 0;
            const newUserAttempts = userAttempts + 1;
            failedAttempts.set(accountKey, newUserAttempts);

            // DIFFERENT SECURITY BASED ON ROLE
            if (newUserAttempts >= MAX_ATTEMPTS) {
                if (user.role === 'viewer') {
                    // Viewers get temporary lockout
                    const lockUntil = Date.now() + LOCKOUT_TIME;
                    lockedAccounts.set(accountKey, lockUntil);

                    // Auto-unlock after timer
                    setTimeout(() => {
                        lockedAccounts.delete(accountKey);
                        failedAttempts.delete(accountKey);
                    }, LOCKOUT_TIME);

                } else {
                    // Authors, Editors, Admins get ACCOUNT SUSPENSION
                    await User.findOneAndUpdate(
                        { username: user.username },
                        { status: 'suspended' }
                    );

                    await logAction('system', 'security-alert', 'system', {
                        message: `Account suspended due to brute force attempts`,
                        username: user.username,
                        role: user.role,
                        ip: clientIP,
                        attempts: newUserAttempts
                    });
                }
            }

            // Set expiration for IP lockout
            setTimeout(() => {
                failedAttempts.delete(ipKey);
            }, LOCKOUT_TIME);

            await logAction(user.username, 'login-failed', user.username, {
                reason: 'Invalid password',
                attempts: newUserAttempts,
                ip: clientIP,
                locked: newUserAttempts >= MAX_ATTEMPTS,
                role: user.role
            });

            // Return appropriate message
            const remainingFromIP = MAX_ATTEMPTS - (ipAttempts + 1);
            const remainingFromAccount = MAX_ATTEMPTS - newUserAttempts;
            const remainingAttempts = Math.min(remainingFromIP, remainingFromAccount);

            let errorMessage = `Invalid credentials. `;

            if (newUserAttempts >= MAX_ATTEMPTS) {
                if (user.role === 'viewer') {
                    errorMessage += 'Account temporarily locked for 15 minutes.';
                } else {
                    errorMessage += 'Account suspended due to security concerns. Please contact administrator.';
                }
            } else {
                errorMessage += `${remainingAttempts} attempts remaining`;
            }

            return res.status(401).json({ error: errorMessage });
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

        await logAction(user.username, 'login-success', user.username, {
            ip: clientIP,
            role: user.role
        });
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