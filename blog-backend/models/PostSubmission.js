const mongoose = require('mongoose');

const PostSubmissionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    author: { type: String, required: true }, // Author submitting
    category: { type: String, required: true },
    thumbnail: { type: String, required: true },
    content: { type: String, required: true },
    source: { type: String, required: true },
    featured: { type: Boolean, default: false }, // Add featured
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    submittedAt: { type: Date, default: Date.now },
    reviewedBy: { type: String }, // Editor/Admin
    reviewedAt: { type: Date }
});

module.exports = mongoose.model('PostSubmission', PostSubmissionSchema);
