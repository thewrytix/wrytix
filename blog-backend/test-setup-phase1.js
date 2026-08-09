// ============================
// 🧪 Test Setup - Verify Phase 1 Works
// ============================

console.log('Testing Phase 1 setup...\n');

try {
    // Test paths
    console.log('1. Testing paths...');
    const PATHS = require('./config/paths');
    console.log('✅ Paths loaded successfully');
    console.log('   Users path:', PATHS.users);
    console.log('   Posts path:', PATHS.posts);

    // Test JSON helpers
    console.log('\n2. Testing JSON helpers...');
    const { readJson, writeJson } = require('./utils/jsonHelpers');
    console.log('✅ JSON helpers loaded successfully');

    // Test logger
    console.log('\n3. Testing logger...');
    const { logAction } = require('./config/logger');
    console.log('✅ Logger loaded successfully');

    // Test auth middleware
    console.log('\n4. Testing auth middleware...');
    const { requireAdmin, requireLogin } = require('./middleware/auth');
    console.log('✅ Auth middleware loaded successfully');

    // Test a simple file operation
    console.log('\n5. Testing file operations...');
    const testData = [{ test: 'data', timestamp: new Date().toISOString() }];
    writeJson(PATHS.logs, testData);
    const readData = readJson(PATHS.logs);
    console.log('✅ File operations working');
    console.log('   Written and read:', readData.length, 'items');

    // Test logging
    console.log('\n6. Testing logging...');
    logAction('test-user', 'setup-test', 'system', { phase: 1 });
    console.log('✅ Logging working');

    console.log('\n🎉 All Phase 1 components working correctly!');
    console.log('\nYou can now start integrating these into your server.js');

} catch (error) {
    console.error('\n❌ Setup test failed:');
    console.error('Error:', error.message);
    console.error('\nPlease check:');
    console.error('1. All files are in correct directories');
    console.error('2. Directory structure exists (config/, utils/, middleware/)');
    console.error('3. All dependencies are installed');
    console.error('\nFull error:');
    console.error(error);
}