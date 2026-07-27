const { User, PendingUser, PendingDeletion, Log } = require('../models');
const { logAction } = require('../utils/logger');

const approveUser = async (req, res) => {
    try {
        const { pendingUserId } = req.body;
        if (!pendingUserId) {
            await logAction(req.session.user.username, 'user-approve-failed', 'no id', {
                reason: 'Missing pendingUserId'
            });
            return res.status(400).json({ error: 'Missing pendingUserId' });
        }

        const pendingUser = await PendingUser.findOne({ _id: pendingUserId }).lean();
        if (!pendingUser) {
            await logAction(req.session.user.username, 'user-approve-failed', pendingUserId, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'Pending user not found' });
        }

        const duplicate = await User.findOne({
            $or: [{ username: pendingUser.username }, { email: pendingUser.email }, { fullname: pendingUser.fullname }]
        }).lean();
        if (duplicate) {
            await logAction(req.session.user.username, 'user-approve-failed', pendingUser.username || pendingUser.email, {
                reason: 'Duplicate user'
            });
            return res.status(409).json({ error: 'User already exists' });
        }

        const newUser = {
            id: Date.now().toString(),
            fullname: pendingUser.fullname,
            username: pendingUser.username,
            email: pendingUser.email,
            password: pendingUser.password,
            role: pendingUser.role,
            avatarId: pendingUser.avatarId,
            pdfId: pendingUser.pdfId,
            pdfOriginalName: pendingUser.pdfOriginalName,
            status: 'active',
            approvedBy: req.session.user.username,
            approvedAt: new Date(),
            createdAt: new Date()
        };

        await User.create(newUser);
        await PendingUser.deleteOne({ _id: pendingUserId });

        await logAction(req.session.user.username, 'user-approved', newUser.username || newUser.email, {
            role: newUser.role,
            hasAvatar: !!newUser.avatarId,
            hasPdf: !!newUser.pdfId
        });

        res.json({ message: 'User approved', user: newUser });
    } catch (err) {
        await logAction(req.session.user.username, 'user-approve-error', 'system', {
            error: err.message
        });
        res.status(500).json({ error: 'Failed to approve user' });
    }
};

const approveUserById = async (req, res) => {
    try {
        const pendingUser = await PendingUser.findOne({ _id: req.params.id }).lean();
        if (!pendingUser) {
            await logAction(req.session.user.username, 'user-approve-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'Pending user not found' });
        }

        const duplicate = await User.findOne({
            $or: [{ username: pendingUser.username }, { email: pendingUser.email }, { fullname: pendingUser.fullname }]
        }).lean();
        if (duplicate) {
            await logAction(req.session.user.username, 'user-approve-failed', pendingUser.username || pendingUser.email, {
                reason: 'Duplicate user'
            });
            return res.status(409).json({ error: 'User already exists' });
        }

        const approvedUser = {
            id: Date.now().toString(),
            fullname: pendingUser.fullname,
            username: pendingUser.username,
            email: pendingUser.email,
            password: pendingUser.password,
            role: pendingUser.role,
            avatarId: pendingUser.avatarId,
            pdfId: pendingUser.pdfId,
            pdfOriginalName: pendingUser.pdfOriginalName,
            status: 'active',
            approvedBy: req.session.user.username,
            approvedAt: new Date(),
            createdAt: new Date()
        };

        await User.create(approvedUser);
        await PendingUser.deleteOne({ _id: req.params.id });

        await logAction(req.session.user.username, 'user-approved', approvedUser.username || approvedUser.email, {
            method: 'direct-approve',
            hasAvatar: !!approvedUser.avatarId,
            hasPdf: !!approvedUser.pdfId
        });

        res.json({
            message: 'User approved successfully',
            user: { ...approvedUser, fullName: approvedUser.fullname }
        });
    } catch (err) {
        await logAction(req.session.user.username, 'user-approve-error', req.params.id, {
            error: err.message
        });
        res.status(500).json({ error: 'Failed to approve user', details: err.message });
    }
};

const createPendingDeletion = async (req, res) => {
    try {
        const { userId, reason, targetUsername, targetEmail, targetRole, targetFullName, targetAvatar, requestedBy } = req.body;

        if (!userId || !reason) {
            return res.status(400).json({ error: 'Missing userId or reason' });
        }

        const newDeletion = {
            id: Date.now().toString(),
            userId,
            reason,
            targetUsername,
            targetEmail,
            targetRole,
            targetFullName,
            targetAvatar,
            requestedBy: requestedBy || req.session.user.username,
            createdAt: new Date(),
            status: 'pending',
            targetId: userId
        };

        await PendingDeletion.create(newDeletion);
        await logAction(req.session.user.username, 'user-delete-requested', userId, {
            reason,
            targetUsername,
            targetEmail,
            targetRole,
            targetFullName,
            targetAvatar,
        });

        res.status(201).json({ message: 'Delete request submitted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit delete request', details: err.message });
    }
};

const getPendingDeletions = async (req, res) => {
    const pending = await PendingDeletion.find().lean();
    res.json(pending);
};

const approveDeletion = async (req, res) => {
    try {
        const deletion = await PendingDeletion.findOne({ id: req.params.id }).lean();
        if (!deletion) return res.status(404).json({ error: 'Request not found' });

        const user = await User.findOne({ _id: deletion.userId }).lean();
        if (!user) return res.status(404).json({ error: 'User not found' });

        await User.deleteOne({ _id: deletion.userId });
        await PendingDeletion.deleteOne({ id: req.params.id });

        await logAction(req.session.user.username, 'user-delete-approved', user.username, {
            requestedBy: deletion.requestedBy,
            deletedUserId: deletion.userId
        });

        res.json({ message: 'User deleted', user });
    } catch (err) {
        res.status(500).json({ error: 'Failed to approve deletion', details: err.message });
    }
};

const rejectDeletion = async (req, res) => {
    try {
        const deletion = await PendingDeletion.findOne({ id: req.params.id }).lean();
        if (!deletion) return res.status(404).json({ error: 'Request not found' });

        await PendingDeletion.deleteOne({ id: req.params.id });
        await logAction(req.session.user.username, 'user-delete-rejected', deletion.userId, {
            requestedBy: deletion.requestedBy
        });

        res.json({ message: 'Deletion request rejected' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reject deletion' });
    }
};

const cancelDeletion = async (req, res) => {
    try {
        const username = req.session.user?.username;
        if (!username) return res.status(403).json({ error: 'Not logged in' });

        const deletion = await PendingDeletion.findOne({ id: req.params.id }).lean();
        if (!deletion) return res.status(404).json({ error: 'Request not found' });

        const isOwner = deletion.requestedBy === username;
        const isAdmin = req.session.user.role === 'admin';
        if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Not authorized' });

        await PendingDeletion.deleteOne({ id: req.params.id });
        await logAction(username, 'user-delete-cancelled', deletion.targetUsername, {
            userId: deletion.userId,
            requestedBy: deletion.requestedBy
        });

        res.json({ message: 'Request cancelled' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to cancel deletion request' });
    }
};

const getLogs = async (req, res) => {
    try {
        let query = {};
        if (req.query.action) {
            query.action = { $regex: req.query.action, $options: 'i' };
        }
        if (req.query.actor) {
            query.actor = { $regex: req.query.actor, $options: 'i' };
        }

        let logsQuery = Log.find(query).sort({ timestamp: -1 }); // newest-first at the source, per your last request
        if (req.query.limit) {
            logsQuery = logsQuery.limit(parseInt(req.query.limit));
        }

        const logs = await logsQuery.lean();
        res.json(logs);
    } catch (err) {
        await logAction(req.session.user?.username, 'logs-fetch-failed', 'system', {
            error: err.message
        });
        res.status(500).json({ error: 'Failed to load logs' });
    }
};

const clearLogs = async (req, res) => {
    try {
        await Log.deleteMany({});
        await logAction(req.session.user?.username, 'logs-cleared', 'admin');
        res.json({ message: 'Logs cleared successfully' });
    } catch (err) {
        await logAction(req.session.user?.username, 'logs-clear-failed', 'admin', {
            error: err.message
        });
        res.status(500).json({ error: 'Failed to clear logs' });
    }
};

module.exports = {
    approveUser,
    approveUserById,
    createPendingDeletion,
    getPendingDeletions,
    approveDeletion,
    rejectDeletion,
    cancelDeletion,
    getLogs,
    clearLogs
};