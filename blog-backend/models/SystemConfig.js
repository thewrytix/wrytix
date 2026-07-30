const mongoose = require("mongoose");

const SystemConfigSchema = new mongoose.Schema({
    maintenanceMode: { type: Boolean, default: false },
    updatedBy: String,
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SystemConfig', SystemConfigSchema);

