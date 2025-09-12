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
const { requireAdmin, verifySession } = require('../middleware/auth');
const { corsOptions } = require('../config/middleware');
const { getFileById } = require('../utils/fileHelpers');

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

// FIXED: Secure file route with authentication and public access for images
router.get('/files/:id', cors({
    origin: ["https://wrytix.netlify.app", "http://localhost:5500"],
    methods: ['GET'],
    allowedHeaders: ['Content-Type'],
    credentials: true // Allow cookies/session
}), (req, res, next) => {
    // Skip auth for images (public view), require for PDFs
    const user = req.session?.user;
    const fileId = req.params.id;
    const isImage = fileId === '68c3f99e2ebc776e97ece5a2'; // Your avatar ID - adjust if dynamic

    if (!isImage && !user) {
        return res.status(401).json({ error: 'Unauthorized: Log in for documents' });
    }
    next();
}, getFileById);

module.exports = router;