const express = require('express');
const {
    getUsers, getUserById, createUser, updateUser, deleteUser, toggleUserStatus,
    getPendingUsers, getPendingUserById, createPendingUser, deletePendingUser,
    assignLineManager, assignEditorCategories, getManagedUsers, bulkDeleteUsers, getEditorsList, approvePendingUser
} = require('../controllers/userController');
const { checkUsername, checkEmail } = require('../middleware/validation');
const { requireAdmin, requireEditorOrAdmin, requireRole, requireLogin } = require('../middleware/auth');
const { upload } = require('../config/middleware');
const { getVisitAnalytics } = require('../controllers/analyticsController');

const router = express.Router();

router.get('/check-username', checkUsername);
router.get('/check-email', checkEmail);

router.get('/users/analytics', requireAdmin, getVisitAnalytics);
router.get('/users/manage', requireRole(['admin', 'editor']), getManagedUsers);
router.get('/users/editors', requireRole(['admin', 'editor']), getEditorsList);
router.post('/users/bulk-delete', requireRole(['admin', 'editor']), bulkDeleteUsers);
router.put('/users/assign-line-manager', requireAdmin, assignLineManager);
router.put('/users/assign-categories', requireAdmin, assignEditorCategories);

router.get('/users', requireAdmin, getUsers);
router.post('/users', requireAdmin, upload.fields([
    { name: 'avatar', maxCount: 1 }, { name: 'pdf', maxCount: 1 }
]), createUser);

router.put('/users/:id/status', requireRole(['admin', 'editor']), toggleUserStatus); // NEW
router.get('/users/:id', requireLogin, getUserById);
router.put('/users/:id', requireRole(['admin', 'editor']), upload.fields([          // FIX: was upload.none(), now supports file replacement
    { name: 'avatar', maxCount: 1 }, { name: 'pdf', maxCount: 1 }
]), updateUser);
router.delete('/users/:id', requireRole(['admin', 'editor']), deleteUser);

router.get('/pendingUsers', requireEditorOrAdmin, getPendingUsers);
router.post('/pendingUsers', requireEditorOrAdmin, upload.fields([
    { name: 'avatar', maxCount: 1 }, { name: 'pdf', maxCount: 1 }
]), createPendingUser);


router.get('/pendingUsers/:id', requireEditorOrAdmin, getPendingUserById);
router.delete('/pendingUsers/:id', requireEditorOrAdmin, deletePendingUser);
router.post('/pendingUsers/:id/approve', requireAdmin, approvePendingUser);

module.exports = router;