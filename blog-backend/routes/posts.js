const express = require('express');
const path = require('path');
const fs = require('fs'); // Add this for reading the template file
const {
    getPosts,
    getAllPosts,
    getPostBySlug,
    incrementPostView,
    createPost,
    updatePost,
    deletePost,
    createPostSubmission,
    getPostSubmissions,
    getPostSubmissionById,
    updatePostSubmission,
    deletePostSubmission
} = require('../controllers/postController');
const { requireRole, requireEditorOrAdmin } = require('../middleware/auth');
const { Post } = require('../models'); // Add this: Import Post model directly

const router = express.Router();

// Your existing API routes...
router.get('/posts', getPosts);
router.get('/posts/all', getAllPosts);
router.get('/posts/:slug', getPostBySlug);
router.post('/posts/:slug/view', incrementPostView);
router.post('/posts', createPost);
router.put('/posts/:slug', updatePost);
router.delete('/posts/:slug', deletePost);
router.post('/postSubmissions', requireRole(['author']), createPostSubmission);
router.get('/postSubmissions', requireRole(['author', 'editor', 'admin']), getPostSubmissions);
router.get('/postSubmissions/:id', requireRole(['author', 'editor', 'admin']), getPostSubmissionById);
router.put('/postSubmissions/:id', requireRole(['author', 'editor', 'admin']), updatePostSubmission);
router.delete('/postSubmissions/:id', requireRole(['author', 'editor', 'admin']), deletePostSubmission);

// NEW: Dynamic rendering for post view page
router.get('/view-post.html', async (req, res) => {
    const slug = req.query.slug;
    if (!slug) {
        return res.status(400).send('<h1>Post slug required in URL (?slug=your-slug)</h1>');
    }

    try {
        // Fetch post (reuse your controller logic, but capture the post object)
        const post = await Post.findOne({ slug }).lean();
        if (!post) {
            return res.status(404).send('<h1>Post not found</h1>');
        }

        // Generate description (use excerpt if exists, else truncate content)
        let desc = post.excerpt || '';
        if (!desc) {
            // Strip HTML tags and truncate
            desc = post.content.replace(/<[^>]*>/g, '').substring(0, 160).trim() + '...';
        }

        // Full absolute URL for sharing
        const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

        // Read the static template file
        const templatePath = path.join(__dirname, '..', 'posts', 'view-post.html'); // Adjust path if needed (e.g., to public/posts/)
        let html = fs.readFileSync(templatePath, 'utf8');

        // Replace placeholders in <head>
        html = html
            .replace('<title>Loading...</title>', `<title>${post.title}</title>`)
            .replace('content="Loading post details..."', `content="${desc}"`) // <meta name="description">
            .replace('content="Loading..."', `content="${post.title}"`) // og:title
            .replace('content="Loading post details..."', `content="${desc}"`) // og:description (note: same placeholder text, so it replaces both)
            .replace('content=""', `content="${post.thumbnail || ''}"`) // og:image (replaces the empty one)
            .replace('content=""', `content="${fullUrl}"`) // og:url (replaces the empty one; assumes next empty is this)
            .replace('content=""', 'content="summary_large_image"'); // twitter:card (last empty)

        // Add missing Twitter metas (insert before </head>)
        const twitterMetas = `
            <meta name="twitter:title" content="${post.title}" />
            <meta name="twitter:description" content="${desc}" />
            <meta name="twitter:image" content="${post.thumbnail || ''}" />
        `;
        html = html.replace('</head>', `${twitterMetas}</head>`);

        // Optional: Increment view here too (since crawler might hit it, but usually JS does it)
        await incrementPostView({ params: { slug } }, { status: () => {}, json: () => {} }); // Mock res to avoid sending JSON

        res.send(html);
    } catch (err) {
        console.error('Error rendering post page:', err);
        res.status(500).send('<h1>Server error loading post</h1>');
    }
});

// Remove or comment out the old static route if present:
// router.get('/:slug.html', (req, res) => { ... });

module.exports = router;