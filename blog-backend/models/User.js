const mongoose = require('mongoose');


const UserSchema = new mongoose.Schema({
    fullname: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatarId: { type: Schema.Types.ObjectId, ref: 'fs.files', default: null },
    pdfId: { type: Schema.Types.ObjectId, ref: 'fs.files', default: null },
    role: { type: String, enum: ['admin', 'editor', 'author', 'viewer'], default: 'viewer' },
    status: { type: String, enum: ['active', 'inactive', 'pending', 'suspended'], default: 'pending' },
    assignedCategories: { type: [String], default: [] },
    lineManager: { type: String, default: null },
    submittedBy: { type: String, default: null },
    createdBy: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: null }, // added for issue #7
    pdfFilename: { type: String },
    pdfOriginalName: { type: String }
});

module.exports = mongoose.model('User', UserSchema);