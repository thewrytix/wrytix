const { Category, User } = require('../models');
const { logAction } = require('../utils/logger');

const readCategories = async () => {
    try {
        const categories = await Category.find().lean();
        const users = await User.find({ role: { $in: ['editor', 'author'] } }).select('username fullname role').lean();

        return categories.map(cat => {
            const editor = users.find(u => u.username === cat.editor);
            const authors = users.filter(u => (cat.authors || []).includes(u.username));
            return {
                ...cat,
                editorName: editor ? (editor.fullname || editor.username) : 'N/A',
                authors: authors.map(a => ({ username: a.username, name: a.fullname || a.username }))
            };
        });
    } catch (e) {
        console.error('Error reading categories:', e);
        return [];
    }
};

const create = async (req, res) => {
    try {
        const { name, editor, authors } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        if (editor) {
            const editorUser = await User.findOne({ username: editor }).lean();
            if (!editorUser) {
                await logAction(req.session.user?.username || 'anonymous', 'category-create-failed', 'system', { reason: `No user found with username "${editor}"` });
                return res.status(400).json({ error: `No user found with username "${editor}"` });
            }
            if (editorUser.role !== 'editor') {
                await logAction(req.session.user?.username || 'anonymous', 'category-create-failed', 'system', { reason: `User "${editor}" has role "${editorUser.role}", not editor` });
                return res.status(400).json({ error: `"${editor}" is a ${editorUser.role}, not an editor` });
            }
        }

        if (authors && authors.length) {
            const authorUsers = await User.find({ username: { $in: authors }, role: 'author' }).lean();
            if (authorUsers.length !== authors.length) {
                const foundUsernames = authorUsers.map(a => a.username);
                const missing = authors.filter(a => !foundUsernames.includes(a));
                await logAction(req.session.user?.username || 'anonymous', 'category-create-failed', 'system', { reason: `Authors not found or not role=author: ${missing.join(', ')}` });
                return res.status(400).json({ error: `These usernames are not valid authors: ${missing.join(', ')}` });
            }
        }

        const category = {
            id: Date.now().toString(),
            name: name.trim(),
            editor: editor || null,
            authors: authors || [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await Category.create(category);
        await logAction(req.session.user?.username || 'anonymous', 'category-created', category.id, { name: category.name, editor });

        res.status(201).json({ message: 'Category created successfully', category });
    } catch (error) {
        await logAction(req.session.user?.username || 'anonymous', 'category-create-error', 'system', { error: error.message });
        res.status(500).json({ error: 'Failed to save category' });
    }
};

const getAll = async (req, res) => {
    try {
        res.json(await readCategories());
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

const getById = async (req, res) => {
    try {
        const category = await Category.findOne({ id: req.params.id }).lean();
        if (!category) return res.status(404).json({ error: 'Category not found' });

        const users = await User.find({ role: { $in: ['editor', 'author'] } }).select('username fullname').lean();
        const editor = users.find(u => u.username === category.editor);
        const authors = users.filter(u => (category.authors || []).includes(u.username));

        res.json({
            ...category,
            editorName: editor ? (editor.fullname || editor.username) : 'N/A',
            authors: authors.map(a => ({ username: a.username, name: a.fullname || a.username }))
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to load category' });
    }
};

const update = async (req, res) => {
    try {
        const { name, editor, authors } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        if (editor) {
            const editorUser = await User.findOne({ username: editor }).lean();
            if (!editorUser) {
                await logAction(req.session.user?.username || 'anonymous', 'category-update-failed', req.params.id, { reason: `No user found with username "${editor}"` });
                return res.status(400).json({ error: `No user found with username "${editor}"` });
            }
            if (editorUser.role !== 'editor') {
                await logAction(req.session.user?.username || 'anonymous', 'category-update-failed', req.params.id, { reason: `User "${editor}" has role "${editorUser.role}", not editor` });
                return res.status(400).json({ error: `"${editor}" is a ${editorUser.role}, not an editor` });
            }
        }

        if (authors && authors.length) {
            const authorUsers = await User.find({ username: { $in: authors }, role: 'author' }).lean();
            if (authorUsers.length !== authors.length) {
                const foundUsernames = authorUsers.map(a => a.username);
                const missing = authors.filter(a => !foundUsernames.includes(a));
                await logAction(req.session.user?.username || 'anonymous', 'category-update-failed', req.params.id, { reason: `Authors not found: ${missing.join(', ')}` });
                return res.status(400).json({ error: `These usernames are not valid authors: ${missing.join(', ')}` });
            }
        }

        const category = await Category.findOne({ id: req.params.id });
        if (!category) return res.status(404).json({ error: 'Category not found' });

        category.name = name.trim();
        category.editor = editor || null;
        category.authors = authors || [];
        category.updatedAt = new Date();

        await category.save();
        await logAction(req.session.user?.username || 'anonymous', 'category-updated', category.id, { changes: Object.keys(req.body) });

        res.json({ message: 'Category updated', category });
    } catch (err) {
        await logAction(req.session.user?.username || 'anonymous', 'category-update-error', req.params.id, { error: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findOne({ id: req.params.id }).lean();
        if (!category) return res.status(404).json({ error: 'Category not found' });

        await Category.deleteOne({ id: req.params.id });
        await logAction(req.session.user?.username || 'anonymous', 'category-deleted', category.id, { name: category.name });

        res.json({ message: 'Category deleted successfully', deleted: category });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { create, getAll, getById, update, deleteCategory };