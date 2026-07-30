const { Visit } = require('../models');

const logVisit = (req, res, next) => {
    // Fire-and-forget — never await this in the request path, never let it fail the request
    Visit.create({
        path: req.originalUrl,
        userId: req.session?.user?.username || null,
        ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
    }).catch(err => {
        console.error('Visit logging failed (non-fatal):', err.message);
    });

    next(); // always continue immediately, don't wait on the DB write
};

module.exports = { logVisit };