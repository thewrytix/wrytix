const express = require('express');
const { create, getAll, getById, update, deleteRole, getUsersByRole} = require('../controllers/roleController');
const { requireSuperAdmin, requireHierarchyLevel } = require('../middleware/auth');

const router = express.Router();

// Role management routes
router.get('/roles', requireHierarchyLevel(4), getAll);
router.get('/roles/:id', requireHierarchyLevel(4), getById);
router.post('/roles', requireSuperAdmin, create);
router.put('/roles/:id', requireSuperAdmin, update);
router.delete('/roles/:id', requireSuperAdmin, deleteRole);

// User-role management
router.get('/roles/:roleName/users', requireHierarchyLevel(5), getUsersByRole);

module.exports = router;