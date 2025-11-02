const express = require('express');
const path = require('path');
const fs = require('fs'); // Add this for reading the template file
const escapeHtml = require('..//utils/escapeHtml');
const staticGenerator = require('..//utils/staticGenerator');
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
const { requireRole} = require('../middleware/auth');
const { Post } = require('../models'); // Add this: Import Post model directly

const router = express.Router();

// Your existing API routes...
router.get('/posts', getPosts);
router.get('/posts/all', requireRole(['author', 'editor', 'admin']), getAllPosts);
router.get('/posts/:slug', getPostBySlug);
router.post('/posts/:slug/view', incrementPostView);
router.post('/posts', requireRole(['editor', 'admin']), createPost);
router.put('/posts/:slug', requireRole(['editor', 'admin']), updatePost);
router.delete('/posts/:slug', requireRole(['editor', 'admin']), deletePost);
router.post('/postSubmissions', requireRole(['author']), createPostSubmission);
router.get('/postSubmissions', requireRole(['author', 'editor', 'admin']), getPostSubmissions);
router.get('/postSubmissions/:id', requireRole(['author', 'editor', 'admin']), getPostSubmissionById);
router.put('/postSubmissions/:id', requireRole(['author', 'editor', 'admin']), updatePostSubmission);
router.delete('/postSubmissions/:id', requireRole(['author', 'editor', 'admin']), deletePostSubmission);

// NEW: Dynamic rendering for post view page

router.get('/posts/view-post.html', async (req, res) => {
    const slug = req.query.slug;
    if (!slug) {
        return res.status(400).send('<h1>Post slug required in URL (?slug=your-slug)</h1>');
    }

    try {
        const post = await Post.findOne({ slug }).lean();
        if (!post) {
            return res.status(404).send('<h1>Post not found</h1>');
        }

        // Generate description
        let desc = post.excerpt || '';
        if (!desc) {
            desc = post.content.replace(/<[^>]*>/g, '').substring(0, 160).trim() + '...';
        }

        const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

        // Read the template file - fix the path
        const templatePath = path.join(__dirname, '../public/posts/view-post.html'); //path.join(__dirname, '..', 'public', 'posts', 'view-post.html'); // Adjust path as needed
        if (!fs.existsSync(templatePath)) {
            console.error("❌ Template file missing:", templatePath);
            return res.status(500).send('<h1>Template missing</h1>');
        }

        let html = fs.readFileSync(templatePath, 'utf8');

        // Replace ALL meta tags properly
        html = html
            .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(post.title)}</title>`)
            .replace(/<meta name="description" content="[^"]*"\/>/, `<meta name="description" content="${escapeHtml(desc)}" />`)
            .replace(/<meta property="og:title" content="[^"]*"\/>/, `<meta property="og:title" content="${escapeHtml(post.title)}" />`)
            .replace(/<meta property="og:description" content="[^"]*"\/>/, `<meta property="og:description" content="${escapeHtml(desc)}" />`)
            .replace(/<meta property="og:image" content="[^"]*"\/>/, `<meta property="og:image" content="${post.thumbnail || ''}" />`)
            .replace(/<meta property="og:url" content="[^"]*"\/>/, `<meta property="og:url" content="${fullUrl}" />`)
            .replace(/<meta name="twitter:card" content="[^"]*"\/>/, `<meta name="twitter:card" content="summary_large_image" />`);

        // Add Twitter meta tags
        const twitterMetas = `
            <meta name="twitter:title" content="${escapeHtml(post.title)}" />
            <meta name="twitter:description" content="${escapeHtml(desc)}" />
            <meta name="twitter:image" content="${post.thumbnail || ''}" />
        `;

        // Insert before closing head tag
        html = html.replace('</head>', `${twitterMetas}</head>`);

        // Also update the canonical URL if you have one
        html = html.replace(/<link rel="canonical" href="[^"]*"\/>/, `<link rel="canonical" href="${fullUrl}" />`);

        res.send(html);
    } catch (err) {
        console.error('Error rendering post page:', err);
        res.status(500).send('<h1>Server error loading post</h1>');
    }
});

// Routes to manage static posts

router.post('/generate-all-static', async (req, res) => {
    try {
        await staticGenerator.generateAllStaticPosts();
        res.json({ message: 'All static posts generated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.post('/generate-static/:slug', async (req, res) => {
    try {
        const post = await Post.findOne({ slug: req.params.slug }).lean();
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const filePath = await staticGenerator.generateStaticPost(post);
        res.json({
            message: 'Static post generated',
            file: filePath,
            url: `https://wry-tix/posts/${post.slug}.html`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});




module.exports = router;