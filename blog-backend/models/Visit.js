const mongoose = require("mongoose");

const VisitSchema = new mongoose.Schema({
    path: String,
    userId: { type: String, default: null },
    ip: String,
    country: { type: String, default: 'Unknown' }, // NEW — ISO country code, resolved at write time
    userAgent: String,
    timestamp: { type: Date, default: Date.now }
});

VisitSchema.index({ timestamp: -1 });
VisitSchema.index({ country: 1 }); // NEW — supports geo aggregation

module.exports = mongoose.model('Visit', VisitSchema);

