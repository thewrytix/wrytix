const express = require('express');
const router = express.Router();
const { sendContactEmail } = require('../controllers/contactController');

router.post('/contact', (req, res) => {
    console.log('🚀 Contact endpoint hit:', {
        method: req.method,
        url: req.url,
        body: req.body
    });
    sendContactEmail(req, res);
});

module.exports = router;