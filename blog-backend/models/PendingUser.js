const mongoose = require('mongoose');

const PendingUserSchema = new mongoose.Schema({
    fullname: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['viewer', 'author', 'editor', 'admin'], required: true },
    avatar: { type: String }, // File path or URL
    status: { type: String, enum: ['pending'], default: 'pending' },
    requestedAt: { type: Date, default: Date.now },
    submittedBy: { type: String },
    pdfFilename: { type: String },
    pdfOriginalName: { type: String }
});

module.exports = mongoose.model('PendingUser', PendingUserSchema);