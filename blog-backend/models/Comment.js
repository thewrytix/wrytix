const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    postSlug: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String },
    content: { type: String, required: true },
    status: { type: String, enum: ['approved', 'pending', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', CommentSchema);
