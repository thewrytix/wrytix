// models/index.js
const mongoose = require('mongoose');


// Category Schema
const CategorySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    editor: { type: String, default: null }, // no longer required — can be unassigned until admin sets one
    authors: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
});

module.exports = mongoose.model('Category', CategorySchema);





