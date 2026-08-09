const { Log } = require('../models');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { writeDocument } = require('../utils/jsonHelpers');   // adjust path if needed

// ============================================================
// 1. WINSTON LOGGER (exported directly)
// ============================================================

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
    })
);

const dailyRotateTransport = new DailyRotateFile({
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
        ...(process.env.NODE_ENV === 'production' ? [
            dailyRotateTransport,
            new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
            }),
        ] : []),
    ],
});

// ============================================================
// 2. AUDIT LOG ACTION (uses logger internally)
// ============================================================

const logAction = async (actor, action, target, additionalData = {}) => {
    const newLog = {
        id: Date.now().toString(),
        actor: actor || 'system',
        action,
        target: target || '',
        timestamp: new Date(),
        ip: additionalData.ip || '',
        userAgent: additionalData.userAgent || '',
        ...additionalData,
    };

    // MongoDB
    await writeDocument(Log, newLog);

    // Winston (file + console)
    logger.info(`[AUDIT] ${actor} -> ${action} on ${target}`, { ...newLog });

    return newLog;
};

// ============================================================
// 3. EXPORT – BOTH
// ============================================================

module.exports = {
    logger,      // Winston logger for general server logging
    logAction,   // Audit logger for user actions (MongoDB + Winston)
};