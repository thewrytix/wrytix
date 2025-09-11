const express = require('express');
const { createAd, getAds, getAdById, updateAd, deleteAd } = require('../controllers/adController');
const { upload } = require('../config/multer'); // Fixed: Import from multer config directly

const router = express.Router();

router.post('/ads', createAd);
router.get('/ads', getAds);
router.get('/ads/:id', getAdById);
router.put('/ads/:id', upload.single('file'), updateAd);
router.delete('/ads/:id', deleteAd);

// Auto-refresh ad status every 10 minutes (this now calls the controller function)
setInterval(async () => {
    await getAds();
}, 10 * 60 * 1000);

module.exports = router;