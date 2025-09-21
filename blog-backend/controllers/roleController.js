const { Role, User } = require('../models');
const { logAction } = require('../utils/logger');

const readRoles = async () => {
    try {
        const roles = await Role.find().lean();
        const users = await User.find().lean();
        return roles.map(role => {
            const usersWithRole = users.filter(u => u.role === role.name);
            return {
                ...role,
                userCount: usersWithRole.length,
                users: usersWithRole.map(u => ({ id: u.id, name: u.fullname || u.username }))
            };
        });
    } catch (e) {
        console.error('Error reading roles:', e);
        return [];
    }
};

const create = async (req, res) => {
    try {
        const { name, permissions, hierarchyLevel, track, description } = req.body;
        if (!name || !permissions || !hierarchyLevel) {
            await logAction(req.session.user?.username || 'anonymous', 'role-create-failed', 'system', {
                reason: 'Name, permissions or hierarchyLevel missing'
            });
            return res.status(400).json({ error: 'Name, permissions, and hierarchy level are required' });
        }

        // Prevent creating roles at SuperAdmin level
        if (hierarchyLevel >= 7) {
            await logAction(req.session.user?.username || 'anonymous', 'role-create-failed', 'system', {
                reason: 'Attempt to create SuperAdmin level role'
            });
            return res.status(400).json({ error: 'Cannot create roles at SuperAdmin level' });
        }

        // Check if role already exists
        const existingRole = await Role.findOne({ name: name.toLowerCase() });
        if (existingRole) {
            await logAction(req.session.user?.username || 'anonymous', 'role-create-failed', 'system', {
                reason: 'Role already exists'
            });
            return res.status(400).json({ error: 'Role already exists' });
        }

        const role = {
            name: name.toLowerCase(),
            permissions: Array.isArray(permissions) ? permissions : permissions.split(',').map(p => p.trim()),
            hierarchyLevel,
            track: track || 'foundation',
            description: description || '',
            isActive: true,
            createdBy: req.session.user?._id,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await Role.create(role);
        await logAction(req.session.user?.username || 'anonymous', 'role-created', role.name, {
            hierarchyLevel,
            track,
            permissionCount: role.permissions.length
        });

        res.status(201).json({ message: 'Role created successfully', role });
    } catch (error) {
        await logAction(req.session.user?.username || 'anonymous', 'role-create-error', 'system', {
            error: error.message
        });
        res.status(500).json({ error: 'Failed to save role' });
    }
};

const getAll = async (req, res) => {
    try {
        const roles = await readRoles();
        res.json(roles);
    } catch (e) {
        console.error('Error fetching roles:', e);
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
};

const getById = async (req, res) => {
    try {
        const role = await Role.findOne({ _id: req.params.id }).lean();
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }
        const users = await User.find({ role: role.name }).lean();
        const enriched = {
            ...role,
            userCount: users.length,
            users: users.map(u => ({ id: u.id, name: u.fullname || u.username }))
        };
        res.json(enriched);
    } catch (e) {
        console.error('Error fetching role:', e);
        res.status(500).json({ error: 'Failed to load role' });
    }
};

const update = async (req, res) => {
    try {
        const { name, permissions, hierarchyLevel, track, description } = req.body;
        if (!name || !permissions || !hierarchyLevel) {
            await logAction(req.session.user?.username || 'anonymous', 'role-update-failed', req.params.id, {
                reason: 'Name, permissions or hierarchyLevel missing'
            });
            return res.status(400).json({ error: 'Name, permissions, and hierarchy level are required' });
        }

        // Find existing role
        const role = await Role.findOne({ _id: req.params.id }).lean();
        if (!role) {
            await logAction(req.session.user?.username || 'anonymous', 'role-update-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'Role not found' });
        }

        // Prevent modifying SuperAdmin role
        if (role.name === 'super_administrator') {
            await logAction(req.session.user?.username || 'anonymous', 'role-update-failed', req.params.id, {
                reason: 'Attempt to modify SuperAdmin role'
            });
            return res.status(403).json({ error: 'Cannot modify SuperAdmin role' });
        }

        // Prevent escalating to SuperAdmin level
        if (hierarchyLevel >= 7) {
            await logAction(req.session.user?.username || 'anonymous', 'role-update-failed', req.params.id, {
                reason: 'Attempt to escalate to SuperAdmin level'
            });
            return res.status(400).json({ error: 'Cannot set hierarchy level to SuperAdmin or higher' });
        }

        const updatedRole = {
            ...role,
            name: name.toLowerCase(),
            permissions: Array.isArray(permissions) ? permissions : permissions.split(',').map(p => p.trim()),
            hierarchyLevel,
            track: track || role.track,
            description: description || role.description,
            updatedAt: new Date(),
            _id: role._id
        };

        await Role.updateOne({ _id: req.params.id }, updatedRole);
        await logAction(req.session.user?.username || 'anonymous', 'role-updated', updatedRole.name, {
            changes: Object.keys(req.body),
            hierarchyLevel,
            track
        });

        res.json({ message: 'Role updated', role: updatedRole });
    } catch (err) {
        await logAction(req.session.user?.username || 'anonymous', 'role-update-error', req.params.id, {
            error: err.message
        });
        res.status(500).json({ error: 'Server error' });
    }
};

const deleteRole = async (req, res) => {
    try {
        const role = await Role.findOne({ _id: req.params.id }).lean();
        if (!role) {
            await logAction(req.session.user?.username || 'anonymous', 'role-delete-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'Role not found' });
        }

        // Prevent deleting core system roles
        const protectedRoles = ['super_administrator', 'administrator', 'moderator', 'reader', 'author'];
        if (protectedRoles.includes(role.name)) {
            await logAction(req.session.user?.username || 'anonymous', 'role-delete-failed', req.params.id, {
                reason: 'Protected system role'
            });
            return res.status(403).json({ error: 'Cannot delete protected system role' });
        }

        // Check if any users have this role
        const usersWithRole = await User.countDocuments({ role: role.name });
        if (usersWithRole > 0) {
            await logAction(req.session.user?.username || 'anonymous', 'role-delete-failed', req.params.id, {
                reason: 'Users still have this role',
                userCount: usersWithRole
            });
            return res.status(400).json({
                error: `Cannot delete role. ${usersWithRole} users currently have this role`
            });
        }

        await Role.deleteOne({ _id: req.params.id });
        await logAction(req.session.user?.username || 'anonymous', 'role-deleted', role.name, {
            hierarchyLevel: role.hierarchyLevel,
            track: role.track
        });

        res.json({ message: 'Role deleted successfully', deleted: role });
    } catch (err) {
        await logAction(req.session.user?.username || 'anonymous', 'role-delete-error', req.params.id, {
            error: err.message
        });
        res.status(500).json({ error: 'Server error' });
    }
};

const getUsersByRole = async (req, res) => {
    try {
        const { roleName } = req.params;
        const users = await User.find({ role: roleName })
            .select('-password')
            .lean();

        await logAction(req.session.user?.username || 'anonymous', 'users-by-role-queried', roleName, {
            userCount: users.length
        });

        res.json(users);
    } catch (err) {
        await logAction(req.session.user?.username || 'anonymous', 'users-by-role-error', req.params.roleName, {
            error: err.message
        });
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

module.exports = { create, getAll, getById, update, deleteRole, getUsersByRole };