const mongoose = require('mongoose');

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

PostSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

PostSchema.index({ schedule: -1 });

module.exports = mongoose.model('Post', PostSchema);