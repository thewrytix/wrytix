const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    fullname: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatarId: { type: Schema.Types.ObjectId, ref: 'fs.files' }, // GridFS ID for avatar
    pdfId: { type: Schema.Types.ObjectId, ref: 'fs.files' }, // GridFS ID for PDF
    role: { type: String,  enum: [
            'viewer',              // Level 1
            'author',              // Level 2
            'editor',              // Level 3 - Content track
            'content_manager',     // Level 4 - Content track
            'ad_specialist',       // Level 3 - Ad track
            'ad_manager',          // Level 4 - Ad track
            'moderator',           // Level 5 - Platform track
            'administrator',       // Level 6 - Platform track
            'super_administrator'  // Level 7 - Platform track
        ], default: 'viewer' },
    status: { type: String, enum: ['active', 'inactive', 'pending', 'suspended'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    pdfFilename: { type: String },
    pdfOriginalName: { type: String }
});

module.exports = mongoose.model('User', UserSchema);
