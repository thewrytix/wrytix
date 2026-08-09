const { Comment } = require('../models');
const { logAction } = require('../config/logger');

const getComments = async (req, res) => {
    const slug = req.query.slug;
    if (!slug) {
        return res.status(400).json({ error: 'Missing slug' });
    }

    try {
        const commentDoc = await Comment.findOne({ slug }).lean();
        res.json(commentDoc ? commentDoc.comments : []);
    } catch (err) {
        console.error("Error reading comments:", err);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
};

const createComment = async (req, res) => {
    const { slug, username, comment, timestamp } = req.body;

    if (!slug || !username || !comment || !timestamp) {
        await logAction(req.session.user?.username, 'comment-create-failed', 'missing fields');
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const newComment = { username, comment, timestamp: new Date(timestamp) };
        await Comment.updateOne(
            { slug },
            { $push: { comments: newComment } },
            { upsert: true }
        );

        res.status(201).json({ message: 'Comment saved', comment: newComment });
    } catch (err) {
        console.error("Error writing comments:", err);
        res.status(500).json({ error: 'Failed to save comment' });
    }
};

module.exports = { getComments, createComment };