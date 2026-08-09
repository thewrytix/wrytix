// middleware/errorHandler.js
const { logger,logAction } = require('../config/logger');
const { AppError } = require('../utils/appError');

// ============================================================
// 1. 404 NOT FOUND HANDLER
//    Catches routes that don't exist
//    Passes to errorHandler with 404 status
// ============================================================
const notFound = (req, res, next) => {
    next(new AppError(`Route ${req.originalUrl} not found`, 404));
};

// ============================================================
// 2. GLOBAL ERROR HANDLER
//    Catches ALL errors passed via next(err) or thrown in routes
//    Must be the LAST middleware in your app
// ============================================================
const errorHandler = (err, req, res, next) => {
    // --- Prevent double response if headers already sent ---
    if (res.headersSent) {
        return next(err);
    }

    // --- Determine environment and status code ---
    const isDev = process.env.NODE_ENV !== 'production';
    const statusCode = err.statusCode || 500;

    // --- Log the error ---
    const logMessage = `[${req.method}] ${req.originalUrl} - ${statusCode} - ${err.message}`;

    if (statusCode >= 500) {
        // Server errors (500+) - log with full stack trace
        logger.error(logMessage, {
            stack: err.stack,
            ip: req.ip,
            user: req.user?.id || 'anonymous',
            url: req.originalUrl,
            method: req.method,
            body: req.body,
        });
    } else {
        // Client errors (400-499) - log as warning
        logger.warn(logMessage, {
            ip: req.ip,
            user: req.user?.id || 'anonymous',
            url: req.originalUrl,
            method: req.method,
        });
    }

    // --- Build error response ---
    const message = isDev
        ? err.message || 'Something went wrong'
        : statusCode === 500
            ? 'Something went wrong. Please try again later.'
            : err.message || 'Internal Server Error';

    // --- Send JSON error response ---
    res.status(statusCode).json({
        success: false,
        message,
        // Include stack trace ONLY in development
        ...(isDev && { stack: err.stack }),
        // Include error details in development
        ...(isDev && { error: err }),
    });
};

// ============================================================
// 3. EXPORT
// ============================================================
module.exports = {
    notFound,
    errorHandler,
    AppError, // Re-export for convenience
};