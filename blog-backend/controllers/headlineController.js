const { Headline } = require('../models');
const { logAction } = require('../config/logger');

const getHeadline = async (req, res) => {
    try {
        const headline = await Headline.findOne({ active: true }).sort({ createdAt: -1 }).lean();
        res.json({ text: headline?.title || '' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load headline' });
    }
};

const updateHeadline = async (req, res) => {
    try {
        const { text } = req.body;
        if (typeof text !== 'string' || text.trim() === '') {
            await logAction(req.session.user?.username, 'update-headline-failed', 'invalid input');
            return res.status(400).json({ error: 'Invalid headline text' });
        }

        // Deactivate any existing active headline, then create a new one.
        // Keeps a history of past headlines instead of overwriting in place.
        await Headline.updateMany({ active: true }, { active: false });
        const newHeadline = await Headline.create({ title: text.trim(), active: true });

        await logAction(req.session.user?.username, 'update-headline', newHeadline.title);
        res.status(200).json({ message: 'Headline updated successfully', headline: newHeadline });
    } catch (err) {
        await logAction(req.session.user?.username, 'update-headline-failed', 'server error');
        res.status(500).json({ error: 'Failed to update headline' });
    }
};

module.exports = { getHeadline, updateHeadline };