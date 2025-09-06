const mongoose = require('mongoose');

const AdSchema = new mongoose.Schema({
    type: { type: String, enum: ['image', 'video', 'embed', 'text'], required: true },
    content: { type: String }, // optional now
    link: { type: String },
    category: { type: String, required: true },
    thumbnail: { type: String },
    active: { type: Boolean, default: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ad', AdSchema);
