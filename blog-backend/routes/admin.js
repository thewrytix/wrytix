const express = require('express');
const cors = require('cors');
const {
    getHeadline,
    updateHeadline,
    approveUser,
    approveUserById,
    createPendingDeletion,
    getPendingDeletions,
    approveDeletion,
    rejectDeletion,
    cancelDeletion,
    getLogs,
    clearLogs
} = require('../controllers/adminController');
const { requireAdmin, requireSuperAdmin, verifySession } = require('../middleware/auth'); // Added requireSuperAdmin
const { corsOptions } = require('../config/middleware');
const { getFileById } = require('../utils/fileHelpers');
const { User } = require('../models'); // Added User model import
const { logAction } = require('../utils/logger'); // Moved outside debug route

const router = express.Router();

// Existing routes
router.get('/headline', getHeadline);
router.put('/headline', updateHeadline);
router.post('/approve-user', requireAdmin, approveUser);
router.post('/pendingUsers/:id/approve', requireAdmin, approveUserById);
router.post('/pendingDeletions', verifySession, createPendingDeletion);
router.get('/pendingDeletions', verifySession, getPendingDeletions);
router.post('/pendingDeletions/:id/approve', requireAdmin, approveDeletion);
router.post('/pendingDeletions/:id/reject', requireAdmin, rejectDeletion);
router.delete('/pendingDeletions/:id', cancelDeletion);
router.get('/logs', getLogs);
router.delete('/logs', clearLogs);
router.get('/files/:id', cors(corsOptions), getFileById);

// Administrator management routes (Super Admin only)
router.get('/administrators', requireSuperAdmin, async (req, res) => {
    try {
        const administrators = await User.find({ role: 'administrator' })
            .select('-password')
            .lean();
        res.json(administrators);
    } catch (err) {
        console.error('Error fetching administrators:', err);
        res.status(500).json({ error: 'Failed to fetch administrators' });
    }
});

router.post('/administrators', requireSuperAdmin, async (req, res) => {
    try {
        const { fullname, username, email, password } = req.body;

        if (!fullname || !username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });
        if (existingUser) {
            return res.status(400).json({
                error: 'Email or username already exists'
            });
        }

        const administrator = new User({
            fullname,
            username,
            email,
            password,
            role: 'administrator',
            status: 'active'
        });

        await administrator.save();
        await logAction(req.session.user._id, 'create_administrator', `Created administrator ${administrator._id}`);

        const { password: _, ...adminResponse } = administrator.toObject();
        res.status(201).json(adminResponse);
    } catch (err) {
        console.error('Error creating administrator:', err);
        res.status(500).json({ error: 'Failed to create administrator' });
    }
});

router.put('/administrators/:id', requireSuperAdmin, async (req, res) => {
    try {
        const { fullname, username, email } = req.body;

        const administrator = await User.findById(req.params.id);
        if (!administrator || administrator.role !== 'administrator') {
            return res.status(404).json({ error: 'Administrator not found' });
        }

        const updatedAdmin = await User.findByIdAndUpdate(
            req.params.id,
            { fullname, username, email },
            { new: true, runValidators: true }
        ).select('-password');

        await logAction(req.session.user._id, 'update_administrator', `Updated administrator ${req.params.id}`);
        res.json(updatedAdmin);
    } catch (err) {
        console.error('Error updating administrator:', err);
        res.status(500).json({ error: 'Failed to update administrator' });
    }
});

router.delete('/administrators/:id', requireSuperAdmin, async (req, res) => {
    try {
        const administrator = await User.findById(req.params.id);
        if (!administrator || administrator.role !== 'administrator') {
            return res.status(404).json({ error: 'Administrator not found' });
        }

        await User.findByIdAndDelete(req.params.id);
        await logAction(req.session.user._id, 'delete_administrator', `Deleted administrator ${req.params.id}`);

        res.json({ message: 'Administrator deleted successfully' });
    } catch (err) {
        console.error('Error deleting administrator:', err);
        res.status(500).json({ error: 'Failed to delete administrator' });
    }
});

// Debug route
router.get('/debug/timecheck', async (req, res) => {
    try {
        const { Post } = require('../models');
        const posts = await Post.find().lean();
        const now = new Date();
        const samplePost = posts.length > 0 ? posts[0] : null;

        await logAction(req.session.user?.username, 'timecheck-requested', 'system');
        res.json({
            serverTime: now.toISOString(),
            serverTimeLocal: now.toString(),
            postCount: posts.length,
            samplePost: samplePost ? {
                title: samplePost.title,
                schedule: samplePost.schedule,
                isPublished: new Date(samplePost.schedule) <= now
            } : null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            note: "Remember: /posts filters by schedule, /posts/all shows all"
        });
    } catch (err) {
        await logAction(req.session.user?.username, 'timecheck-failed', 'system', {
            error: err.message
        });
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;