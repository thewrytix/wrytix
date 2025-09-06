const mongoose = require('mongoose');

const PendingUserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['author', 'editor'], required: true },
    avatar: { type: String }, // base64 or URL
    status: { type: String, enum: ['pending'], default: 'pending' },
    requestedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PendingUser', PendingUserSchema);
