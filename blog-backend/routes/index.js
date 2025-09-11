const express = require('express');
const authRoutes = require('./auth');
const postRoutes = require('./posts');
const userRoutes = require('./users');
const adRoutes = require('./ads');
const commentRoutes = require('./comments');
const adminRoutes = require('./admin');
const marketDataRoutes = require('./marketData');

const router = express.Router();

router.use(authRoutes);
router.use(postRoutes);
router.use(userRoutes);
router.use(adRoutes);
router.use(commentRoutes);
router.use(adminRoutes);
router.use(marketDataRoutes);

module.exports = router;