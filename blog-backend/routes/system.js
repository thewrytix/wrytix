const express = require('express');
const {
    getSystemHealth,
    getMaintenanceMode,
    setMaintenanceMode,
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    reloadSystem,
    restartSystem
} = require('../controllers/systemController');
const { requireAdmin } = require('../middleware/rbac');

const router = express.Router();

// ✅ New admin‑only routes
router.post('/system/reload', requireAdmin, reloadSystem);
router.post('/system/restart', requireAdmin, restartSystem);

router.get('/system/health', requireAdmin, getSystemHealth);
router.get('/system/maintenance', requireAdmin, getMaintenanceMode);
router.put('/system/maintenance', requireAdmin, setMaintenanceMode);

router.get('/system/tasks', requireAdmin, getTasks);
router.post('/system/tasks', requireAdmin, createTask);
router.put('/system/tasks/:id', requireAdmin, updateTask);
router.delete('/system/tasks/:id', requireAdmin, deleteTask);

module.exports = router;