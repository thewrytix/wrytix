const bcrypt = require('bcrypt');
const { User } = require('../models');
const { logAction } = require('../utils/logger');

console.log('🔍 AUTH CONTROLLER IMPORTS:');
console.log('bcrypt:', typeof bcrypt);
console.log('User model:', typeof User);
console.log('logAction:', typeof logAction);


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
    console.log('🚨 SIGNUP FUNCTION EXECUTING - START');
    console.log('📦 Body:', req.body);

    const { fullname, username, email, password } = req.body;

    try {
        console.log('✅ Step 1: Entered try block');

        console.log('🔍 Step 2: Validating input...');
        if (!fullname || !username || !email || !password) {
            console.log('❌ Missing fields');
            return res.status(400).json({ error: 'All fields required' });
        }
        console.log('✅ Input validation passed');

        console.log('🔍 Step 3: Checking User model...');
        console.log('User model type:', typeof User);
        console.log('User model:', User);

        console.log('🔍 Step 4: Checking for existing user...');
        const existingUser = await User.findOne({ $or: [{ username }, { email }, { fullname }] });
        console.log('✅ Existing user check completed');

        if (existingUser) {
            console.log('❌ User already exists');
            return res.status(400).json({ error: 'Username, full name, or email already taken' });
        }
        console.log('✅ No existing user found');

        console.log('🔍 Step 5: Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('✅ Password hashed');

        console.log('🔍 Step 6: Creating user object...');
        const user = new User({
            id: new mongoose.Types.ObjectId().toString(),
            fullname,
            username,
            email,
            password: hashedPassword,
            role: 'viewer',
            status: 'active'
        });
        console.log('✅ User object created');

        console.log('🔍 Step 7: Saving user...');
        await user.save();
        console.log('✅ USER SAVED SUCCESSFULLY');

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
        console.error('💥 CATCH BLOCK ERROR:');
        console.error('💥 Error message:', err.message);
        console.error('💥 Error stack:', err.stack);
        console.error('💥 Error name:', err.name);
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