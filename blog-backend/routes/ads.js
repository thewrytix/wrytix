const express = require('express');
const { requireAdmin, requireEditorOrAdmin } = require('../middleware/auth');
const { createAd, getAds, getAdById, updateAd, deleteAd, expireOldAds } = require('../controllers/adController');

const router = express.Router();

router.post('/ads', requireAdmin, createAd);
router.get('/ads', getAds);
router.get('/ads/:id', requireAdmin, getAdById);
router.put('/ads/:id', requireAdmin, updateAd); // upload.single('file') removed — no longer needed
router.delete('/ads/:id', requireAdmin, deleteAd);

// Background expiry check — runs independently of any request
setInterval(() => {
    expireOldAds().catch(err => console.error('Ad expiry job failed:', err));
}, 10 * 60 * 1000);

expireOldAds().catch(err => console.error('Initial ad expiry check failed:', err));

module.exports = router;