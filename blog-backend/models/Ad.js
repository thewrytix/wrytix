const mongoose = require('mongoose');

const AdSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    type: { type: String, enum: ['image', 'video', 'embed', 'text'], required: true },
    content: { type: String }, // optional now
    link: { type: String },
    html: { type: String },
    text: { type: String},
    file: { type: String },
    category: { type: String, required: true },
    company: { type: String, default: '' },
    thumbnail: { type: String },
    active: { type: Boolean, default: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ad', AdSchema);