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

// Editor submits a new user for approval (author role only, per spec)
const submitPendingUser = async (req, res) => {
    try {
        const editor = req.session.user;

        if (editor.role === 'editor' && req.body.role !== 'author') {
            return res.status(403).json({ error: 'Editors can only submit users with the author role' });
        }

        const newPendingUser = {
            ...req.body,
            createdBy: editor.username,
            status: 'pending',
            createdAt: new Date()
        };

        await PendingUser.create(newPendingUser);
        await logAction(editor.username, 'user-submission-created', req.body.username || req.body.email);

        res.status(201).json({ message: 'User submitted for approval' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit user' });
    }
};

// Editor's own submissions view — "view only the users they have submitted"
const getMyPendingUsers = async (req, res) => {
    try {
        const editor = req.session.user;
        const pending = await PendingUser.find({ createdBy: editor.username })
            .select('username email role status createdAt')
            .lean();
        res.json(pending);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load your submitted users' });
    }
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

// controllers/userController.js
const assignLineManager = async (req, res) => {
    try {
        const { username, lineManager } = req.body; // lineManager = editor's username, or null to unassign

        const author = await User.findOne({ username });
        if (!author || author.role !== 'author') {
            return res.status(400).json({ error: 'Target user must be an author' });
        }

        if (lineManager) {
            const editor = await User.findOne({ username: lineManager });
            if (!editor || editor.role !== 'editor') {
                return res.status(400).json({ error: 'lineManager must be an existing editor' });
            }
        }

        author.lineManager = lineManager || null;
        await author.save();

        await logAction(req.session.user.username, 'author-assigned', username, { lineManager });
        res.json({ message: 'Line manager assigned', author });
    } catch (err) {
        res.status(500).json({ error: 'Failed to assign line manager' });
    }
};

const assignEditorCategories = async (req, res) => {
    try {
        const { username, categories } = req.body; // categories = array of strings

        const editor = await User.findOne({ username });
        if (!editor || editor.role !== 'editor') {
            return res.status(400).json({ error: 'Target user must be an editor' });
        }

        editor.assignedCategories = Array.isArray(categories) ? categories : [];
        await editor.save();

        await logAction(req.session.user.username, 'editor-categories-assigned', username, { categories });
        res.json({ message: 'Categories assigned', editor });
    } catch (err) {
        res.status(500).json({ error: 'Failed to assign categories' });
    }
};

const getManagedUsers = async (req, res) => {
    try {
        const admin = req.session.user;
        const { status = 'all', page = 1, search = '', role = '' } = req.query;
        const limit = 20;
        const skip = (parseInt(page) - 1) * limit;

        // "pending" pulls from PendingUser instead of User
        if (status === 'pending') {
            let query = {};
            if (admin.role === 'editor') query.createdBy = admin.username; // editor sees only their own submissions

            if (search) query.username = { $regex: search, $options: 'i' };

            const [items, total] = await Promise.all([
                PendingUser.find(query)
                    .select('username email role createdAt createdBy')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                PendingUser.countDocuments(query)
            ]);

            return res.json({
                items: items.map(i => ({ ...i, source: 'pending' })),
                total, page: parseInt(page), totalPages: Math.ceil(total / limit)
            });
        }

        let query = {};
        if (status === 'active') query.status = 'active';
        if (status === 'inactive') query.status = { $ne: 'active' };
        if (search) query.username = { $regex: search, $options: 'i' };
        if (role) query.role = role;

        const [items, total] = await Promise.all([
            User.find(query)
                .select('username email role status createdAt lineManager assignedCategories')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(query)
        ]);

        res.json({
            items: items.map(i => ({ ...i, source: 'user' })),
            total, page: parseInt(page), totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('getManagedUsers error:', err);
        res.status(500).json({ error: 'Failed to load users' });
    }
};

const bulkDeleteUsers = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No ids provided' });
        }

        const result = await User.deleteMany({ _id: { $in: ids } });

        await logAction(req.session.user?.username, 'bulk-delete-users', 'multiple', {
            deletedCount: result.deletedCount
        });

        res.json({ message: 'Bulk delete complete', deletedCount: result.deletedCount });
    } catch (err) {
        console.error('bulkDeleteUsers error:', err);
        res.status(500).json({ error: 'Bulk delete failed' });
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
    deletePendingUser,
    submitPendingUser,
    getMyPendingUsers,
    assignLineManager,
    assignEditorCategories,
    getManagedUsers,
    bulkDeleteUsers
};