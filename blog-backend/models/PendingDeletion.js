const mongoose = require('mongoose');

const PendingDeletionSchema = new mongoose.Schema({
    targetId: { type: String, required: true }, // ID of the user/post/ad/etc. pending deletion
    targetType: {
        type: String,
        enum: ['user', 'post', 'ad', 'comment'],
        required: true
    }, // what is being deleted
    requestedBy: { type: String, required: true }, // username or userId of requester
    reason: { type: String }, // optional reason for deletion
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    requestedAt: { type: Date, default: Date.now },
    reviewedBy: { type: String }, // admin who approved/rejected
    reviewedAt: { type: Date }
});

module.exports = mongoose.model('PendingDeletion', PendingDeletionSchema);
