const mongoose = require("mongoose");

const VisitSchema = new mongoose.Schema({
    path: String,              // e.g. '/posts/some-slug' or '/'
    userId: { type: String, default: null }, // null = anonymous
    ip: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now }
});
VisitSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Visit', VisitSchema);

