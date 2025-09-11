const checkUsername = async (req, res) => {
    try {
        const username = req.query.username;
        const taken = await User.findOne({ username }).lean() ||
            await PendingUser.findOne({ username }).lean();
        res.json({ available: !taken });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check username' });
    }
};

const checkEmail = async (req, res) => {
    try {
        const email = req.query.email?.toLowerCase();
        const taken = await User.findOne({ email }).lean() ||
            await PendingUser.findOne({ email }).lean();
        res.json({ available: !taken });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check email' });
    }
};

module.exports = { checkUsername, checkEmail };