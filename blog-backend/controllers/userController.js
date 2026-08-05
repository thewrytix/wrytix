const bcrypt = require('bcrypt');
const { User, PendingUser } = require('../models');
const { logAction } = require('../utils/logger');
const { uploadToGridFS } = require('../utils/fileHelpers');

const getUsers = async (req, res) => {
    const users = await User.find().lean();
    const mappedUsers = users.map(user => ({ ...user, fullName: user.fullname }));
    res.json(mappedUsers);
};

const getUserById = async (req, res) => {
    const user = await User.findOne({ _id: req.params.id }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { password, ...safeUser } = user;
    res.json({ ...safeUser, fullName: user.fullname });
};

const parseCategories = (raw) => {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const createUser = async (req, res) => {
    try {
        const { fullName, username, email, password, role, submittedBy, lineManager, assignedCategories } = req.body;

        if (!fullName || !username || !email || !password || !role) {
            await logAction(req.session.user?.username, 'user-create-failed', username || email, { reason: 'Missing required fields' });
            return res.status(400).json({ error: 'Full name, username, email, password, and role are required' });
        }

        if (!['viewer', 'author', 'editor', 'admin'].includes(role)) {
            await logAction(req.session.user?.username, 'user-create-failed', username || email, { reason: 'Invalid role' });
            return res.status(400).json({ error: 'Invalid role' });
        }

        const duplicate = await User.findOne({
            $or: [{ username }, { email }, { fullname: fullName }]
        }).lean();
        if (duplicate) {
            await logAction(req.session.user?.username, 'user-create-failed', username || email, { reason: 'Duplicate user' });
            return res.status(409).json({ error: 'User already exists' });
        }

        let avatarId = null, pdfId = null, pdfOriginalName = null;

        if (req.files?.avatar?.[0]) {
            avatarId = await uploadToGridFS(req.files.avatar[0], `${Date.now()}-${req.files.avatar[0].originalname}`);
        }
        if (req.files?.pdf?.[0]) {
            pdfId = await uploadToGridFS(req.files.pdf[0], `${Date.now()}-${req.files.pdf[0].originalname}`);
            pdfOriginalName = req.files.pdf[0].originalname;
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
            createdAt: new Date(),
            lineManager: role === 'author' ? (lineManager || null) : null,       // FIX: was missing entirely
            assignedCategories: role === 'editor' ? parseCategories(assignedCategories) : [] // FIX: was missing entirely
        };

        await User.create(newUser);
        await logAction(req.session.user.username, 'user-created', username, {
            email, role, hasAvatar: !!avatarId, hasPdf: !!pdfId
        });

        const { password: _pw, ...safeUser } = newUser;
        res.status(201).json({ message: 'User added', user: safeUser });
    } catch (err) {
        await logAction(req.session.user?.username, 'user-create-error', req.body.username || 'unknown', { error: err.message });
        res.status(500).json({ error: 'Failed to create user', details: err.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id }).lean();
        if (!user) {
            await logAction(req.session.user.username, 'user-update-failed', req.params.id, { reason: 'Not found' });
            return res.status(404).json({ error: 'User not found' });
        }

        const requester = req.session.user;

        // Editors can only edit users THEY submitted, and only while pending/rejected — never once approved/active
        if (requester.role === 'editor') {
            if (user.submittedBy !== requester.username) {
                return res.status(403).json({ error: 'You can only edit users you submitted' });
            }
            if (user.status === 'active') {
                return res.status(403).json({ error: 'Cannot edit a user that has already been approved' });
            }
        }

        const updateData = { ...req.body };

        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        } else {
            delete updateData.password; // never overwrite with an empty string
        }

        if (updateData.assignedCategories !== undefined) {
            updateData.assignedCategories = parseCategories(updateData.assignedCategories);
        }

        if (updateData.role && updateData.role !== 'author') updateData.lineManager = null;
        if (updateData.role && updateData.role !== 'editor') updateData.assignedCategories = [];

        // Allow replacing avatar/document on edit
        if (req.files?.avatar?.[0]) {
            updateData.avatarId = await uploadToGridFS(req.files.avatar[0], `${Date.now()}-${req.files.avatar[0].originalname}`);
        }
        if (req.files?.pdf?.[0]) {
            updateData.pdfId = await uploadToGridFS(req.files.pdf[0], `${Date.now()}-${req.files.pdf[0].originalname}`);
            updateData.pdfOriginalName = req.files.pdf[0].originalname;
        }

        await User.updateOne({ _id: req.params.id }, updateData);
        await logAction(requester.username, 'user-updated', user.username || user.email, { changes: Object.keys(req.body) });

        const updatedUser = await User.findOne({ _id: req.params.id }).lean();
        const { password: _pw, ...safeUpdatedUser } = updatedUser;
        res.json({ message: 'User updated', user: safeUpdatedUser });
    } catch (err) {
        await logAction(req.session.user.username, 'user-update-error', req.params.id, { error: err.message });
        res.status(500).json({ error: 'Failed to update user' });
    }
};

// NEW: Suspend / Activate toggle
const toggleUserStatus = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const requester = req.session.user;
        if (requester.role === 'editor' && user.submittedBy !== requester.username) {
            return res.status(403).json({ error: 'Not authorized to modify this user' });
        }

        user.status = user.status === 'suspended' ? 'active' : 'suspended';
        await user.save();

        await logAction(requester.username, user.status === 'suspended' ? 'user-suspended' : 'user-activated', user.username);
        res.json({ message: 'Status updated', status: user.status });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update status' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id }).lean();
        if (!user) {
            await logAction(req.session.user.username, 'user-delete-failed', req.params.id, { reason: 'Not found' });
            return res.status(404).json({ error: 'User not found' });
        }

        const requester = req.session.user;
        if (requester.role === 'editor' && user.submittedBy !== requester.username) {
            return res.status(403).json({ error: 'Not authorized to delete this user' });
        }

        const safeUser = { id: user.id, fullname: user.fullname, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt };

        await User.deleteOne({ _id: req.params.id });
        await logAction(requester.username, 'user-deleted', user.username || user.email, { role: user.role });

        res.json({ message: 'User deleted', user: safeUser });
    } catch (err) {
        await logAction(req.session.user.username, 'user-delete-error', req.params.id, { error: err.message });
        res.status(500).json({ error: 'Failed to delete user', details: err.message });
    }
};

const getPendingUsers = async (req, res) => {
    const pending = await PendingUser.find().lean();
    const mappedPending = pending.map(user => ({ ...user, fullName: user.fullname, createdAt: user.requestedAt }));
    res.json(mappedPending);
};

const getPendingUserById = async (req, res) => {
    const user = await PendingUser.findOne({ _id: req.params.id }).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, ...safeUser } = user;
    res.json({ ...safeUser, createdAt: user.requestedAt });
};

const submitPendingUser = async (req, res) => {
    try {
        const editor = req.session.user;
        if (editor.role === 'editor' && req.body.role !== 'author') {
            return res.status(403).json({ error: 'Editors can only submit users with the author role' });
        }

        const newPendingUser = {
            ...req.body,
            submittedBy: editor.username, // FIX: standardized on submittedBy, matching createPendingUser
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

const getMyPendingUsers = async (req, res) => {
    try {
        const editor = req.session.user;
        const pending = await PendingUser.find({ submittedBy: editor.username }) // FIX: was createdBy
            .select('username email role status createdAt')
            .lean();
        res.json(pending);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load your submitted users' });
    }
};

const createPendingUser = async (req, res) => {
    try {
        const { fullName, username, email, password, role, lineManager, assignedCategories } = req.body;

        if (!fullName || !username || !email || !password || !role) {
            await logAction(req.session.user?.username, 'pending-user-create-failed', username || 'unknown', { reason: 'Missing required fields' });
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const existingUser = await User.findOne({ $or: [{ username }, { email }] }).lean();
        const existingPending = await PendingUser.findOne({ $or: [{ username }, { email }] }).lean();
        if (existingUser || existingPending) {
            await logAction(req.session.user?.username, 'pending-user-create-failed', username, { reason: 'User already exists' });
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        let avatarId = null, pdfId = null, pdfOriginalName = null;

        if (req.files?.avatar?.[0]) {
            avatarId = await uploadToGridFS(req.files.avatar[0], `${Date.now()}-${req.files.avatar[0].originalname}`);
        }
        if (req.files?.pdf?.[0]) {
            pdfId = await uploadToGridFS(req.files.pdf[0], `${Date.now()}-${req.files.pdf[0].originalname}`);
            pdfOriginalName = req.files.pdf[0].originalname;
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
            lineManager: role === 'author' ? (lineManager || null) : null,       // FIX: was missing
            assignedCategories: role === 'editor' ? parseCategories(assignedCategories) : [], // FIX: was missing
            requestedAt: new Date(),
            status: 'pending'
        };

        await PendingUser.create(newPendingUser);
        await logAction(req.session.user.username, 'pending-user-created', username, {
            email, role, hasAvatar: !!avatarId, hasPdf: !!pdfId
        });

        const { password: _pw, ...safePendingUser } = newPendingUser;
        res.status(201).json({ message: 'Pending user submitted for approval', user: safePendingUser });
    } catch (err) {
        await logAction(req.session.user?.username, 'pending-user-create-error', req.body.username || 'unknown', { error: err.message });
        res.status(500).json({ error: 'Failed to submit pending user', details: err.message });
    }
};

const deletePendingUser = async (req, res) => {
    try {
        const user = await PendingUser.findOne({ _id: req.params.id }).lean();
        if (!user) {
            await logAction(req.session.user.username, 'pending-user-delete-failed', req.params.id, { reason: 'Not found' });
            return res.status(404).json({ error: 'Pending user not found' });
        }

        const requester = req.session.user;
        if (requester.role === 'editor' && user.submittedBy !== requester.username) {
            return res.status(403).json({ error: 'Not authorized to reject this submission' });
        }

        const safeUser = { id: user.id, fullname: user.fullname, username: user.username, email: user.email, role: user.role, requestedAt: user.requestedAt };

        await PendingUser.deleteOne({ _id: req.params.id });
        await logAction(requester.username, 'pending-user-deleted', user.email || user.username, { reason: 'Rejected' });

        res.json({ message: 'Pending request removed', removed: safeUser });
    } catch (err) {
        await logAction(req.session.user.username, 'pending-user-delete-error', req.params.id, { error: err.message });
        res.status(500).json({ error: 'Failed to remove pending user', details: err.message });
    }
};

const assignLineManager = async (req, res) => {
    try {
        const { username, lineManager } = req.body;
        const author = await User.findOne({ username });
        if (!author || author.role !== 'author') return res.status(400).json({ error: 'Target user must be an author' });

        if (lineManager) {
            const editor = await User.findOne({ username: lineManager });
            if (!editor || editor.role !== 'editor') return res.status(400).json({ error: 'lineManager must be an existing editor' });
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
        const { username, categories } = req.body;
        const editor = await User.findOne({ username });
        if (!editor || editor.role !== 'editor') return res.status(400).json({ error: 'Target user must be an editor' });

        editor.assignedCategories = Array.isArray(categories) ? categories : [];
        await editor.save();

        await logAction(req.session.user.username, 'editor-categories-assigned', username, { categories });
        res.json({ message: 'Categories assigned', editor });
    } catch (err) {
        res.status(500).json({ error: 'Failed to assign categories' });
    }
};

const getEditorsList = async (req, res) => {
    try {
        const editors = await User.find({ role: 'editor', status: 'active' }).select('id username fullname').lean();
        res.json(editors);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load editors' });
    }
};

const getManagedUsers = async (req, res) => {
    try {
        const admin = req.session.user;
        const { status = 'all', page = 1, search = '', role = '' } = req.query;
        const limit = 20;
        const skip = (parseInt(page) - 1) * limit;

        if (status === 'pending') {
            let query = {};
            if (admin.role === 'editor') query.submittedBy = admin.username; // FIX: was createdBy, never matched

            if (search) query.username = { $regex: search, $options: 'i' };

            const [items, total] = await Promise.all([
                PendingUser.find(query)
                    .select('username fullname email role createdAt submittedBy')
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
        if (status === 'inactive') query.status = { $in: ['inactive', 'suspended'] };
        if (search) query.username = { $regex: search, $options: 'i' };
        if (role) query.role = role;
        if (admin.role === 'editor') query.submittedBy = admin.username; // FIX: editors now scoped on every tab, not just pending

        const [items, total] = await Promise.all([
            User.find(query)
                .select('username fullname email role status createdAt submittedBy lineManager assignedCategories lastLogin')
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
        if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'No ids provided' });

        const requester = req.session.user;
        let filter = { _id: { $in: ids } };
        if (requester.role === 'editor') filter.submittedBy = requester.username;

        const result = await User.deleteMany(filter);
        await logAction(requester.username, 'bulk-delete-users', 'multiple', { deletedCount: result.deletedCount });
        res.json({ message: 'Bulk delete complete', deletedCount: result.deletedCount });
    } catch (err) {
        console.error('bulkDeleteUsers error:', err);
        res.status(500).json({ error: 'Bulk delete failed' });
    }
};

module.exports = {
    getUsers, getUserById, createUser, updateUser, deleteUser, toggleUserStatus,
    getPendingUsers, getPendingUserById, createPendingUser, deletePendingUser,
    submitPendingUser, getMyPendingUsers, assignLineManager, getEditorsList,
    assignEditorCategories, getManagedUsers, bulkDeleteUsers
};