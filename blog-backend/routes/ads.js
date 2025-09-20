const express = require('express');

console.log('=== Loading ads routes ===');

// Test controller import
try {
    const { createAd, getAds, getAdById, updateAd, deleteAd } = require('../controllers/adController');
    console.log('Controller functions imported successfully:');
    console.log('- createAd:', typeof createAd);
    console.log('- getAds:', typeof getAds);
    console.log('- getAdById:', typeof getAdById);
    console.log('- updateAd:', typeof updateAd);
    console.log('- deleteAd:', typeof deleteAd);
} catch (error) {
    console.error('=== ERROR importing adController ===');
    console.error('Error:', error.message);
}

const { createAd, getAds, getAdById, updateAd, deleteAd } = require('../controllers/adController');
const { upload } = require('../config/middleware');

const router = express.Router();

console.log('Setting up routes...');

// Add debug middleware to track route hits
router.use('/ads', (req, res, next) => {
    console.log(`=== ${req.method} /ads${req.path} route hit ===`);
    console.log('Full URL:', req.originalUrl);
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);
    next();
});

router.post('/ads', createAd);
router.get('/ads', (req, res, next) => {
    console.log('GET /ads route handler called');
    console.log('About to call getAds controller...');
    getAds(req, res);
});
router.get('/ads/:id', getAdById);
router.put('/ads/:id', upload.single('file'), updateAd);
router.delete('/ads/:id', deleteAd);

console.log('Routes registered successfully');

// Comment out the problematic interval for now
/*
setInterval(async () => {
    try {
        await getAds();
    } catch (error) {
        console.error('Error in ad auto-refresh interval:', error);
    }
}, 10 * 60 * 1000);
*/

console.log('Ads routes module ready to export');

module.exports = router;