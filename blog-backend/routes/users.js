const express = require('express');
const {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getPendingUsers,
    getPendingUserById,
    createPendingUser,
    deletePendingUser,
    assignLineManager,
    assignEditorCategories,
    getManagedUsers,
    bulkDeleteUsers,
    getEditorsList
} = require('../controllers/userController');
const { checkUsername, checkEmail } = require('../middleware/validation'); 
const { requireAdmin, requireEditorOrAdmin, requireRole, requireLogin } = require('../middleware/auth');
const { upload } = require('../config/middleware');
const { getVisitAnalytics } = require('../controllers/analyticsController');

const router = express.Router();

// ============================================================
//  1️⃣ Availability checks — public-ish, needed by the add-user form
// ============================================================
router.get('/check-username', checkUsername);
router.get('/check-email', checkEmail);

// ============================================================
//  2️⃣ ADMIN UTILITY ROUTES — before any /:id wildcard routes
// ============================================================
router.get('/users/analytics', requireAdmin, getVisitAnalytics);
router.get('/users/manage', requireRole(['admin', 'editor']), getManagedUsers);
router.get('/users/editors', requireRole(['admin', 'editor']), getEditorsList);
router.post('/users/bulk-delete', requireAdmin, bulkDeleteUsers);
router.put('/users/assign-line-manager', requireAdmin, assignLineManager);
router.put('/users/assign-categories', requireAdmin, assignEditorCategories);

// ============================================================
//  3️⃣ MAIN USER CRUD ROUTES
// ============================================================
router.get('/users', requireAdmin, getUsers);
router.post('/users', requireAdmin, upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
]), createUser);

router.get('/users/:id', requireLogin, getUserById);
router.put('/users/:id', requireAdmin, upload.none(), updateUser);
router.delete('/users/:id', requireAdmin, deleteUser);

// ============================================================
//  4️⃣ PENDING USER ROUTES
// ============================================================
router.get('/pendingUsers', requireAdmin, getPendingUsers);
router.post('/pendingUsers', requireEditorOrAdmin, upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
]), createPendingUser);

router.get('/pendingUsers/:id', requireAdmin, getPendingUserById);
router.delete('/pendingUsers/:id', requireAdmin, deletePendingUser);

module.exports = router;