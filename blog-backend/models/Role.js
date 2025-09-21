const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    permissions: [{ type: String }],
    hierarchyLevel: { type: Number, required: true },
    track: {
        type: String,
        enum: ['foundation', 'content', 'advertising', 'platform'],
        default: 'foundation'
    },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date }
});

module.exports = mongoose.model('Role', RoleSchema);

