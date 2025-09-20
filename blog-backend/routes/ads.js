const express = require('express');
const { createAd, getAds, getAdById, updateAd, deleteAd } = require('../controllers/adController');
const { upload } = require('../config/middleware');  // Fixed: Import upload directly (no function call)

const router = express.Router();

router.post('/ads', createAd);
router.get('/ads', getAds);
router.get('/ads/:id', getAdById);
router.put('/ads/:id', upload.single('file'), updateAd);
router.delete('/ads/:id', deleteAd);

// Auto-refresh ad status every 10 minutes
setInterval(async () => {
    try {
        await getAds();
    } catch (error) {
        console.error('Error in ad auto-refresh interval:', error);
    }
}, 10 * 60 * 1000);

module.exports = router;