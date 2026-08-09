// routes/dashboard.js
const express = require('express');
const { getDashboardStats } = require('../controllers/dashboardController');
const { verifySession } = require('../middleware/rbac');

const router = express.Router();
router.get('/dashboard-stats', verifySession, getDashboardStats);

module.exports = router;