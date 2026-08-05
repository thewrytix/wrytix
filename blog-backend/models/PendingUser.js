const mongoose = require('mongoose');

const PendingUserSchema = new mongoose.Schema({
    fullname: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['viewer', 'author', 'editor', 'admin'], required: true },
    avatarId: { type: Schema.Types.ObjectId, ref: 'fs.files' }, // GridFS ID for avatar
    pdfId: { type: Schema.Types.ObjectId, ref: 'fs.files' }, // GridFS ID for PDF
    status: { type: String, enum: ['pending'], default: 'pending' },
    lineManager: { type: String, default: null },
    assignedCategories: { type: [String], default: [] },
    submittedBy: { type: String, default: null },
    requestedAt: { type: Date, default: Date.now },
    pdfOriginalName: { type: String }
});

module.exports = mongoose.model('PendingUser', PendingUserSchema);