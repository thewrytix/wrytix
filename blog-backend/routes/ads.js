const express = require('express');
const { requireAdmin } = require('../middleware/rbac');
const {
    createAd,
    getAds,
    getAdById,
    updateAd,
    deleteAd,
    expireOldAds,
    getManagedAds,
    bulkDeleteAds,
    bulkToggleAdsStatus
} = require('../controllers/adController');

const router = express.Router();

// ============================================
//  1️⃣ PUBLIC ROUTES (No authentication)
// ============================================
router.get('/ads', getAds);

// ============================================
//  2️⃣ ADMIN STATIC ROUTES (Exact paths)
//     These MUST come before any /:id routes
// ============================================
router.post('/ads', requireAdmin, createAd);
router.get('/ads/manage', requireAdmin, getManagedAds);      // ⚠️ MUST be before /:id
router.post('/ads/bulk-delete', requireAdmin, bulkDeleteAds);
router.post('/ads/bulk-toggle', requireAdmin, bulkToggleAdsStatus);

// ============================================
//  3️⃣ ADMIN DYNAMIC ROUTES (with :id parameter)
//     These come LAST to avoid catching static paths
// ============================================
router.get('/ads/:id', requireAdmin, getAdById);
router.put('/ads/:id', requireAdmin, updateAd);              // upload.single('file') removed
router.delete('/ads/:id', requireAdmin, deleteAd);

// ============================================
//  4️⃣ BACKGROUND JOB: Expire old ads every 10 min
// ============================================
setInterval(() => {
    expireOldAds().catch(err => console.error('Ad expiry job failed:', err));
}, 10 * 60 * 1000);

// Run once on startup
expireOldAds().catch(err => console.error('Initial ad expiry check failed:', err));

module.exports = router;