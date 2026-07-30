const express = require('express');
const path = require('path');
const fs = require('fs');
const escapeHtml = require('../utils/escapeHtml');
const staticGenerator = require('../utils/staticGenerator');
const {
    getPosts,
    getAllPosts,
    getPostBySlug,
    incrementPostView,
    getAllPostsLean,
    createPost,
    updatePost,
    deletePost,
    createPostSubmission,
    getPostSubmissions,
    getPostSubmissionById,
    updatePostSubmission,
    deletePostSubmission,
    getFeaturedPosts,
    getHomepageCategoryPosts,
    getPostsByCategory,
    getTrendingPosts,
    getPopularPosts,
    getDashboardStats,
    getRelatedPosts,
    getMyPosts,
    getPendingApproval,
    getManagedPosts,
    bulkDeletePosts,
} = require('../controllers/postController');
const { requireRole, blockIfMaintenanceMode, requireLogin } = require('../middleware/auth');
const { Post } = require('../models');
const { logVisit } = require("../middleware/visitLogger");

const router = express.Router();

// -------------------------------------------------------------------
// 1️⃣  ALL STATIC / EXPLICIT ROUTES (no colon parameters)
//     (These must come BEFORE any /:slug wildcard)
// -------------------------------------------------------------------

// Dashboard & management (require auth)
router.get('/posts/manage', requireLogin, blockIfMaintenanceMode, getManagedPosts);
router.post('/posts/bulk-delete', requireLogin, blockIfMaintenanceMode, bulkDeletePosts);
router.get('/posts/mine', requireLogin, blockIfMaintenanceMode, getMyPosts);
router.get('/posts/pending-approval', requireRole(['editor', 'admin']), blockIfMaintenanceMode, getPendingApproval);
router.get('/posts/dashboard-stats', requireRole(['author', 'editor', 'admin']), getDashboardStats);

// Public listings (exact paths)
router.get('/posts', getPosts);                           // author's own posts
router.get('/posts/featured', getFeaturedPosts);
router.get('/posts/trending', getTrendingPosts);
router.get('/posts/popular', getPopularPosts);
router.get('/posts/homepage-categories', getHomepageCategoryPosts);
router.get('/posts/all', requireRole(['author', 'editor', 'admin']), getAllPosts);
router.get('/posts/all-lean', requireRole(['author', 'editor', 'admin']), getAllPostsLean);

// Post submissions (auth required)
router.post('/postSubmissions', requireRole(['author']), createPostSubmission);
router.get('/postSubmissions', requireRole(['author', 'editor', 'admin']), getPostSubmissions);
router.get('/postSubmissions/:id', requireRole(['author', 'editor', 'admin']), getPostSubmissionById);
router.put('/postSubmissions/:id', requireRole(['author', 'editor', 'admin']), updatePostSubmission);
router.delete('/postSubmissions/:id', requireRole(['author', 'editor', 'admin']), deletePostSubmission);

// View‑post HTML page (specific path)
router.get('/posts/view-post.html', async (req, res) => {
    const slug = req.query.slug;
    if (!slug) return res.status(400).send('<h1>Post slug required</h1>');

    try {
        const post = await Post.findOne({ slug }).lean();
        if (!post) return res.status(404).send('<h1>Post not found</h1>');

        let desc = post.excerpt || '';
        if (!desc) {
            desc = post.content.replace(/<[^>]*>/g, '').substring(0, 160).trim() + '...';
        }

        const canonicalUrl = `https://wry-tix.com/posts/view-post.html?slug=${encodeURIComponent(slug)}`;

        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(post.title)}</title>
    <meta name="description" content="${escapeHtml(desc)}" />
    <meta property="og:title" content="${escapeHtml(post.title)}" />
    <meta property="og:description" content="${escapeHtml(desc)}" />
    <meta property="og:image" content="${post.thumbnail || ''}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(post.title)}" />
    <meta name="twitter:description" content="${escapeHtml(desc)}" />
    <meta name="twitter:image" content="${post.thumbnail || ''}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta http-equiv="refresh" content="0; url=${canonicalUrl}" />
</head>
<body>
    <p>Redirecting to <a href="${canonicalUrl}">${escapeHtml(post.title)}</a>...</p>
</body>
</html>`;

        res.send(html);
    } catch (err) {
        console.error('Error rendering post meta page:', err);
        res.status(500).send('<h1>Server error loading post</h1>');
    }
});

// Static post generation
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

// -------------------------------------------------------------------
// 2️⃣  ROUTES WITH PARAMETERS BUT MORE SPECIFIC THAN /:slug
//     (these still need to come before the bare /:slug)
// -------------------------------------------------------------------

router.get('/posts/category/:category', logVisit, getPostsByCategory);
router.get('/posts/:slug/related', getRelatedPosts);
router.post('/posts/:slug/view', incrementPostView);

// CRUD operations on a specific post (these use :slug)
router.post('/posts', requireRole(['editor', 'admin']), createPost);
router.put('/posts/:slug', requireRole(['editor', 'admin']), updatePost);
router.delete('/posts/:slug', requireRole(['editor', 'admin']), deletePost);

// -------------------------------------------------------------------
// 3️⃣  THE CATCH‑ALL :slug ROUTE – MUST BE LAST
// -------------------------------------------------------------------

router.get('/posts/:slug', logVisit, getPostBySlug);

module.exports = router;