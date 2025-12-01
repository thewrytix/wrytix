// middleware/nodemailerSafe.js
const { NodemailerSecurity } = require('../utils/escapeHtml');

const nodemailerSafeMiddleware = (req, res, next) => {
    // Check if request contains email fields
    const checkObject = (obj) => {
        for (const [key, value] of Object.entries(obj)) {
            if (key.toLowerCase().includes('email') && typeof value === 'string') {
                if (!NodemailerSecurity.isEmailSafe(value)) {
                    return false;
                }
            }
            // Recursively check nested objects
            if (value && typeof value === 'object') {
                if (!checkObject(value)) return false;
            }
        }
        return true;
    };

    if (!checkObject(req.body) || !checkObject(req.query)) {
        return res.status(400).json({
            error: 'Invalid input detected'
        });
    }

    next();
};

module.exports = nodemailerSafeMiddleware;