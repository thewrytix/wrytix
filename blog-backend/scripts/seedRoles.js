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
            // Foundation Level
            { name: 'reader', permissions: ['view_posts', 'view_public_content', 'view_ads'], hierarchyLevel: 1 },
            { name: 'author', permissions: ['create_post_submission', 'view_posts', 'edit_own_posts'], hierarchyLevel: 2 },

            // Content Track
            { name: 'editor', permissions: ['create_post', 'edit_post', 'publish_post', 'view_posts', 'manage_own_content', 'view_content_analytics'], hierarchyLevel: 3 },
            { name: 'content_manager', permissions: ['create_post', 'edit_post', 'publish_post', 'approve_posts', 'edit_any_post', 'delete_post', 'moderate_comments', 'manage_contributors', 'view_content_analytics', 'manage_categories'], hierarchyLevel: 4 },

            // Advertising Track
            { name: 'ad_specialist', permissions: ['create_ad', 'edit_own_ads', 'view_ads', 'schedule_ads', 'view_basic_ad_analytics'], hierarchyLevel: 3 },
            { name: 'ad_manager', permissions: ['create_ad', 'edit_ad', 'delete_ad', 'approve_ad', 'manage_ad_campaigns', 'view_ad_analytics', 'schedule_ads', 'manage_ad_budget', 'approve_ad_spending', 'manage_ad_specialists'], hierarchyLevel: 4 },

            // Platform Management Track
            { name: 'moderator', permissions: ['approve_posts', 'edit_any_post', 'delete_post', 'moderate_comments', 'manage_contributors', 'view_content_analytics', 'manage_categories', 'create_ad', 'edit_ad', 'delete_ad', 'approve_ad', 'manage_ad_campaigns', 'view_ad_analytics', 'manage_ad_budget', 'user_management', 'content_strategy', 'platform_analytics', 'manage_workflows'], hierarchyLevel: 5 },
            { name: 'administrator', permissions: ['create_post', 'edit_post', 'publish_post', 'approve_posts', 'edit_any_post', 'delete_post', 'moderate_comments', 'manage_contributors', 'manage_categories', 'create_ad', 'edit_ad', 'delete_ad', 'approve_ad', 'manage_ad_campaigns', 'view_ad_analytics', 'manage_ad_budget', 'approve_ad_spending', 'manage_users', 'manage_roles', 'system_settings', 'view_logs', 'full_platform_control', 'database_access', 'security_management'], hierarchyLevel: 6 },
            { name: 'super_administrator', permissions: ['create_post', 'edit_post', 'publish_post', 'approve_posts', 'edit_any_post', 'delete_post', 'moderate_comments', 'manage_contributors', 'manage_categories', 'create_ad', 'edit_ad', 'delete_ad', 'approve_ad', 'manage_ad_campaigns', 'view_ad_analytics', 'manage_ad_budget', 'approve_ad_spending', 'manage_users', 'manage_roles', 'system_settings', 'view_logs', 'full_platform_control', 'database_access', 'security_management', 'create_administrator', 'edit_administrator', 'delete_administrator', 'system_root_access'], hierarchyLevel: 7 }
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