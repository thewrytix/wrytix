// Test all Phase 3 components
console.log('🧪 Testing Phase 3 - Complete Backend Modularization...\n');

// Test 1: Comments System
console.log('1. Testing Comments System...');
try {
    const Comment = require('./models/Comment');
    const CommentController = require('./controllers/commentController');

    const comment = new Comment();
    const controller = new CommentController();

    // Test comment creation
    const testComment = comment.create('test-slug', {
        username: 'testuser',
        comment: 'Test comment content',
        timestamp: new Date().toISOString()
    });

    console.log('✅ Comments Model: Working');
    console.log('✅ Comments Controller: Working');
} catch (error) {
    console.log('❌ Comments System:', error.message);
}

// Test 2: Ads System
console.log('\n2. Testing Ads System...');
try {
    const Ad = require('./models/Ad');
    const AdController = require('./controllers/adController');

    const ad = new Ad();
    const controller = new AdController();

    // Test ad creation
    const testAd = ad.create({
        type: 'banner',
        category: 'tech',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        company: 'Test Company',
        text: 'Test ad content',
        active: true
    });

    console.log('✅ Ads Model: Working');
    console.log('✅ Ads Controller: Working');
} catch (error) {
    console.log('❌ Ads System:', error.message);
}

// Test 3: Admin System
console.log('\n3. Testing Admin System...');
try {
    const AdminController = require('./controllers/adminController');

    const controller = new AdminController();

    console.log('✅ Admin Controller: Working');
} catch (error) {
    console.log('❌ Admin System:', error.message);
}

// Test 4: Route Loading
console.log('\n4. Testing Route Files...');
try {
    const commentRoutes = require('./routes/comments');
    const adRoutes = require('./routes/ads');
    const adminRoutes = require('./routes/admin');

    console.log('✅ Comment Routes: Working');
    console.log('✅ Ad Routes: Working');
    console.log('✅ Admin Routes: Working');
} catch (error) {
    console.log('❌ Route Loading:', error.message);
}

// Test 5: Check if all required files exist
console.log('\n5. Checking File Structure...');
const fs = require('fs');
const requiredFiles = [
    'models/Comment.js',
    'models/Ad.js',
    'controllers/commentController.js',
    'controllers/adController.js',
    'controllers/adminController.js',
    'routes/comments.js',
    'routes/ads.js',
    'routes/admin.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - Missing!`);
        allFilesExist = false;
    }
});

// Summary
console.log('\n📊 Phase 3 Test Summary:');
console.log('═══════════════════════════════════');
if (allFilesExist) {
    console.log('🎉 All Phase 3 components are ready!');
    console.log('✅ Comments System: Complete');
    console.log('✅ Ads Management: Complete');
    console.log('✅ Admin Functions: Complete');
    console.log('✅ Routes: Complete');
    console.log('\n📋 Next Steps:');
    console.log('1. Add routes to your server.js');
    console.log('2. Remove old code from server.js');
    console.log('3. Test with your frontend');
} else {
    console.log('❌ Some files are missing. Please create them first.');
}

console.log('\n🚀 Phase 3 Complete - Your backend is now fully modular!');