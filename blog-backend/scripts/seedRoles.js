const mongoose = require('mongoose');
const Role = require('../models/Role');
const { connectDB } = require('../config/database');

async function seedRoles() {
    try {
        await connectDB();
        const existingRoles = await Role.countDocuments();
        if (existingRoles > 0) {
            console.log('Roles already seeded');
            mongoose.connection.close();
            return;
        }

        const roles = [
            { name: 'viewer', permissions: ['view_posts'], hierarchyLevel: 1 },
            { name: 'author', permissions: ['create_post', 'view_posts'], hierarchyLevel: 2 },
            { name: 'editor', permissions: ['create_post', 'edit_post', 'delete_post', 'view_posts'], hierarchyLevel: 3 },
            { name: 'admin', permissions: ['create_user', 'edit_user', 'delete_user', 'create_post', 'edit_post', 'delete_post', 'moderate_comments', 'manage_roles', 'view_posts'], hierarchyLevel: 4 },
            { name: 'superadmin', permissions: ['create_user', 'edit_user', 'delete_user', 'create_admin', 'edit_admin', 'delete_admin', 'create_post', 'edit_post', 'delete_post', 'moderate_comments', 'manage_roles', 'view_posts'], hierarchyLevel: 5 }
        ];

        await Role.deleteMany({});
        await Role.insertMany(roles);
        console.log('Roles seeded successfully');
        mongoose.connection.close();
    } catch (err) {
        console.error('Error seeding roles:', err);
        mongoose.connection.close();
        process.exit(1);
    }
}

seedRoles();