const express = require('express');
const { connectDB } = require('./config/database');
const { setupMiddleware } = require('./config/middleware');
const setupSession = require('./config/session');
const routes = require('./routes');
const { logAction } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup middleware and session
setupMiddleware(app);
setupSession(app);

// Setup routes
app.use(routes);

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
    res.json({ message: 'Backend is alive!' });
});

// Start server after DB connection
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`✅ Server is running at http://localhost:${PORT}`);
        console.log(`Current server time: ${new Date().toISOString()}`);
        logAction('admin', 'server-started', `port: ${PORT}`);
    });
});