const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    fullname: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatarId: { type: Schema.Types.ObjectId, ref: 'fs.files' }, // GridFS ID for avatar
    pdfId: { type: Schema.Types.ObjectId, ref: 'fs.files' }, // GridFS ID for PDF
    role: { type: String, enum: ['admin', 'editor', 'author', 'viewer'], default: 'viewer' },
    status: { type: String, enum: ['active', 'inactive', 'pending', 'suspended'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    pdfFilename: { type: String },
    pdfOriginalName: { type: String }
});

module.exports = mongoose.model('User', UserSchema);
