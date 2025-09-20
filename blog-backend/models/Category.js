// models/index.js
const mongoose = require('mongoose');


// Category Schema
const CategorySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // UUID or custom ID
    name: { type: String, required: true, unique: true }, // category name
    editor: { type: String, required: true }, // editor ID or username
    authors: { type: [String], default: [] }, // list of author IDs or usernames
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
});

module.exports = mongoose.model('Category', CategorySchema);


