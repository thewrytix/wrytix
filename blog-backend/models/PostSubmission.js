const mongoose = require('mongoose');

const PostSubmissionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true },
    author: { type: String, required: true }, // Author submitting
    category: { type: String, required: true },
    thumbnail: { type: String },
    content: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    submittedAt: { type: Date, default: Date.now },
    reviewedBy: { type: String }, // Editor/Admin
    reviewedAt: { type: Date }
});

module.exports = mongoose.model('PostSubmission', PostSubmissionSchema);
