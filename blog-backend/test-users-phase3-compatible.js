// ==========================
// 🧪 Test Suite - Phase 3 Compatible User System
// ==========================

const fs = require('fs');
const path = require('path');

// Import the modules we're testing
const User = require('./models/User');
const PendingUser = require('./models/PendingUser');
const PendingDeletion = require('./models/PendingDeletion');

// Test configuration - matching your server.js file paths
const TEST_CONFIG = {
    USERS_FILE: './users.json',
    PENDING_USERS_FILE: './pendingUsers.json',
    PENDING_DELETIONS_FILE: './pendingDeletions.json',
    BACKUP_SUFFIX: '.test-backup'
};

// Test data
const TEST_DATA = {
    users: [
        {
            id: 1,
            username: 'testuser1',
            email: 'test1@example.com',
            password: '$2b$10$hashedpassword1',
            role: 'editor',
            createdAt: new Date().toISOString(),
            isActive: true
        },
        {
            id: 2,
            username: 'testuser2',
            email: 'test2@example.com',
            password: '$2b$10$hashedpassword2',
            role: 'reader',
            createdAt: new Date().toISOString(),
            isActive: true
        }
    ],
    pendingUsers: [
        {
            id: 1,
            username: 'pendinguser1',
            email: 'pending@example.com',
            password: '$2b$10$hashedpasswordpending',
            submittedAt: new Date().toISOString(),
            pdfPath: './uploads/cv/pending-user-cv.pdf'
        }
    ],
    pendingDeletions: [
        {
            id: 1,
            userId: 2,
            username: 'testuser2',
            requestedAt: new Date().toISOString(),
            reason: 'User requested account deletion'
        }
    ]
};

// Utility functions
function backupFile(filePath) {
    const backupPath = filePath + TEST_CONFIG.BACKUP_SUFFIX;
    if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, backupPath);
        console.log(`📦 Backed up: ${filePath}`);
    }
}

function restoreFile(filePath) {
    const backupPath = filePath + TEST_CONFIG.BACKUP_SUFFIX;
    if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, filePath);
        fs.unlinkSync(backupPath);
        console.log(`🔄 Restored: ${filePath}`);
    }
}

function ensureDataDirectory() {
    const dataDir = path.dirname(TEST_CONFIG.USERS_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`📁 Created directory: ${dataDir}`);
    }
}

function initializeTestData() {
    try {
        console.log('🔧 Initializing test data...');

        // Ensure data directory exists
        ensureDataDirectory();

        // Backup existing files
        backupFile(TEST_CONFIG.USERS_FILE);
        backupFile(TEST_CONFIG.PENDING_USERS_FILE);
        backupFile(TEST_CONFIG.PENDING_DELETIONS_FILE);

        // Write test data - Fixed: Direct file writing with your server.js structure
        fs.writeFileSync(TEST_CONFIG.USERS_FILE, JSON.stringify(TEST_DATA.users, null, 2));
        fs.writeFileSync(TEST_CONFIG.PENDING_USERS_FILE, JSON.stringify(TEST_DATA.pendingUsers, null, 2));
        fs.writeFileSync(TEST_CONFIG.PENDING_DELETIONS_FILE, JSON.stringify(TEST_DATA.pendingDeletions, null, 2));

        console.log('✅ Test data initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize test data:', error.message);
        return false;
    }
}

function cleanupTestData() {
    try {
        console.log('🧹 Cleaning up test data...');

        // Restore original files
        restoreFile(TEST_CONFIG.USERS_FILE);
        restoreFile(TEST_CONFIG.PENDING_USERS_FILE);
        restoreFile(TEST_CONFIG.PENDING_DELETIONS_FILE);

        console.log('✅ Cleanup completed');
    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
    }
}

async function testPhase3Compatible() {
    console.log('🧪 Testing Phase 3 - Compatible User System...');

    // Initialize test data
    if (!initializeTestData()) {
        console.log('❌ Test setup failed');
        return false;
    }

    let allTestsPassed = true;
    const results = {
        userModel: false,
        pendingUserModel: false,
        pendingDeletionModel: false,
        integration: false
    };

    try {
        // Test 1: User Model
        console.log('\n📋 Testing User Model...');

        // Test getAllUsers
        const users = User.getAllUsers();
        if (users.length === 2) {
            console.log('✅ getAllUsers: Found 2 users');
            results.userModel = true;
        } else {
            console.log(`❌ getAllUsers: Expected 2 users, got ${users.length}`);
            allTestsPassed = false;
        }

        // Test getUserById
        const user = User.getUserById(1);
        if (user && user.username === 'testuser1') {
            console.log('✅ getUserById: Found user by ID');
        } else {
            console.log('❌ getUserById: Failed to find user');
            allTestsPassed = false;
        }

        // Test getUserByUsername
        const userByName = User.getUserByUsername('testuser2');
        if (userByName && userByName.id === 2) {
            console.log('✅ getUserByUsername: Found user by username');
        } else {
            console.log('❌ getUserByUsername: Failed to find user');
            allTestsPassed = false;
        }

        // Test getUserByEmail
        const userByEmail = User.getUserByEmail('test1@example.com');
        if (userByEmail && userByEmail.id === 1) {
            console.log('✅ getUserByEmail: Found user by email');
        } else {
            console.log('❌ getUserByEmail: Failed to find user');
            allTestsPassed = false;
        }

        // Test createUser
        const newUser = {
            username: 'newuser',
            email: 'new@example.com',
            password: '$2b$10$hashedpasswordnew',
            role: 'reader'
        };

        const createdUser = User.createUser(newUser);
        if (createdUser && createdUser.id === 3) {
            console.log('✅ createUser: Successfully created new user');
        } else {
            console.log('❌ createUser: Failed to create user');
            allTestsPassed = false;
        }

        // Test updateUser
        const updatedUser = User.updateUser(3, { role: 'editor' });
        if (updatedUser && updatedUser.role === 'editor') {
            console.log('✅ updateUser: Successfully updated user');
        } else {
            console.log('❌ updateUser: Failed to update user');
            allTestsPassed = false;
        }

        // Test deleteUser
        const deleted = User.deleteUser(3);
        if (deleted) {
            console.log('✅ deleteUser: Successfully deleted user');
        } else {
            console.log('❌ deleteUser: Failed to delete user');
            allTestsPassed = false;
        }

        // Test 2: PendingUser Model
        console.log('\n📋 Testing PendingUser Model...');

        const pendingUsers = PendingUser.getAllPendingUsers();
        if (pendingUsers.length === 1) {
            console.log('✅ getAllPendingUsers: Found 1 pending user');
            results.pendingUserModel = true;
        } else {
            console.log(`❌ getAllPendingUsers: Expected 1 pending user, got ${pendingUsers.length}`);
            allTestsPassed = false;
        }

        const pendingUser = PendingUser.getPendingUserById(1);
        if (pendingUser && pendingUser.username === 'pendinguser1') {
            console.log('✅ getPendingUserById: Found pending user');
        } else {
            console.log('❌ getPendingUserById: Failed to find pending user');
            allTestsPassed = false;
        }

        // Test 3: PendingDeletion Model
        console.log('\n📋 Testing PendingDeletion Model...');

        const pendingDeletions = PendingDeletion.getAllPendingDeletions();
        if (pendingDeletions.length === 1) {
            console.log('✅ getAllPendingDeletions: Found 1 pending deletion');
            results.pendingDeletionModel = true;
        } else {
            console.log(`❌ getAllPendingDeletions: Expected 1 pending deletion, got ${pendingDeletions.length}`);
            allTestsPassed = false;
        }

        const pendingDeletion = PendingDeletion.getPendingDeletionById(1);
        if (pendingDeletion && pendingDeletion.userId === 2) {
            console.log('✅ getPendingDeletionById: Found pending deletion');
        } else {
            console.log('❌ getPendingDeletionById: Failed to find pending deletion');
            allTestsPassed = false;
        }

        // Test 4: Integration Test
        console.log('\n📋 Testing Integration...');

        // Test user search functionality
        const searchResults = User.searchUsers('test');
        if (searchResults.length >= 1) {
            console.log('✅ searchUsers: Found users matching search term');
            results.integration = true;
        } else {
            console.log('❌ searchUsers: Failed to find matching users');
            allTestsPassed = false;
        }

        // Test pagination
        const paginatedUsers = User.getUsersPaginated(1, 1);
        if (paginatedUsers.users && paginatedUsers.users.length === 1 && paginatedUsers.pagination) {
            console.log('✅ getUsersPaginated: Pagination working correctly');
        } else {
            console.log('❌ getUsersPaginated: Pagination failed');
            console.log('Debug - Paginated result:', JSON.stringify(paginatedUsers, null, 2));
            allTestsPassed = false;
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
        allTestsPassed = false;
    } finally {
        // Always cleanup
        cleanupTestData();
    }

    // Results Summary
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    console.log(`User Model: ${results.userModel ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`PendingUser Model: ${results.pendingUserModel ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`PendingDeletion Model: ${results.pendingDeletionModel ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Integration: ${results.integration ? '✅ PASS' : '❌ FAIL'}`);
    console.log('========================');

    if (allTestsPassed) {
        console.log('🎉 ALL TESTS PASSED! Phase 3 is ready for integration.');
        return true;
    } else {
        console.log('❌ Some tests failed. Please check the issues above.');
        return false;
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testPhase3Compatible()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Test suite crashed:', error);
            process.exit(1);
        });
}

module.exports = {
    testPhase3Compatible,
    initializeTestData,
    cleanupTestData,
    TEST_CONFIG,
    TEST_DATA
};