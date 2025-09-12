const bcrypt = require('bcrypt');
const { User, PendingUser } = require('../models');
const { logAction } = require('../utils/logger');
const { uploadToGridFS } = require('../utils/fileHelpers');

const getUsers = async (req, res) => {
    const users = await User.find().lean();
    const mappedUsers = users.map(user => ({
        ...user,
        fullName: user.fullname,
        createdAt: user.createdAt // Ensure createdAt is included
    }));
    res.json(mappedUsers);
};

const getUserById = async (req, res) => {
    const user = await User.findOne({ _id: req.params.id }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
};

const createUser = async (req, res) => {
    try {
        const { fullName, username, email, password, role, submittedBy } = req.body;

        if (!fullName || !username || !email || !password || !role) {
            await logAction(req.session.user?.username, 'user-create-failed', username || email, {
                reason: 'Missing required fields'
            });
            return res.status(400).json({ error: 'Full name, username, email, password, and role are required' });
        }

        if (!['viewer', 'author', 'editor', 'admin'].includes(role)) {
            await logAction(req.session.user?.username, 'user-create-failed', username || email, {
                reason: 'Invalid role'
            });
            return res.status(400).json({ error: 'Invalid role' });
        }

        const duplicate = await User.findOne({
            $or: [{ username }, { email }, { fullname: fullName }]
        }).lean();
        if (duplicate) {
            await logAction(req.session.user?.username, 'user-create-failed', username || email, {
                reason: 'Duplicate user'
            });
            return res.status(409).json({ error: 'User already exists' });
        }

        let avatarId = null;
        let pdfId = null;
        let pdfOriginalName = null;

        if (req.files && req.files['avatar'] && req.files['avatar'][0]) {
            const avatarFile = req.files['avatar'][0];
            avatarId = await uploadToGridFS(avatarFile, `${Date.now()}-${avatarFile.originalname}`);
        }

        if (req.files && req.files['pdf'] && req.files['pdf'][0]) {
            const pdfFile = req.files['pdf'][0];
            pdfId = await uploadToGridFS(pdfFile, `${Date.now()}-${pdfFile.originalname}`);
            pdfOriginalName = pdfFile.originalname;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: Date.now().toString(),
            fullname: fullName,
            username,
            email,
            password: hashedPassword,
            role,
            avatarId,
            pdfId,
            pdfOriginalName,
            submittedBy: submittedBy || req.session.user.username,
            status: 'active',
            createdAt: new Date() // Ensure createdAt is set
        };

        await User.create(newUser);
        await logAction(req.session.user.username, 'user-created', username, {
            email,
            role,
            hasAvatar: !!avatarId,
            hasPdf: !!pdfId
        });

        // SECURITY: Return safe user object without password
        const safeUser = {
            id: newUser.id,
            fullname: newUser.fullname,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            avatarId: newUser.avatarId,
            pdfId: newUser.pdfId,
            pdfOriginalName: newUser.pdfOriginalName,
            submittedBy: newUser.submittedBy,
            status: newUser.status,
            createdAt: newUser.createdAt // Include createdAt
        };

        res.status(201).json({ message: 'User added', user: safeUser });
    } catch (err) {
        await logAction(req.session.user?.username, 'user-create-error', req.body.username || 'unknown', {
            error: err.message
        });
        res.status(500).json({ error: 'Failed to create user', details: err.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id }).lean();
        if (!user) {
            await logAction(req.session.user.username, 'user-update-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'User not found' });
        }

        // SECURITY: Never update password via this endpoint without special handling
        const updateData = { ...req.body };
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        await User.updateOne({ _id: req.params.id }, updateData);
        await logAction(req.session.user.username, 'user-updated', user.username || user.email, {
            changes: Object.keys(req.body)
        });

        // SECURITY: Return safe updated user
        const updatedUser = await User.findOne({ _id: req.params.id }).lean();
        const safeUpdatedUser = {
            id: updatedUser.id,
            fullname: updatedUser.fullname,
            username: updatedUser.username,
            email: updatedUser.email,
            role: updatedUser.role,
            avatarId: updatedUser.avatarId,
            pdfId: updatedUser.pdfId,
            pdfOriginalName: updatedUser.pdfOriginalName,
            submittedBy: updatedUser.submittedBy,
            status: updatedUser.status,
            createdAt: updatedUser.createdAt // Include createdAt
        };

        res.json({ message: 'User updated', user: safeUpdatedUser });
    } catch (err) {
        await logAction(req.session.user.username, 'user-update-error', req.params.id, {
            error: err.message
        });
        res.status(500).json({ error: 'Failed to update user' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id }).lean();
        if (!user) {
            await logAction(req.session.user.username, 'user-delete-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'User not found' });
        }

        // SECURITY: Sanitize deleted user response
        const safeUser = {
            id: user.id,
            fullname: user.fullname,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt // Include createdAt
        };

        await User.deleteOne({ _id: req.params.id });
        await logAction(req.session.user.username, 'user-deleted', user.username || user.email, {
            role: user.role
        });

        res.json({ message: 'User deleted', user: safeUser });
    } catch (err) {
        await logAction(req.session.user.username, 'user-delete-error', req.params.id, {
            error: err.message
        });
        res.status(500).json({ error: 'Failed to delete user', details: err.message });
    }
};

const getPendingUsers = async (req, res) => {
    const pending = await PendingUser.find().lean();
    const mappedPending = pending.map(user => ({
        ...user,
        fullName: user.fullname,
        createdAt: user.requestedAt // Map requestedAt to createdAt
    }));
    res.json(mappedPending);
};

const getPendingUserById = async (req, res) => {
    const user = await PendingUser.findOne({ _id: req.params.id }).lean();
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    // SECURITY: Sanitize for pending user too
    const safeUser = {
        ...user,
        password: undefined, // Remove password if it exists
        createdAt: user.requestedAt // Map to createdAt
    };
    res.json(safeUser);
};

const createPendingUser = async (req, res) => {
    try {
        const { fullName, username, email, password, role } = req.body;

        if (!fullName || !username || !email || !password || !role) {
            await logAction(req.session.user?.username, 'pending-user-create-failed', username || 'unknown', {
                reason: 'Missing required fields'
            });
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const existingUser = await User.findOne({ $or: [{ username }, { email }] }).lean();
        const existingPending = await PendingUser.findOne({ $or: [{ username }, { email }] }).lean();
        if (existingUser || existingPending) {
            await logAction(req.session.user?.username, 'pending-user-create-failed', username, {
                reason: 'User already exists'
            });
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        let avatarId = null;
        let pdfId = null;
        let pdfOriginalName = null;

        if (req.files && req.files['avatar'] && req.files['avatar'][0]) {
            const avatarFile = req.files['avatar'][0];
            avatarId = await uploadToGridFS(avatarFile, `${Date.now()}-${avatarFile.originalname}`);
        }

        if (req.files && req.files['pdf'] && req.files['pdf'][0]) {
            const pdfFile = req.files['pdf'][0];
            pdfId = await uploadToGridFS(pdfFile, `${Date.now()}-${pdfFile.originalname}`);
            pdfOriginalName = pdfFile.originalname;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newPendingUser = {
            id: Date.now().toString(),
            fullname: fullName,
            username,
            email,
            password: hashedPassword,
            role,
            avatarId,
            pdfId,
            pdfOriginalName,
            submittedBy: req.session.user.username,
            requestedAt: new Date(), // Set requestedAt
            status: 'pending'
        };

        await PendingUser.create(newPendingUser);
        await logAction(req.session.user.username, 'pending-user-created', username, {
            email,
            role,
            hasAvatar: !!avatarId,
            hasPdf: !!pdfId
        });

        // SECURITY: Return safe pending user without password
        const safePendingUser = {
            id: newPendingUser.id,
            fullname: newPendingUser.fullname,
            username: newPendingUser.username,
            email: newPendingUser.email,
            role: newPendingUser.role,
            avatarId: newPendingUser.avatarId,
            pdfId: newPendingUser.pdfId,
            pdfOriginalName: newPendingUser.pdfOriginalName,
            submittedBy: newPendingUser.submittedBy,
            requestedAt: newPendingUser.requestedAt, // Map to createdAt in frontend
            status: newPendingUser.status
        };

        res.status(201).json({ message: 'Pending user submitted for approval', user: safePendingUser });
    } catch (err) {
        await logAction(req.session.user?.username, 'pending-user-create-error', req.body.username || 'unknown', {
            error: err.message
        });
        res.status(500).json({ error: 'Failed to submit pending user', details: err.message });
    }
};

const deletePendingUser = async (req, res) => {
    try {
        const user = await PendingUser.findOne({ _id: req.params.id }).lean();
        if (!user) {
            await logAction(req.session.user.username, 'pending-user-delete-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'Pending user not found' });
        }

        // SECURITY: Sanitize removed user
        const safeUser = {
            id: user.id,
            fullname: user.fullname,
            username: user.username,
            email: user.email,
            role: user.role,
            requestedAt: user.requestedAt // Map to createdAt
        };

        await PendingUser.deleteOne({ _id: req.params.id });
        await logAction(req.session.user.username, 'pending-user-deleted', user.email || user.username, {
            reason: 'Admin action'
        });

        res.json({ message: 'Pending request removed', removed: safeUser });
    } catch (err) {
        await logAction(req.session.user.username, 'pending-user-delete-error', req.params.id, {
            error: err.message
        });
        res.status(500).json({ error: 'Failed to remove pending user', details: err.message });
    }
};

module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getPendingUsers,
    getPendingUserById,
    createPendingUser,
    deletePendingUser
};