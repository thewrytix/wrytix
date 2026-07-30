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
    bulkDeleteUsers
} = require('../controllers/userController');
const { requireAdmin, requireEditorOrAdmin, requireRole } = require('../middleware/auth');
const { upload } = require('../config/middleware');
const { getVisitAnalytics } = require('../controllers/analyticsController');

const router = express.Router();

// ============================================================
//  1️⃣ ADMIN UTILITY ROUTES (Exact static paths)
//     These MUST come before any /:id wildcard routes
// ============================================================
router.get('/users/analytics', requireAdmin, getVisitAnalytics);
router.get('/users/manage', requireRole(['admin', 'editor']), getManagedUsers);
router.post('/users/bulk-delete', requireAdmin, bulkDeleteUsers);
router.put('/users/assign-line-manager', requireAdmin, assignLineManager);
router.put('/users/assign-categories', requireAdmin, assignEditorCategories);

// ============================================================
//  2️⃣ MAIN USER CRUD ROUTES
//     Static first, then dynamic (/users/:id)
// ============================================================
router.get('/users', requireAdmin, getUsers);                          // List all users
router.post('/users', requireAdmin, upload.fields([                   // Create user with avatar + PDF
    { name: 'avatar', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
]), createUser);

// Dynamic routes (must come after static /users routes)
router.get('/users/:id', requireAdmin, getUserById);
router.put('/users/:id', requireAdmin, upload.none(), updateUser);    // No file upload for updates
router.delete('/users/:id', requireAdmin, deleteUser);

// ============================================================
//  3️⃣ PENDING USER ROUTES
//     Static first, then dynamic (/pendingUsers/:id)
// ============================================================
router.get('/pendingUsers', requireAdmin, getPendingUsers);           // List pending users
router.post('/pendingUsers', requireEditorOrAdmin, upload.fields([   // Create pending user
    { name: 'avatar', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
]), createPendingUser);

// Dynamic routes (must come after static /pendingUsers routes)
router.get('/pendingUsers/:id', requireAdmin, getPendingUserById);
router.delete('/pendingUsers/:id', requireAdmin, deletePendingUser);

module.exports = router;