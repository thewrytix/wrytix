const express = require('express');
const path = require('path');
require('dotenv').config();
const { connectDB } = require('./config/database');
const { setupMiddleware } = require('./config/middleware');
const setupSession = require('./config/session');
const { logger, logAction } = require('./config/logger');


const app = express();
const PORT = process.env.PORT;

// Setup middleware and session
setupMiddleware(app);
setupSession(app);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve static post pages from the posts directory
app.use('/posts', express.static(path.join(__dirname, 'public', 'posts')));



// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Ping endpoint
app.get('/ping', (req, res) => {
    logAction(req.session?.user?.username, 'ping', 'admin');
    res.json({ message: 'Backend is alive!!!' });
});

// Start server after DB connection
connectDB().then(() => {
    app.listen(PORT, () => {
        logger.info(`✅ Server is running at http://localhost:${PORT}`);
        logger.info(`Current server time: ${new Date().toISOString()}`);
        logAction('admin', 'server-started', `port: ${PORT}`);
    });
});