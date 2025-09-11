const express = require('express');
const path = require('path');
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

const router = express.Router();

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
router.get('/posts/:slug.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../posts/view-post.html'));
});

module.exports = router;