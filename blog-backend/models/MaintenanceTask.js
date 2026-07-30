const mongoose = require("mongoose");
const MaintenanceTaskSchema = new mongoose.Schema({
    title: String,
    description: String,
    priority: { type: String, enum: ['low', 'medium', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['open', 'done'], default: 'open' },
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Maintenance', MaintenanceTaskSchema);