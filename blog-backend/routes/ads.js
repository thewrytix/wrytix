const express = require('express');
const { requireAdmin, requireEditorOrAdmin } = require('../middleware/auth');
const { createAd, getAds, getAdById, updateAd, deleteAd } = require('../controllers/adController');
const { upload } = require('../config/middleware');  // Fixed: Import upload directly (no function call)

const router = express.Router();

router.post('/ads', requireAdmin, createAd);
router.get('/ads', getAds);
router.get('/ads/:id', requireAdmin, getAdById);
router.put('/ads/:id', requireAdmin, upload.single('file'), updateAd);
router.delete('/ads/:id', requireAdmin, deleteAd);

// Auto-refresh ad status every 10 minutes
setInterval(async () => {
    try {
        await getAds();
    } catch (error) {
        console.error('Error in ad auto-refresh interval:', error);
    }
}, 10 * 60 * 1000);

module.exports = router;