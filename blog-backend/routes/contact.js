const express = require('express');
const router = express.Router();
const { sendContactEmail } = require('../controllers/contactController');

router.post('/contact', (req, res) => {
    sendContactEmail(req, res);
});

module.exports = router;