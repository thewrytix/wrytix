// models/index.js
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// User Schema
const UserSchema = new mongoose.Schema({
    id: { type: String, unique: true },
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
    createdBy: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: null }, // added for issue #7
    pdfFilename: { type: String },
    pdfOriginalName: { type: String }
});

const PostSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    author: { type: String, required: true }, // Add author
    category: { type: String, required: true }, // Add category
    thumbnail: { type: String, required: true }, // Add for base64 thumbnail
    content: { type: String, required: true }, // Make content required
    excerpt: { type: String, maxlength: 200 }, // NEW: Optional summary for meta descriptions
    source: { type: String, required: true },
    featured: { type: Boolean, default: false }, //
    schedule: { type: Date },
    submittedBy: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date }, // NEW: Add this to match your pre-save hook
    isPublished: { type: Boolean, default: false },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    views: { type: Number, default: 0 },
    lastViewed: { type: Date },

});


const AdSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    type: { type: String, enum: ['image', 'video', 'embed', 'text'], required: true },
    content: { type: String }, // optional now
    link: { type: String },
    html: { type: String },
    text: { type: String},
    file: { type: String },
    category: { type: String, required: true },
    position: { type: String},
    company: { type: String, default: '' },
    thumbnail: { type: String },
    active: { type: Boolean, default: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    createdAt: { type: Date, default: Date.now }
});


const CommentSchema = new Schema({
    slug: { type: String, required: true },
    comments: [{
        username: { type: String, required: true },
        comment: { type: String, required: true },
        timestamp: { type: Date, required: true },
    }],
});

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
    thumbnail: { type: String, required: true },
    category: { type: String, required: true },
    author: { type: String, required: true }, // Author submitting
    content: { type: String },
    slug: { type: String, required: true, unique: true },
    source: { type: String, required: true },
    featured: { type: Boolean, default: false }, // Add featured
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



// Category Schema
const CategorySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    editor: { type: String, default: null }, // no longer required — can be unassigned until admin sets one
    authors: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
});



//Headline Schema
const HeadlineSchema = new mongoose.Schema({
    title: { type: String, required: true },
    link: { type: String },
    category: { type: String },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const VisitSchema = new mongoose.Schema({
    path: String,
    userId: { type: String, default: null },
    ip: String,
    country: { type: String, default: 'Unknown' }, // NEW — ISO country code, resolved at write time
    userAgent: String,
    timestamp: { type: Date, default: Date.now }
});


const MaintenanceTaskSchema = new mongoose.Schema({
    title: String,
    description: String,
    priority: { type: String, enum: ['low', 'medium', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['open', 'done'], default: 'open' },
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
});

const SystemConfigSchema = new mongoose.Schema({
    maintenanceMode: { type: Boolean, default: false },
    updatedBy: String,
    updatedAt: { type: Date, default: Date.now }
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
    Category: mongoose.model('Category', CategorySchema),
    Headline: mongoose.model('Headline', HeadlineSchema),
    Visit: mongoose.model('Visit', VisitSchema),
    MaintenanceTask:mongoose.model('MaintenanceTask', MaintenanceTaskSchema) ,
    SystemConfig: mongoose.model('SystemConfig', SystemConfigSchema),
};