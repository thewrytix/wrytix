const mongoose = require('mongoose');

console.log('=== Loading Ad model ===');
console.log('Mongoose available:', !!mongoose);

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

console.log('AdSchema created successfully');

try {
    const AdModel = mongoose.model('Ad', AdSchema);
    console.log('Ad model created successfully');
    console.log('Ad model type:', typeof AdModel);
    module.exports = AdModel;
} catch (error) {
    console.error('=== ERROR creating Ad model ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);

    // Try the safe pattern if direct creation fails
    console.log('Trying safe pattern...');
    try {
        const SafeAdModel = mongoose.models.Ad || mongoose.model('Ad', AdSchema);
        console.log('Safe Ad model created successfully');
        module.exports = SafeAdModel;
    } catch (safeError) {
        console.error('Safe pattern also failed:', safeError.message);
        module.exports = null;
    }
}