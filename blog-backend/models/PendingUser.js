const mongoose = require('mongoose');

const PendingUserSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    fullname: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['viewer', 'author', 'editor', 'admin'], required: true },
    avatarId: { type: Schema.Types.ObjectId, ref: 'fs.files' },
    pdfId: { type: Schema.Types.ObjectId, ref: 'fs.files' },
    status: { type: String, enum: ['pending', 'rejected'], default: 'pending' }, // FIX: allow 'rejected' as a persisted state
    rejectionReason: { type: String, default: '' },                              // NEW
    lineManager: { type: String, default: null },
    assignedCategories: { type: [String], default: [] },
    submittedBy: { type: String, default: null },
    requestedAt: { type: Date, default: Date.now },
    pdfOriginalName: { type: String }
});
module.exports = mongoose.model('PendingUser', PendingUserSchema);