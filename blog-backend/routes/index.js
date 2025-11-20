const express = require('express');
const authRoutes = require('./auth');
const postRoutes = require('./posts');
const userRoutes = require('./users');
const adRoutes = require('./ads');
const commentRoutes = require('./comments');
const adminRoutes = require('./admin');
const marketDataRoutes = require('./marketData');
const footballDataRoutes = require('./footballData');
const exchangeRateRoutes = require('./exchangeRates');
const categoryRoutes = require('./category');
const contactRoutes = require('./contact');


const router = express.Router();






router.use(authRoutes);
router.use(postRoutes);
router.use(userRoutes);
router.use(categoryRoutes);
router.use(adRoutes);
router.use(commentRoutes);
router.use(adminRoutes);
router.use(exchangeRateRoutes);
router.use(marketDataRoutes);
router.use('/standings', footballDataRoutes);
router.use(contactRoutes);

module.exports = router;