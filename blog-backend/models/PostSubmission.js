const PostSubmissionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    author: { type: String },            // display name (could be submittedBy's full name)
    submittedBy: { type: String, required: true }, // username of submitter
    category: { type: String, required: true },
    thumbnail: { type: String, required: true },
    content: { type: String, required: true },
    source: { type: String },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    assignedEditor: { type: String, default: null },
    editorComments: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    reviewedBy: { type: String },
    reviewedAt: { type: Date }
});

module.exports = mongoose.model('PostSubmission', PostSubmissionSchema);
