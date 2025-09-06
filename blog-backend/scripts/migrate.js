const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import models
const User = require('../models/User');
const PendingUser = require('../models/PendingUser');
const Post = require('../models/Post');
const Ad = require('../models/Ad');
const Comment = require('../models/Comment');
const PostSubmission = require('../models/PostSubmission');
const Log = require('../models/Log');
const Headline = require('../models/Headline');
const PendingDeletion = require('../models/PendingDeletion');

// Path to JSON data
const dataDir = path.join(__dirname, '../data');

// 🔑 Helper: remove duplicates based on a field
function removeDuplicates(arr, key) {
    const seen = new Set();
    return arr.filter(item => {
        if (!item[key]) return true; // keep items with no key
        if (seen.has(item[key])) return false;
        seen.add(item[key]);
        return true;
    });
}

// 🔑 Helper: safe load + migrate
async function migrateCollection(Model, fileName, name, uniqueKey = null, mapFn = null) {
    try {
        const filePath = path.join(dataDir, fileName);
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ Skipped ${name}: file not found`);
            return;
        }

        let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (!Array.isArray(data) || data.length === 0) {
            console.log(`⚠️ Skipped ${name}: no data`);
            return;
        }

        if (uniqueKey) data = removeDuplicates(data, uniqueKey);
        if (mapFn) data = data.map(mapFn);

        await Model.insertMany(data, { ordered: false }); // skip duplicates
        console.log(`✅ Migrated ${data.length} ${name}`);
    } catch (err) {
        console.error(`❌ ${name} migration error:`, err.message);
    }
}

const migrate = async () => {
    await mongoose.connect("mongodb+srv://wrytix_admin:Kylerlee149143123.@cluster0.jorn0pz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

    await migrateCollection(User, 'users.json', 'users', 'username');
    await migrateCollection(PendingUser, 'pendingUsers.json', 'pending users', 'username');
    await migrateCollection(Post, 'posts.json', 'posts', 'slug');
    await migrateCollection(Ad, 'ads.json', 'ads', null, ad => ({
        ...ad,
        content: ad.content || ad.thumbnail || "" // fallback
    }));
    await migrateCollection(Comment, 'comments.json', 'comments');
    await migrateCollection(PostSubmission, 'postSubmissions.json', 'post submissions', 'slug');
    await migrateCollection(Log, 'logs.json', 'logs');
    await migrateCollection(Headline, 'headlines.json', 'headlines');
    await migrateCollection(PendingDeletion, 'pendingDeletions.json', 'pending deletions');

    mongoose.disconnect();
};

migrate().catch(err => console.error(err));
