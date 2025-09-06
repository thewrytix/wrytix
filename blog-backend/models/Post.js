const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
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

PostSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Post', PostSchema);

