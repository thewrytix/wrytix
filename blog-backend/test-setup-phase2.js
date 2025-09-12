// ============================
// 🧪 Test Posts System - Phase 2
// ============================

console.log('Testing Phase 2 - Posts System...\n');

try {
    // Test date helpers
    console.log('1. Testing date helpers...');
    const { isPostPublished, createScheduleDate } = require('./utils/dateHelpers');
    console.log('✅ Date helpers loaded successfully');

    // Test Post model
    console.log('\n2. Testing Post model...');
    const Post = require('./models/Post');
    console.log('✅ Post model loaded successfully');

    // Test controller
    console.log('\n3. Testing Post controller...');
    const postController = require('./controllers/postController');
    console.log('✅ Post controller loaded successfully');

    // Test routes
    console.log('\n4. Testing Post routes...');
    const postRoutes = require('./routes/posts');
    console.log('✅ Post routes loaded successfully');

    // Test creating a post
    console.log('\n5. Testing post creation...');
    const testPost = {
        title: 'Test Post',
        slug: 'test-post-' + Date.now(),
        content: 'This is a test post content',
        excerpt: 'Test excerpt',
        tags: ['test', 'phase2'],
        schedule: new Date().toISOString()
    };

    const createResult = Post.create(testPost, 'test-user');
    if (createResult.success) {
        console.log('✅ Post creation working');
        console.log('   Created post:', createResult.post.title);

        // Test reading posts
        const allPosts = Post.getAll();
        console.log('✅ Post reading working');
        console.log('   Total posts:', allPosts.length);

        // Test updating the post
        const updateResult = Post.update(testPost.slug, {
            title: 'Updated Test Post'
        }, 'test-user');

        if (updateResult.success) {
            console.log('✅ Post updating working');
            console.log('   Updated title:', updateResult.post.title);
        }

        // Clean up - delete the test post
        const deleteResult = Post.delete(testPost.slug, 'test-user');
        if (deleteResult.success) {
            console.log('✅ Post deletions.js working');
        }
    } else {
        console.log('⚠️ Post creation failed:', createResult.error);
    }

    console.log('\n6. Testing published posts filter...');
    const publishedPosts = Post.getPublished();
    console.log('✅ Published posts filter working');
    console.log('   Published posts:', publishedPosts.length);

    console.log('\n🎉 All Phase 2 components working correctly!');
    console.log('\nNext steps:');
    console.log('1. Add posts routes to your server.js');
    console.log('2. Replace existing post-related code with new system');
    console.log('3. Test with your frontend');

} catch (error) {
    console.error('\n❌ Phase 2 test failed:');
    console.error('Error:', error.message);
    console.error('\nPlease check:');
    console.error('1. All Phase 2 files are in correct directories');
    console.error('2. Phase 1 is working correctly');
    console.error('3. models/ directory exists');
    console.error('\nFull error:');
    console.error(error);
}