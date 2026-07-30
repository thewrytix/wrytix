const express = require('express');
const { getUsers, getUserById, createUser, updateUser, deleteUser, getPendingUsers, getPendingUserById, createPendingUser, deletePendingUser,
    assignLineManager,
    assignEditorCategories
} = require('../controllers/userController');
const { requireAdmin, requireEditorOrAdmin } = require('../middleware/auth');
const { upload } = require('../config/middleware');
const { getVisitAnalytics } = require('../controllers/analyticsController');


const router = express.Router();

router.get('/users/analytics', requireAdmin, getVisitAnalytics);
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