// app.js
const express = require('express');
const path = require('path');
const { setupMiddleware } = require('./config/middleware');
const { corsOptions } = require('./config/cors');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { logAction } = require('./config/logger');

const app = express();

// 1. Pre‑route middleware (helmet, cors, body parser, session, logger, rate limits)
setupMiddleware(app);

// 2. Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/posts', express.static(path.join(__dirname, 'public', 'posts')));

// 3. Routes (session is now available)
app.use(routes);

// 4. Health & ping (optional – can be here or in routes)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});
app.get('/ping', (req, res) => {
    logAction(req.session?.user?.username, 'ping', 'admin');
    res.json({ message: 'Backend is alive!!!' });
});

// 5. Error handlers – MUST be after all routes
app.use(notFound);
app.use(errorHandler);

module.exports = app;