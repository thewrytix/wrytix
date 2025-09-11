const { Log } = require('../models');

const logAction = async (actor, action, target, additionalData = {}) => {
    const newLog = {
        id: Date.now().toString(),
        actor: actor || 'system',
        action,
        target: target || '',
        timestamp: new Date(),
        ip: additionalData.ip || '',
        userAgent: additionalData.userAgent || '',
        ...additionalData
    };
    await require('./jsonHelpers').writeDocument(Log, newLog);
    return newLog;
};

module.exports = { logAction };