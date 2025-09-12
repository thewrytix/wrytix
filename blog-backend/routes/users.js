const express = require('express');
const { getUsers, getUserById, createUser, updateUser, deleteUser, getPendingUsers, getPendingUserById, createPendingUser, deletePendingUser } = require('../controllers/userController');
const { requireAdmin, requireEditorOrAdmin } = require('../middleware/auth');
const { upload } = require('../config/middleware');

const router = express.Router();

router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.post('/users', requireAdmin, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), createUser);
router.put('/users/:id', requireAdmin, upload.none(), updateUser);
router.delete('/users/:id', requireAdmin, deleteUser);
router.get('/pendingUsers', getPendingUsers);
router.get('/pendingUsers/:id', getPendingUserById);
router.post('/pendingUsers', requireEditorOrAdmin, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), createPendingUser);
router.delete('/pendingUsers/:id', requireAdmin, deletePendingUser);

module.exports = router;