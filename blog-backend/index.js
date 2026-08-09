const express = require('express');
const path = require('path');
require('dotenv').config();
const { connectDB } = require('./config/database');
const { setupMiddleware } = require('./config/middleware');
const setupSession = require('./config/session');
const routes = require('./routes');
const { logger, logAction } = require('./config/logger');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const {upload} = require("./config/multer"); // ✅ added

const app = express();
const PORT = process.env.PORT;

// Setup middleware and session
setupMiddleware(app);
setupSession(app);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve static post pages from the posts directory
app.use('/posts', express.static(path.join(__dirname, 'public', 'posts')));

// Setup routes
app.use(routes);

// --- Error Handling (LAST - before return) ---
app.use(notFound);
app.use(errorHandler);

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
        console.log(`✅ Server is running at http://localhost:${PORT}`);
        console.log(`Current server time: ${new Date().toISOString()}`);
        logAction('admin', 'server-started', `port: ${PORT}`);
    });
});