const express = require('express');
const { requireAdmin, requireEditorOrAdmin } = require('../middleware/auth');
const { createAd, getAds, getAdById, updateAd, deleteAd, expireOldAds, getManagedAds, bulkDeleteAds, bulkToggleAdsStatus } = require('../controllers/adController');

const router = express.Router();

router.post('/ads', requireAdmin, createAd);
router.get('/ads', getAds);
router.get('/ads/:id', requireAdmin, getAdById);
router.put('/ads/:id', requireAdmin, updateAd); // upload.single('file') removed — no longer needed
router.delete('/ads/:id', requireAdmin, deleteAd);
router.get('/ads/manage', requireAdmin, getManagedAds);
router.post('/ads/bulk-delete', requireAdmin, bulkDeleteAds);
router.post('/ads/bulk-toggle', requireAdmin, bulkToggleAdsStatus);

setInterval(() => {
    expireOldAds().catch(err => console.error('Ad expiry job failed:', err));
}, 10 * 60 * 1000);

expireOldAds().catch(err => console.error('Initial ad expiry check failed:', err));

module.exports = router;