// models/index.js
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// User Schema
const UserSchema = new Schema({
    id: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
    status: { type: String, default: 'active' },
    createdAt: { type: Date, default: Date.now },
    approvedBy: { type: String },
    approvedAt: { type: Date },
});

const PostSchema = new Schema({
    id: { type: String, unique: true }, // Optional, remove if not used
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    author: { type: String, required: true }, // Add author
    category: { type: String, required: true }, // Add category
    thumbnail: { type: String }, // Add for base64 thumbnail
    content: { type: String, required: true }, // Make content required
    source: { type: String }, // Add source
    featured: { type: Boolean, default: false }, // Add featured
    schedule: { type: Date },
    createdAt: { type: Date, default: Date.now },
    isPublished: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    lastViewed: { type: Date },
});

const AdSchema = new Schema({
    id: { type: String, required: true, unique: true },
    type: { type: String },
    category: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    link: { type: String, default: '' },
    company: { type: String, default: '' },
    html: { type: String, default: '' },
    text: { type: String, default: '' },
    file: { type: String, default: '' },
    active: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
});

const CommentSchema = new Schema({
    slug: { type: String, required: true },
    comments: [{
        username: { type: String, required: true },
        comment: { type: String, required: true },
        timestamp: { type: Date, required: true },
    }],
});

const PendingUserSchema = new Schema({
    id: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String },
    submittedBy: { type: String },
    createdAt: { type: Date, default: Date.now },
    pdfFilename: { type: String },
    pdfOriginalName: { type: String },
});

const PendingDeletionSchema = new Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    reason: { type: String, required: true },
    targetUsername: { type: String },
    targetEmail: { type: String },
    targetRole: { type: String },
    targetFullName: { type: String },
    targetAvatar: { type: String },
    requestedBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, default: 'pending' },
});

const PostSubmissionSchema = new Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    content: { type: String },
    slug: { type: String, required: true, unique: true },
    status: { type: String, default: 'pending' },
    submittedBy: { type: String, required: true },
    editorComments: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    schedule: { type: Date },
});

const LogSchema = new Schema({
    id: { type: String, required: true, unique: true },
    actor: { type: String, default: 'system' },
    action: { type: String, required: true },
    target: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    reason: { type: String },
    error: { type: String },
    changes: { type: [String] },
    role: { type: String },
    method: { type: String },
    commentLength: { type: Number },
    views: { type: Number },
    scheduled: { type: Date },
    deletedUserId: { type: String },
    targetUsername: { type: String },
    targetEmail: { type: String },
    targetRole: { type: String },
    targetFullName: { type: String },
    targetAvatar: { type: String },
    requestedBy: { type: String },
});

module.exports = {
    User: mongoose.model('User', UserSchema),
    Post: mongoose.model('Post', PostSchema),
    Ad: mongoose.model('Ad', AdSchema),
    Comment: mongoose.model('Comment', CommentSchema),
    PendingUser: mongoose.model('PendingUser', PendingUserSchema),
    PendingDeletion: mongoose.model('PendingDeletion', PendingDeletionSchema),
    PostSubmission: mongoose.model('PostSubmission', PostSubmissionSchema),
    Log: mongoose.model('Log', LogSchema),
};