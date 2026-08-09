const express = require('express');
const {
    getUsers, getUserById, createUser, updateUser, deleteUser, toggleUserStatus,
    getPendingUsers, getPendingUserById, createPendingUser, deletePendingUser,
    assignLineManager, assignEditorCategories, getAuthorsList, getManagedUsers,
    rejectPendingUser, bulkDeleteUsers, updatePendingUser, getEditorsList, approvePendingUser
} = require('../controllers/userController');
const { checkUsername, checkEmail } = require('../middleware/validation');
const { requireAdmin, requireEditorOrAdmin, requireRole, requireLogin } = require('../middleware/rbac');
const { upload } = require('../config/middleware');
const { getVisitAnalytics } = require('../controllers/analyticsController');

const router = express.Router();

// ============ Public/Validation routes ============
router.get('/check-username', checkUsername);
router.get('/check-email', checkEmail);

// ============ User routes ============
// Collection actions
router.get('/users', requireAdmin, getUsers);
router.post('/users', requireEditorOrAdmin, upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
]), createUser);

// Special lists
router.get('/users/editors', requireRole(['admin', 'editor']), getEditorsList);
router.get('/users/authors', requireRole(['admin', 'editor']), getAuthorsList);

// Analytics & management (admin/editor)
router.get('/users/analytics', requireAdmin, getVisitAnalytics);
router.get('/users/manage', requireRole(['admin', 'editor']), getManagedUsers);
router.post('/users/bulk-delete', requireRole(['admin', 'editor']), bulkDeleteUsers);
router.put('/users/assign-line-manager', requireAdmin, assignLineManager);
router.put('/users/assign-categories', requireAdmin, assignEditorCategories);

// Single user actions
router.get('/users/:id', requireLogin, getUserById);
router.put('/users/:id', requireRole(['admin', 'editor']), upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
]), updateUser);
router.delete('/users/:id', requireRole(['admin', 'editor']), deleteUser);
router.put('/users/:id/status', requireRole(['admin', 'editor']), toggleUserStatus);

// ============ Pending User routes ============
// Collection actions
router.get('/pendingUsers', requireEditorOrAdmin, getPendingUsers);
router.post('/pendingUsers', requireEditorOrAdmin, upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
]), createPendingUser);

// Approval / rejection (admin only)
router.post('/pendingUsers/:id/approve', requireAdmin, approvePendingUser);
router.post('/pendingUsers/:id/reject', requireAdmin, rejectPendingUser);

// Single pending user actions (editor/admin)
router.get('/pendingUsers/:id', requireEditorOrAdmin, getPendingUserById);
router.put('/pendingUsers/:id', requireEditorOrAdmin, upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
]), updatePendingUser);
router.delete('/pendingUsers/:id', requireEditorOrAdmin, deletePendingUser);

module.exports = router;