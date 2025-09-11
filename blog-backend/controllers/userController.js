const bcrypt = require('bcrypt');
const { User, PendingUser } = require('../models');
const { logAction } = require('../utils/logger');
const { uploadToGridFS } = require('../utils/fileHelpers');

const getUsers = async (req, res) => {
    const users = await User.find().lean();
    const mappedUsers = users.map(user => ({
        ...user,
        fullName: user.fullname
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

        if (req.files['avatar'] && req.files['avatar'][0]) {
            const avatarFile = req.files['avatar'][0];
            avatarId = await uploadToGridFS(avatarFile, `${Date.now()}-${avatarFile.originalname}`);
        }

        if (req.files['pdf'] && req.files['pdf'][0]) {
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
            createdAt: new Date()
        };

        await User.create(newUser);
        await logAction(req.session.user.username, 'user-created', username, {
            email,
            role,
            hasAvatar: !!avatarId,
            hasPdf: !!pdfId
        });

        res.status(201).json({ message: 'User added', user: newUser });
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

        await User.updateOne({ _id: req.params.id }, req.body);
        await logAction(req.session.user.username, 'user-updated', user.username || user.email, {
            changes: Object.keys(req.body)
        });

        res.json({ message: 'User updated', user: { ...user, ...req.body } });
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

        await User.deleteOne({ _id: req.params.id });
        await logAction(req.session.user.username, 'user-deleted', user.username || user.email, {
            role: user.role
        });

        res.json({ message: 'User deleted', user });
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
        createdAt: user.requestedAt
    }));
    res.json(mappedPending);
};

const getPendingUserById = async (req, res) => {
    const user = await PendingUser.findOne({ _id: req.params.id }).lean();
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
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

        if (req.files['avatar'] && req.files['avatar'][0]) {
            const avatarFile = req.files['avatar'][0];
            avatarId = await uploadToGridFS(avatarFile, `${Date.now()}-${avatarFile.originalname}`);
        }

        if (req.files['pdf'] && req.files['pdf'][0]) {
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
            requestedAt: new Date(),
            status: 'pending'
        };

        await PendingUser.create(newPendingUser);
        await logAction(req.session.user.username, 'pending-user-created', username, {
            email,
            role,
            hasAvatar: !!avatarId,
            hasPdf: !!pdfId
        });

        res.status(201).json({ message: 'Pending user submitted for approval', user: newPendingUser });
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

        await PendingUser.deleteOne({ _id: req.params.id });
        await logAction(req.session.user.username, 'pending-user-deleted', user.email || user.username, {
            reason: 'Admin action'
        });

        res.json({ message: 'Pending request removed', removed: user });
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