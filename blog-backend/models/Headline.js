const mongoose = require('mongoose');

const HeadlineSchema = new mongoose.Schema({
    title: { type: String, required: true },
    link: { type: String },
    category: { type: String },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Headline', HeadlineSchema);
