const { User, PendingUser } = require('../models');

const checkUsername = async (req, res) => {
    try {
        const username = req.query.username;
        if (!username || typeof username !== 'string' || username.trim().length === 0) {
            return res.status(400).json({ available: false, error: 'Invalid username provided' });
        }

        const trimmedUsername = username.trim();
        const taken = await User.findOne({ username: trimmedUsername }).lean() ||
            await PendingUser.findOne({ username: trimmedUsername }).lean();

        res.json({ available: !taken });
    } catch (err) {
        console.error('Username check error:', err);
        res.status(500).json({ available: false, error: 'Server error checking username' });
    }
};

const checkEmail = async (req, res) => {
    try {
        const email = req.query.email?.toLowerCase().trim();
        if (!email || typeof email !== 'string' || email.length === 0) {
            return res.status(400).json({ available: false, error: 'Invalid email provided' });
        }

        const taken = await User.findOne({ email }).lean() ||
            await PendingUser.findOne({ email }).lean();

        res.json({ available: !taken });
    } catch (err) {
        console.error('Email check error:', err);
        res.status(500).json({ available: false, error: 'Server error checking email' });
    }
};

module.exports = { checkUsername, checkEmail };