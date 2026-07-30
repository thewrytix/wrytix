const express = require('express');
const {
    getUsers, getUserById, createUser, updateUser, deleteUser,
    getPendingUsers, getPendingUserById, createPendingUser, deletePendingUser,
    assignLineManager, assignEditorCategories,
    getManagedUsers, bulkDeleteUsers
} = require('../controllers/userController');
const { requireAdmin, requireEditorOrAdmin, requireRole } = require('../middleware/auth');
const { upload } = require('../config/middleware');
const { getVisitAnalytics } = require('../controllers/analyticsController');

const router = express.Router();

// Specific routes FIRST — before any /users/:id or /pendingUsers/:id
router.get('/users/analytics', requireAdmin, getVisitAnalytics);
router.get('/users/manage', requireRole(['admin', 'editor']), getManagedUsers);
router.post('/users/bulk-delete', requireAdmin, bulkDeleteUsers);
router.put('/users/assign-line-manager', requireAdmin, assignLineManager);
router.put('/users/assign-categories', requireAdmin, assignEditorCategories);

router.get('/users', requireAdmin, getUsers);
router.get('/users/:id', requireAdmin, getUserById);
router.post('/users', requireAdmin, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), createUser);
router.put('/users/:id', requireAdmin, upload.none(), updateUser);
router.delete('/users/:id', requireAdmin, deleteUser);

router.get('/pendingUsers', requireAdmin, getPendingUsers);
router.get('/pendingUsers/:id', requireAdmin, getPendingUserById);
router.post('/pendingUsers', requireEditorOrAdmin, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), createPendingUser);
router.delete('/pendingUsers/:id', requireAdmin, deletePendingUser);

module.exports = router;