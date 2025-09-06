const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    action: { type: String, required: true }, // e.g., "User Created", "Ad Deleted"
    performedBy: { type: String, required: true }, // user ID or username
    details: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', LogSchema);
