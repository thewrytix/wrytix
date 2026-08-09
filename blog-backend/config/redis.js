// config/redis.config.j
const { logger } = require('./logger');

// ============================================================
// 1. REDIS CLIENT
// ============================================================
let redisClient = null;

// ============================================================
// 2. CONNECT TO REDIS
// ============================================================
const connectRedis = async () => {
    try {
        // --- Create Redis Client ---
        redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
        });

        // --- Event Handlers ---
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

        // --- Connect to Redis ---
        await redisClient.connect();
        return redisClient;
    } catch (error) {
        logger.error('❌ Failed to connect to Redis:', error);
        // Don't exit process — app can run without Redis (fallback to memory)
        // This is useful for development or when Redis is temporarily unavailable
        return null;
    }
};

// ============================================================
// 3. GET REDIS CLIENT
// ============================================================
const getRedisClient = () => {
    if (!redisClient) {
        logger.warn('⚠️ Redis client not connected. Call connectRedis() first.');
        return null;
    }
    return redisClient;
};

// ============================================================
// 4. DISCONNECT FROM REDIS
// ============================================================
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

// ============================================================
// 5. GET CONNECTION STATUS
// ============================================================
const getRedisStatus = () => {
    if (!redisClient) {
        return 'disconnected';
    }
    const states = {
        'ready': 'connected',
        'connecting': 'connecting',
        'reconnecting': 'reconnecting',
        'end': 'disconnected',
    };
    return states[redisClient.status] || 'unknown';
};

// ============================================================
// 6. EXPORT
// ============================================================
module.exports = {
    connectRedis,
    getRedisClient,
    disconnectRedis,
    getRedisStatus,
};