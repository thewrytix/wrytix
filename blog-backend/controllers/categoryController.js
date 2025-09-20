const { Category, User } = require('../models');
const { logAction } = require('../utils/logger');

module.exports = {
    getAll: async (req, res) => {
        try {
            const categories = await Category.find().lean();
            const users = await User.find({ role: { $in: ['editor', 'author'] } }).lean();

            const enriched = categories.map(cat => {
                const editor = users.find(u => u._id.toString() === cat.editor);
                const authors = users.filter(u => (cat.authors || []).includes(u._id.toString()));
                return {
                    ...cat,
                    editorName: editor ? editor.fullname || editor.username : 'N/A',
                    authors: authors.map(a => ({ id: a._id, name: a.fullname || a.username }))
                };
            });

            res.json(enriched);
        } catch (err) {
            console.error('Error fetching categories:', err);
            res.status(500).json({ error: 'Failed to fetch categories', details: err.message });
        }
    },

    getById: async (req, res) => {
        try {
            // Use findOne with custom id field instead of findById
            const cat = await Category.findOne({ id: req.params.id }).lean();
            if (!cat) {
                return res.status(404).json({ error: 'Category not found' });
            }
            const users = await User.find({ role: { $in: ['editor', 'author'] } }).lean();
            const editor = users.find(u => u._id.toString() === cat.editor);
            const authors = users.filter(u => (cat.authors || []).includes(u._id.toString()));
            res.json({
                ...cat,
                editorName: editor ? editor.fullname || editor.username : 'N/A',
                authors: authors.map(a => ({ id: a._id, name: a.fullname || a.username }))
            });
        } catch (err) {
            console.error('Error fetching category:', err);
            res.status(500).json({ error: 'Failed to fetch category', details: err.message });
        }
    },

    create: async (req, res) => {
        try {
            const { name, editor, authors } = req.body;
            if (!name || !editor) {
                return res.status(400).json({ error: 'Name and editor are required' });
            }

            // Validate editor and authors exist
            const editorUser = await User.findById(editor);
            if (!editorUser || editorUser.role !== 'editor') {
                return res.status(400).json({ error: 'Invalid or non-editor user selected' });
            }
            if (authors && authors.length) {
                const authorUsers = await User.find({ _id: { $in: authors }, role: 'author' });
                if (authorUsers.length !== authors.length) {
                    return res.status(400).json({ error: 'One or more authors are invalid' });
                }
            }

            // Generate a custom ID (you may want to use UUID or a different method)
            const customId = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');

            const newCat = await Category.create({
                id: customId, // Set the custom string ID
                name: name.trim(),
                editor,
                authors: authors || [],
                updatedAt: new Date()
            });

            logAction(req.user?._id || 'unknown', 'create_category', `Created category ${newCat.id}`);
            res.status(201).json(newCat.toObject());
        } catch (err) {
            console.error('Error creating category:', err);
            res.status(500).json({ error: 'Failed to create category', details: err.message });
        }
    },

    update: async (req, res) => {
        try {
            const { name, editor, authors } = req.body;
            if (!name || !editor) {
                return res.status(400).json({ error: 'Name and editor are required' });
            }

            // Validate editor and authors exist
            const editorUser = await User.findById(editor);
            if (!editorUser || editorUser.role !== 'editor') {
                return res.status(400).json({ error: 'Invalid or non-editor user selected' });
            }
            if (authors && authors.length) {
                const authorUsers = await User.find({ _id: { $in: authors }, role: 'author' });
                if (authorUsers.length !== authors.length) {
                    return res.status(400).json({ error: 'One or more authors are invalid' });
                }
            }

            // Use findOneAndUpdate with custom id field
            const updated = await Category.findOneAndUpdate(
                { id: req.params.id }, // Query by custom id field
                { name: name.trim(), editor, authors: authors || [], updatedAt: new Date() },
                { new: true, runValidators: true }
            ).lean();

            if (!updated) {
                return res.status(404).json({ error: 'Category not found' });
            }

            logAction(req.user?._id || 'unknown', 'update_category', `Updated category ${req.params.id}`);
            res.json(updated);
        } catch (err) {
            console.error('Error updating category:', err);
            res.status(500).json({ error: 'Failed to update category', details: err.message });
        }
    },

    remove: async (req, res) => {
        try {
            // Use findOneAndDelete with custom id field
            const deleted = await Category.findOneAndDelete({ id: req.params.id });
            if (!deleted) {
                return res.status(404).json({ error: 'Category not found' });
            }
            logAction(req.user?._id || 'unknown', 'delete_category', `Deleted category ${req.params.id}`);
            res.json({ message: 'Category deleted', deleted: deleted.toObject() });
        } catch (err) {
            console.error('Error deleting category:', err);
            res.status(500).json({ error: 'Failed to delete category', details: err.message });
        }
    }
};