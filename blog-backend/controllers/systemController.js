const mongoose = require('mongoose');
const https = require('https');
const { MaintenanceTask, SystemConfig, User } = require('../models');
const { logAction } = require('../utils/logger');

/* ============================================
   System Health
   ============================================ */



// Ping a URL and measure response time, with a timeout so a hung service doesn't hang the whole health check
const checkEndpoint = (url, timeoutMs = 5000) => {
    return new Promise((resolve) => {
        const start = Date.now();
        const req = https.get(url, { timeout: timeoutMs }, (res) => {
            const duration = Date.now() - start;
            res.resume(); // drain response, don't need the body
            resolve({
                status: res.statusCode < 500 ? 'up' : 'down',
                statusCode: res.statusCode,
                responseTimeMs: duration
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ status: 'down', statusCode: null, responseTimeMs: timeoutMs, error: 'timeout' });
        });

        req.on('error', (err) => {
            resolve({ status: 'down', statusCode: null, responseTimeMs: Date.now() - start, error: err.message });
        });
    });
};

const checkCloudinary = async () => {
    try {
        // Lightweight check: Cloudinary's status/ping isn't a public unauthenticated endpoint,
        // so we check reachability of the API host itself as a proxy for "is Cloudinary reachable"
        const result = await checkEndpoint('https://api.cloudinary.com/v1_1/ping', 5000);
        return result;
    } catch (err) {
        await logAction(req.session.user.username, 'check-claudinary-error', req.params.id, { error: err.message });
        return { status: 'down', error: err.message };
    }
};

const getSystemHealth = async (req, res) => {
    try {
        const mongoStatus = mongoose.connection.readyState === 1 ? 'up' : 'down';
        const uptimeSeconds = Math.floor(process.uptime());
        const memoryUsage = process.memoryUsage();

        // Internal endpoints — self-checks against our own running server
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const endpointsToCheck = [
            { name: 'Posts API', url: `${baseUrl}/posts` },
            { name: 'Ads API', url: `${baseUrl}/ads` },
            { name: 'Dashboard Stats', url: `${baseUrl}/dashboard-stats` }
        ];

        const [endpointResults, cloudinaryResult] = await Promise.all([
            Promise.all(endpointsToCheck.map(async (ep) => {
                const result = await checkEndpoint(ep.url);
                return { name: ep.name, ...result };
            })),
            checkCloudinary()
        ]);

        res.json({
            express: 'up',
            mongodb: mongoStatus,
            cloudinary: cloudinaryResult.status,
            cloudinaryResponseTimeMs: cloudinaryResult.responseTimeMs || null,
            uptimeSeconds,
            memory: {
                rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
                heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024)
            },
            endpoints: endpointResults,
            timestamp: new Date()
        });
    } catch (err) {
        await logAction(req.session.user.username, 'load-system-health-error', req.params.id, { error: err.message });
        res.status(500).json({ error: 'Failed to load system health' });
    }
};



/* ============================================
   Maintenance Mode
   ============================================ */

const getMaintenanceMode = async (req, res) => {
    try {
        const config = await SystemConfig.findOne().lean();
        res.json({
            maintenanceMode: config?.maintenanceMode || false,
            updatedBy: config?.updatedBy || null,
            updatedAt: config?.updatedAt || null
        });
    } catch (err) {
        await logAction(req.session.user.username, 'load-maintenance-error', req.params.id, { error: err.message });
        res.status(500).json({ error: 'Failed to load maintenance status' });
    }
};


const setMaintenanceMode = async (req, res) => {
    try {
        const { maintenanceMode } = req.body;
        if (typeof maintenanceMode !== 'boolean') {
            return res.status(400).json({ error: 'maintenanceMode must be a boolean' });
        }

        let config = await SystemConfig.findOne();
        if (!config) config = new SystemConfig();

        config.maintenanceMode = maintenanceMode;
        config.updatedBy = req.session.user?.username || 'unknown';
        config.updatedAt = new Date();
        await config.save();

        await logAction(
            req.session.user?.username,
            maintenanceMode ? 'maintenance-mode-enabled' : 'maintenance-mode-disabled',
            'system'
        );

        if (maintenanceMode) {
            // Suspend everyone except admin and viewer, from admin-panel access
            await User.updateMany(
                { role: { $nin: ['admin', 'viewer'] }, status: 'active' },
                { $set: { status: 'suspended-maintenance' } }
            );
        } else {
            // Restore only those suspended BY maintenance mode (not manually suspended for other reasons)
            await User.updateMany(
                { status: 'suspended-maintenance' },
                { $set: { status: 'active' } }
            );
        }

        res.json({ message: 'Maintenance mode updated', maintenanceMode });
    } catch (err) {
        await logAction(req.session.user.username, 'update-maintenance-error', req.params.id, { error: err.message });
        res.status(500).json({ error: 'Failed to update maintenance mode' });
    }
};

/* ============================================
   Maintenance Task Manager
   ============================================ */

const getTasks = async (req, res) => {
    try {
        const tasks = await MaintenanceTask.find().sort({ createdAt: -1 }).lean();
        res.json(tasks);
    } catch (err) {
        await logAction(req.session.user.username, 'load-task-error', req.params.id, { error: err.message });
        res.status(500).json({ error: 'Failed to load tasks' });
    }
};

const createTask = async (req, res) => {
    try {
        const { title, description, priority } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });

        const task = await MaintenanceTask.create({
            title,
            description: description || '',
            priority: ['low', 'medium', 'urgent'].includes(priority) ? priority : 'medium',
            status: 'open',
            createdBy: req.session.user?.username
        });

        await logAction(req.session.user?.username, 'task-created', task.title);
        res.status(201).json({ message: 'Task created', task });
    } catch (err) {
        await logAction(req.session.user.username, 'create-task-error', req.params.id, { error: err.message });
        res.status(500).json({ error: 'Failed to create task' });
    }
};

const updateTask = async (req, res) => {
    try {
        const task = await MaintenanceTask.findById(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const { title, description, priority, status } = req.body;
        if (title !== undefined) task.title = title;
        if (description !== undefined) task.description = description;
        if (priority !== undefined && ['low', 'medium', 'urgent'].includes(priority)) task.priority = priority;
        if (status !== undefined && ['open', 'done'].includes(status)) task.status = status;

        await task.save();
        await logAction(req.session.user?.username, 'task-updated', task.title);

        res.json({ message: 'Task updated', task });
    } catch (err) {
        await logAction(req.session.user.username, 'update-task-error', req.params.id, { error: err.message });
        res.status(500).json({ error: 'Failed to update task' });
    }
};

const deleteTask = async (req, res) => {
    try {
        const task = await MaintenanceTask.findByIdAndDelete(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        await logAction(req.session.user?.username, 'task-deleted', task.title);
        res.json({ message: 'Task deleted' });
    } catch (err) {
        await logAction(req.session.user.username, 'delete-task-error', req.params.id, { error: err.message });
        res.status(500).json({ error: 'Failed to delete task' });
    }
};

module.exports = {
    getSystemHealth,
    getMaintenanceMode,
    setMaintenanceMode,
    getTasks,
    createTask,
    updateTask,
    deleteTask
};