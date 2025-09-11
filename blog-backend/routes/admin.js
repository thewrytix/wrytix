const express = require('express');
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
const { requireAdmin, verifySession } = require('../middleware/auth');

const router = express.Router();

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

router.get('/debug/timecheck', async (req, res) => {
    try {
        const posts = await require('../models/Post').find().lean();
        const now = new Date();
        const samplePost = posts.length > 0 ? posts[0] : null;

        await require('../utils/logger').logAction(req.session.user?.username, 'timecheck-requested', 'system');
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
        await require('../utils/logger').logAction(req.session.user?.username, 'timecheck-failed', 'system', {
            error: err.message
        });
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;