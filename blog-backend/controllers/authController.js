const bcrypt = require('bcrypt');
const { User } = require('../models');
const mongoose = require('mongoose');
const { logAction } = require('../utils/logger');



const login = async (req, res) => {

    try {
        // Handle both field names for compatibility
        const usernameOrEmail = req.body.usernameOrEmail || req.body.username;
        const password = req.body.password;


        if (!usernameOrEmail || !password) {

            return res.status(400).json({ error: 'Username/email and password required' });
        }

        let query = { status: 'active' };
        if (usernameOrEmail.includes('@')) {
            query.email = usernameOrEmail;
        } else {
            query.username = usernameOrEmail;
        }


        const user = await User.findOne(query).lean();

        if (!user) {

            await logAction(usernameOrEmail || 'unknown', 'login-failed', 'system', { reason: 'User not found' });
            return res.status(401).json({ error: 'Invalid credentials' });
        }


        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {

            logAction(user.username, 'login-failed', user.username, { reason: 'Invalid password' });
            return res.status(401).json({ error: 'Invalid credentials' });
        }


        req.session.user = {
            id: user.id,
            username: user.username,
            fullName: user.fullname,
            role: user.role,
        };

        logAction(user.username, 'login-success', user.username);
        res.json({ message: 'Login successful', user: req.session.user });

    } catch (err) {
       
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};

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