// config/database.config.js
const mongoose = require('mongoose');
const { logger } = require('./logger');

// ============================================================
// 1. CONNECT TO DATABASE
// ============================================================
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);

        // --- Connection Events ---
        mongoose.connection.on('error', (err) => {
            logger.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('⚠️ MongoDB disconnected');
        });

        // --- Optional: Handle reconnection ---
        mongoose.connection.on('reconnected', () => {
            logger.info('✅ MongoDB reconnected');
        });

        return conn;
    } catch (error) {
        logger.error('❌ Failed to connect to MongoDB:', error);
        process.exit(1);
    }
};

// ============================================================
// 2. DISCONNECT FROM DATABASE
// ============================================================
const disconnectDB = async () => {
    try {
        await mongoose.connection.close();
        logger.info('✅ MongoDB disconnected successfully');
    } catch (error) {
        logger.error('❌ Error disconnecting from MongoDB:', error);
    }
};

// ============================================================
// 3. GET CONNECTION STATUS
// ============================================================
const getConnectionStatus = () => {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };
    return states[mongoose.connection.readyState] || 'unknown';
};

// ============================================================
// 4. EXPORT
// ============================================================
module.exports = { connectDB, disconnectDB, getConnectionStatus };