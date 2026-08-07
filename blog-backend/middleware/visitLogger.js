const { Visit } = require('../models');
const { getCountryFromIp } = require('../utils/geo');

const logVisit = (req, res, next) => {
    const ip = (req.headers['x-forwarded-for']?.split(',')[0].trim()) || req.ip || req.connection?.remoteAddress;
    const country = getCountryFromIp(ip);

    Visit.create({
        path: req.originalUrl,
        userId: req.session?.user?.username || null,
        ip,
        country,
        userAgent: req.headers['user-agent'] || 'unknown'
    }).catch(err => console.error('Visit logging failed (non-fatal):', err.message));

    next();
};

module.exports = { logVisit };