const express = require('express');
const {
    getSystemHealth,
    getMaintenanceMode,
    setMaintenanceMode,
    getTasks,
    createTask,
    updateTask,
    deleteTask
} = require('../controllers/systemController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/system/health', requireAdmin, getSystemHealth);
router.get('/system/maintenance', requireAdmin, getMaintenanceMode);
router.put('/system/maintenance', requireAdmin, setMaintenanceMode);

router.get('/system/tasks', requireAdmin, getTasks);
router.post('/system/tasks', requireAdmin, createTask);
router.put('/system/tasks/:id', requireAdmin, updateTask);
router.delete('/system/tasks/:id', requireAdmin, deleteTask);

module.exports = router;