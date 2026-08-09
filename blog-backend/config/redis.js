// config/redis.config.js
const { createClient } = require('redis');   // ✅ imported
const { logger } = require('./logger');

let redisClient = null;

const connectRedis = async () => {
    try {
        redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
        });

        redisClient.on('error', (err) => {
            logger.error('❌ Redis error:', err);
        });

        redisClient.on('connect', () => {
            logger.info('✅ Redis connected successfully');
        });

        redisClient.on('ready', () => {
            logger.info('✅ Redis client ready');
        });

        redisClient.on('end', () => {
            logger.warn('⚠️ Redis connection closed');
        });

        redisClient.on('reconnecting', () => {
            logger.warn('🔄 Redis reconnecting...');
        });

        await redisClient.connect();
        return redisClient;
    } catch (error) {
        logger.error('❌ Failed to connect to Redis:', error);
        return null;
    }
};

const getRedisClient = () => {
    if (!redisClient) {
        logger.warn('⚠️ Redis client not connected. Call connectRedis() first.');
        return null;
    }
    return redisClient;
};

const disconnectRedis = async () => {
    try {
        if (redisClient) {
            await redisClient.quit();
            logger.info('✅ Redis disconnected successfully');
            redisClient = null;
        }
    } catch (error) {
        logger.error('❌ Error disconnecting from Redis:', error);
    }
};

const getRedisStatus = () => {
    if (!redisClient) return 'disconnected';
    const states = {
        'ready': 'connected',
        'connecting': 'connecting',
        'reconnecting': 'reconnecting',
        'end': 'disconnected',
    };
    return states[redisClient.status] || 'unknown';
};

module.exports = {
    connectRedis,
    getRedisClient,
    disconnectRedis,
    getRedisStatus,
};