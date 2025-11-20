const express = require('express');
const router = express.Router();

console.log('📧 Loading contact routes...');

try {
    const { sendContactEmail } = require('../controllers/contactController');
    console.log('✅ Contact controller imported successfully');

    router.post('/contact', sendContactEmail);
    console.log('✅ Contact route registered: POST /contact');

} catch (error) {
    console.error('❌ Error loading contact routes:', error);
}

module.exports = router;