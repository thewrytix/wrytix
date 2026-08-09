require('dotenv').config();
const app = require('./app');
const mongoose = require('mongoose');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');   // ✅ your Redis config
const { logger } = require('./config/logger');

const PORT = process.env.PORT;
let server = null;

const startServer = async () => {
    try {
        await connectDB();
        logger.info('✅ Database connected');
        await connectRedis();
        logger.info('✅ Redis connected');

        server = app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🌐 URL: http://localhost:${PORT}`);
        });
    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

const gracefulShutdown = async (signal) => {
    logger.warn(`⚠️ Received ${signal}, shutting down gracefully...`);

    if (server) {
        server.close(() => {
            logger.info('✅ HTTP server closed');
        });
        // Force close after 10 seconds if not closed
        setTimeout(() => {
            logger.error('❌ Force closing connections...');
            process.exit(1);
        }, 10000);
    }

    try {
        await mongoose.connection.close();
        logger.info('✅ Database connection closed');
    } catch (err) {
        logger.error('❌ Error closing database:', err);
    }

    process.exit(0);
};

// --- Process event handlers ---
process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Rejection at:', promise);
    logger.error('💥 Reason:', reason);
    gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();