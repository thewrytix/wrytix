const { Category, User } = require('../models');
const { logAction } = require('../utils/logger');

const readCategories = async () => {
    try {
        const categories = await Category.find().lean();
        const users = await User.find({ role: { $in: ['editor', 'author'] } }).lean();
        return categories.map(cat => {
            const editor = users.find(u => u.id === cat.editor);
            const authors = users.filter(u => (cat.authors || []).includes(u.id));
            return {
                ...cat,
                editorName: editor ? editor.fullname || editor.username : 'N/A',
                authors: authors.map(a => ({ id: a.id, name: a.fullname || a.username }))
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
        if (!name || !editor) {
            await logAction(req.session.user?.username || 'anonymous', 'category-create-failed', 'system', { reason: 'Name or editor missing' });
            return res.status(400).json({ error: 'Name and editor are required' });
        }

        const editorUser = await User.findOne({ id: editor });
        if (!editorUser || editorUser.role !== 'editor') {
            await logAction(req.session.user?.username || 'anonymous', 'category-create-failed', 'system', { reason: 'Invalid or non-editor user' });
            return res.status(400).json({ error: 'Invalid or non-editor user selected' });
        }

        if (authors && authors.length) {
            const authorUsers = await User.find({ id: { $in: authors }, role: 'author' });
            if (authorUsers.length !== authors.length) {
                await logAction(req.session.user?.username || 'anonymous', 'category-create-failed', 'system', { reason: 'Invalid authors' });
                return res.status(400).json({ error: 'One or more authors are invalid' });
            }
        }

        const category = {
            id: Date.now().toString(),
            name: name.trim(),
            editor,
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
        const categories = await readCategories();
        res.json(categories);
    } catch (e) {
        console.error('Error fetching categories:', e);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

const getById = async (req, res) => {
    try {
        const category = await Category.findOne({ id: req.params.id }).lean();
        if (!category) return res.status(404).json({ error: 'Category not found' });

        const users = await User.find({ role: { $in: ['editor', 'author'] } }).lean();
        const editor = users.find(u => u.id === category.editor);
        const authors = users.filter(u => (category.authors || []).includes(u.id)); // fixed: was `cat.authors`

        res.json({
            ...category,
            editorName: editor ? editor.fullname || editor.username : 'N/A',
            authors: authors.map(a => ({ id: a.id, name: a.fullname || a.username }))
        });
    } catch (e) {
        console.error('Error fetching category:', e);
        res.status(500).json({ error: 'Failed to load category' });
    }
};

const update = async (req, res) => {
    try {
        const { name, editor, authors } = req.body;
        if (!name || !editor) {
            await logAction(req.session.user?.username || 'anonymous', 'category-update-failed', req.params.id, { reason: 'Name or editor missing' });
            return res.status(400).json({ error: 'Name and editor are required' });
        }

        const editorUser = await User.findOne({ id: editor });
        if (!editorUser || editorUser.role !== 'editor') {
            await logAction(req.session.user?.username || 'anonymous', 'category-update-failed', req.params.id, { reason: 'Invalid or non-editor user' });
            return res.status(400).json({ error: 'Invalid or non-editor user selected' });
        }

        if (authors && authors.length) {
            const authorUsers = await User.find({ id: { $in: authors }, role: 'author' });
            if (authorUsers.length !== authors.length) {
                await logAction(req.session.user?.username || 'anonymous', 'category-update-failed', req.params.id, { reason: 'Invalid authors' });
                return res.status(400).json({ error: 'One or more authors are invalid' });
            }
        }

        const category = await Category.findOne({ id: req.params.id }).lean();
        if (!category) {
            await logAction(req.session.user?.username || 'anonymous', 'category-update-failed', req.params.id, { reason: 'Not found' });
            return res.status(404).json({ error: 'Category not found' });
        }

        const updatedCategory = {
            ...category,
            name: name.trim(),
            editor,
            authors: authors || [],
            updatedAt: new Date(),
            id: category.id
        };

        await Category.updateOne({ id: req.params.id }, updatedCategory);
        await logAction(req.session.user?.username || 'anonymous', 'category-updated', updatedCategory.id, { changes: Object.keys(req.body) });

        res.json({ message: 'Category updated', category: updatedCategory });
    } catch (err) {
        await logAction(req.session.user?.username || 'anonymous', 'category-update-error', req.params.id, { error: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findOne({ id: req.params.id }).lean();
        if (!category) {
            await logAction(req.session.user?.username || 'anonymous', 'category-delete-failed', req.params.id, { reason: 'Not found' });
            return res.status(404).json({ error: 'Category not found' });
        }

        await Category.deleteOne({ id: req.params.id });
        await logAction(req.session.user?.username || 'anonymous', 'category-deleted', category.id, { name: category.name, editor: category.editor });

        res.json({ message: 'Category deleted successfully', deleted: category });
    } catch (err) {
        await logAction(req.session.user?.username || 'anonymous', 'category-delete-error', req.params.id, { error: err.message });
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { create, getAll, getById, update, deleteCategory };