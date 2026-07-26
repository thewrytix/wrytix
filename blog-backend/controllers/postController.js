const { Post, PostSubmission } = require('../models');
const { logAction } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const escapeHtml = require('../utils/escapeHtml');
const staticGenerator = require('../utils/staticGenerator'); // Add this




// Update createPost function
const createPost = async (req, res) => {
    try {
        const now = new Date();
        let scheduleDate = req.body.schedule ? new Date(req.body.schedule) : now;
        if (req.body.schedule && isNaN(scheduleDate.getTime())) {
            await logAction(req.session.user?.username, 'post-create-failed', 'invalid date', {
                schedule: req.body.schedule
            });
            return res.status(400).json({ error: "Invalid schedule date format" });
        }

        const newPost = {
            id: uuidv4(),
            ...req.body,
            createdAt: now,
            schedule: scheduleDate,
            isPublished: scheduleDate <= now
        };

        const existingPost = await Post.findOne({ slug: newPost.slug }).lean();
        if (existingPost) {
            await logAction(req.session.user?.username, 'post-create-failed', newPost.slug, {
                reason: 'Slug exists'
            });
            return res.status(400).json({ message: 'Slug already exists' });
        }

        await Post.create(newPost);

        // Generate static post automatically
        try {
            await staticGenerator.generateStaticPost(newPost);
            await logAction(req.session.user?.username, 'static-post-generated', newPost.slug);
        } catch (staticError) {
            console.error('Static generation failed:', staticError);
            // Don't fail the main request
            await logAction(req.session.user?.username, 'static-generation-failed', newPost.slug, {
                error: staticError.message
            });
        }

        await logAction(req.session.user?.username, 'post-created', newPost.slug, {
            title: newPost.title,
            scheduled: newPost.schedule
        });

        res.status(201).json(newPost);
    } catch (err) {
        await logAction(req.session.user?.username, 'post-create-error', 'system', {
            error: err.message
        });
        res.status(500).json({ error: `Server error: ${err.message}` });
    }
};

// Update updatePost function
const updatePost = async (req, res) => {
    try {
        const post = await Post.findOne({ slug: req.params.slug }).lean();
        if (!post) {
            await logAction(req.session.user?.username, 'post-update-failed', req.params.slug, {
                reason: 'Not found'
            });
            return res.status(404).json({ message: 'Post not found' });
        }

        let scheduleDate = req.body.schedule ? new Date(req.body.schedule) : new Date(post.schedule);
        if (req.body.schedule && isNaN(scheduleDate.getTime())) {
            await logAction(req.session.user?.username, 'post-update-failed', req.params.slug, {
                reason: 'Invalid date'
            });
            return res.status(400).json({ error: "Invalid schedule date format" });
        }

        const updatedPost = {
            ...post,
            ...req.body,
            schedule: scheduleDate,
            isPublished: scheduleDate <= new Date()
        };

        await Post.updateOne({ slug: req.params.slug }, updatedPost);

        // Regenerate static post
        try {
            await staticGenerator.generateStaticPost(updatedPost);
            await logAction(req.session.user?.username, 'static-post-updated', updatedPost.slug);
        } catch (staticError) {
            console.error('Static update failed:', staticError);
        }

        await logAction(req.session.user?.username, 'post-updated', updatedPost.slug, {
            changes: Object.keys(req.body)
        });

        res.json(updatedPost);
    } catch (err) {
        await logAction(req.session.user?.username, 'post-update-error', req.params.slug, {
            error: err.message
        });
        res.status(500).json({ error: "Server error" });
    }
};

// Update deletePost function
const deletePost = async (req, res) => {
    try {
        const post = await Post.findOne({ slug: req.params.slug }).lean();
        if (!post) {
            await logAction(req.session.user?.username, 'post-delete-failed', req.params.slug, {
                reason: 'Not found'
            });
            return res.status(404).json({ message: 'Post not found' });
        }

        await Post.deleteOne({ slug: req.params.slug });

        // Delete static post
        try {
            await staticGenerator.deleteStaticPost(req.params.slug);
        } catch (staticError) {
            console.error('Static delete failed:', staticError);
        }

        await logAction(req.session.user?.username, 'post-deleted', req.params.slug, {
            title: post.title
        });

        res.json({ message: 'Deleted', post });
    } catch (err) {
        await logAction(req.session.user?.username, 'post-delete-error', req.params.slug, {
            error: err.message
        });
        res.status(500).json({ error: "Server error" });
    }
};
const getPosts = async (req, res) => {
    try {
        const now = new Date();
        const posts = await Post.find({ schedule: { $lte: now } })
            .select('title slug excerpt category schedule views thumbnail author featured content')
            .sort({ schedule: -1 })
            .limit(100)
            .lean();

        const shaped = posts.map(post => {
            const excerpt = post.excerpt || (post.content ? post.content.replace(/<[^>]*>/g, '').slice(0, 150) + '...' : '');
            const { content, ...rest } = post; // strip content before sending
            return { ...rest, excerpt };
        });

        res.json(shaped);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
};

const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find().lean();
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
};

const getPostBySlug = async (req, res) => {
    try {
        const post = await Post.findOne({ slug: req.params.slug }).lean();
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
};

// postController.js — new endpoints, each returns only what that view needs

const getFeaturedPosts = async (req, res) => {
    const posts = await Post.find({ featured: true, schedule: { $lte: new Date() } })
        .select('title slug excerpt thumbnail schedule')
        .sort({ schedule: -1 })
        .limit(7)
        .lean();
    res.set('Cache-Control', 'public, max-age=60');
    res.json(posts);
};

const getPostsByCategory = async (req, res) => {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const posts = await Post.find({ category, schedule: { $lte: new Date() } })
        .select('title slug excerpt thumbnail schedule views')
        .sort({ schedule: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    const total = await Post.countDocuments({ category, schedule: { $lte: new Date() } });

    res.set('Cache-Control', 'public, max-age=60');
    res.json({ posts, total, page, totalPages: Math.ceil(total / limit) });
};


const getHomepageCategoryPosts = async (req, res) => {
    try {
        const categories = ["news", "foreign", "business", "sports", "lifestyle", "technology"];
        const now = new Date();

        const facetStage = {};
        categories.forEach(cat => {
            facetStage[cat] = [
                { $match: { category: cat, schedule: { $lte: now } } },
                { $sort: { schedule: -1 } },
                { $limit: 5 },
                { $project: { title: 1, slug: 1, excerpt: 1, thumbnail: 1, category: 1, schedule: 1 } }
            ];
        });

        const [result] = await Post.aggregate([{ $facet: facetStage }]);

        res.set('Cache-Control', 'public, max-age=60');
        res.json(result); // { news: [...], sports: [...], business: [...], ... }
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
};

const getTrendingPosts = async (req, res) => {
    try {
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

        const posts = await Post.find({ schedule: { $lte: new Date() } })
            .select('title slug views schedule')
            .sort({ schedule: -1 })
            .limit(200) // reasonable working set to rank from
            .lean();

        // Same dynamic-threshold logic as before, now run once server-side
        const sorted = [...posts].sort((a, b) => b.views - a.views);
        const threshold = sorted[Math.floor(sorted.length * 0.1)]?.views || 0;

        const trending = posts
            .filter(p => new Date(p.schedule) >= twoWeeksAgo || p.views >= threshold)
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);

        res.set('Cache-Control', 'public, max-age=120');
        res.json(trending);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
};

const getPopularPosts = async (req, res) => {
    try {
        const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const posts = await Post.find({ schedule: { $lte: new Date() } })
            .select('title slug views schedule')
            .sort({ schedule: -1 })
            .limit(200)
            .lean();

        const sorted = [...posts].sort((a, b) => b.views - a.views);
        const threshold = sorted[Math.floor(sorted.length * 0.05)]?.views || 0;

        const popular = posts
            .filter(p => new Date(p.schedule) >= oneMonthAgo || p.views >= threshold)
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);

        res.set('Cache-Control', 'public, max-age=120');
        res.json(popular);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
};

const incrementPostView = async (req, res) => {
    try {
        const post = await Post.findOne({ slug: req.params.slug }).lean();
        if (!post) {
            await logAction(req.session.user?.username, 'post-view-failed', req.params.slug, {
                reason: 'Not found'
            });
            return res.status(404).json({ message: 'Post not found' });
        }

        await Post.updateOne(
            { slug: req.params.slug },
            { $inc: { views: 1 }, $set: { lastViewed: new Date() } }
        );

        res.status(200).json({ message: "View incremented" });
    } catch (err) {

        res.status(500).json({ error: "Server error" });
    }
};


const createPostSubmission = async (req, res) => {
    try {
        const newPost = {
            id: Date.now().toString(),
            ...req.body,
            status: 'pending',
            submittedBy: req.session.user.username,
            editorComments: '',
            createdAt: new Date()
        };
        await PostSubmission.create(newPost);
        await logAction(req.session.user.username, 'post-submitted', newPost.title);
        res.status(201).json({ message: 'Post submitted for approval', post: newPost });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit post' });
    }
};

const getPostSubmissions = async (req, res) => {
    const submissions = await PostSubmission.find().lean();
    res.json(submissions);
};

const getPostSubmissionById = async (req, res) => {
    const post = await PostSubmission.findOne({ id: req.params.id }).lean();
    if (!post) return res.status(404).send("Submission not found.");
    res.json(post);
};

const updatePostSubmission = async (req, res) => {
    try {
        const submission = await PostSubmission.findOne({ id: req.params.id }).lean();
        if (!submission) return res.status(404).json({ error: 'Submission not found' });

        const update = req.body;
        await PostSubmission.updateOne({ id: req.params.id }, update);

        const logType = update.status === 'approved' ? 'post-approved' : update.status === 'rejected' ? 'post-rejected' : 'post-updated';
        await logAction(req.session.user.username, logType, submission.title);

        if (update.status === 'approved') {
            const finalPost = { ...submission, ...update, isPublished: new Date(submission.schedule) <= new Date() };
            await Post.create(finalPost);
            await PostSubmission.deleteOne({ id: req.params.id });
        }

        res.json({ message: 'Submission updated', post: { ...submission, ...update } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update submission' });
    }
};

const deletePostSubmission = async (req, res) => {
    try {
        const submission = await PostSubmission.findOne({ id: req.params.id }).lean();
        if (!submission) return res.status(404).json({ error: 'Not found' });

        await PostSubmission.deleteOne({ id: req.params.id });
        await logAction(req.session.user.username, 'post-deleted', submission.title);

        res.json({ message: 'Submission deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete submission' });
    }
};


module.exports = {
    getPosts,
    getAllPosts,
    getPostBySlug,
    getFeaturedPosts,
    getPostsByCategory,
    getTrendingPosts,
    getPopularPosts,
    getHomepageCategoryPosts,
    incrementPostView,
    createPost,
    updatePost,
    deletePost,
    createPostSubmission,
    getPostSubmissions,
    getPostSubmissionById,
    updatePostSubmission,
    deletePostSubmission
};