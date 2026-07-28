const express = require('express');
const { getHeadline, updateHeadline } = require('../controllers/headlineController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/headline', getHeadline);
router.put('/headline', requireAdmin, updateHeadline);

module.exports = router;