const { Post, PostSubmission, User } = require('../models');
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
        console.error('❌ getPosts error:', err);   // 👈 this
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
// postController.js

const getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Lean pool used only to compute dynamic view-thresholds (same logic as before, cheap fields only)
        const allLean = await Post.find()
            .select('title slug schedule views lastViewed')
            .lean();

        const total = allLean.length;
        const live = allLean.filter(p => {
            const d = new Date(p.schedule);
            return !isNaN(d.getTime()) && d <= now;
        }).length;
        const scheduled = total - live;
        const totalViews = allLean.reduce((sum, p) => sum + (p.views || 0), 0);

        const getDynamicThreshold = (posts, percentage) => {
            if (posts.length === 0) return 0;
            const sorted = [...posts].sort((a, b) => b.views - a.views);
            const index = Math.max(Math.floor(sorted.length * percentage), 0);
            return sorted[index]?.views || 0;
        };

        const trendingThreshold = getDynamicThreshold(allLean, 0.1);
        const popularThreshold = getDynamicThreshold(allLean, 0.05);

        const isRecent = (post, cutoff) => {
            const scheduleDate = new Date(post.schedule);
            const lastViewed = post.lastViewed ? new Date(post.lastViewed) : null;
            return scheduleDate >= cutoff || (lastViewed && lastViewed >= cutoff);
        };

        const trendingPosts = allLean
            .filter(p => isRecent(p, twoWeeksAgo) || p.views >= trendingThreshold)
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, 10);

        const popularPosts = allLean
            .filter(p => isRecent(p, oneMonthAgo) || p.views >= popularThreshold)
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, 10);

        const recentActivity = [...allLean]
            .sort((a, b) => new Date(b.schedule) - new Date(a.schedule))
            .slice(0, 5);

        res.set('Cache-Control', 'private, max-age=30'); // short cache — admin data, not public CDN-cached
        res.json({
            total,
            live,
            scheduled,
            trendingCount: trendingPosts.length,
            popularCount: popularPosts.length,
            totalViews,
            trendingPosts,
            popularPosts,
            recentActivity
        });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
};

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

// postController.js

const getAllPostsLean = async (req, res) => {
    try {
        const posts = await Post.find()
            .select('title slug category author schedule views featured')
            .sort({ schedule: -1 })
            .lean();

        res.set('Cache-Control', 'private, max-age=15');
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
};

const getRelatedPosts = async (req, res) => {
    try {
        const { slug } = req.params;
        const currentPost = await Post.findOne({ slug }).select('category').lean();
        if (!currentPost) return res.status(404).json({ message: 'Post not found' });

        const now = new Date();
        const candidates = await Post.find({
            slug: { $ne: slug },
            schedule: { $lte: now }
        })
            .select('title slug thumbnail views category')
            .sort({ schedule: -1 })
            .limit(30)
            .lean();

        const sameCategory = candidates.filter(p => p.category === currentPost.category);
        const others = candidates.filter(p => p.category !== currentPost.category);

        const related = [...sameCategory.sort((a, b) => b.views - a.views), ...others]
            .slice(0, 5)
            .map(({ title, slug, thumbnail, views }) => ({ title, slug, thumbnail, views }));

        res.set('Cache-Control', 'public, max-age=180');
        res.json(related);
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

        const user = req.session.user;

        // Editors can only act on submissions assigned to them; admin can act on any
        if (user.role === 'editor' && submission.assignedEditor !== user.username) {
            await logAction(user.username, 'post-approval-denied', submission.title, {
                reason: 'Not assigned to this editor'
            });
            return res.status(403).json({ error: 'This submission is not assigned to you' });
        }

        const update = req.body;
        await PostSubmission.updateOne({ id: req.params.id }, update);

        const logType = update.status === 'approved' ? 'post-approved' : update.status === 'rejected' ? 'post-rejected' : 'post-updated';
        await logAction(user.username, logType, submission.title);

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

// Author submits a post — route to their lineManager, or admin if none
const createPostSubmission = async (req, res) => {
    try {
        const author = req.session.user;
        console.log('[createPostSubmission] session user:', author); // TEMP DEBUG

        const authorRecord = await User.findOne({ username: author.username }).lean();
        console.log('[createPostSubmission] authorRecord found:', authorRecord); // TEMP DEBUG

        const newSubmission = {
            id: Date.now().toString(),
            ...req.body,
            status: 'pending',
            submittedBy: author.username,
            assignedEditor: authorRecord?.lineManager || null,
            editorComments: '',
            createdAt: new Date()
        };

        console.log('[createPostSubmission] saving submittedBy as:', newSubmission.submittedBy); // TEMP DEBUG

        await PostSubmission.create(newSubmission);
        await logAction(author.username, 'post-submitted', newSubmission.title);
        res.status(201).json({ message: 'Post submitted for approval', post: newSubmission });
    } catch (err) {
        console.error('createPostSubmission error:', err);
        res.status(500).json({ error: 'Failed to submit post' });
    }
};

// Editor's approval queue — only their assigned authors' submissions; admin sees everything + unassigned
const getPendingApproval = async (req, res) => {
    try {
        const user = req.session.user;
        let query = { status: 'pending' };

        if (user.role === 'editor') {
            // Editor sees: submissions explicitly assigned to them
            query.assignedEditor = user.username;
        }
        // Admin: no additional filter — sees everything, including assignedEditor: null

        const submissions = await PostSubmission.find(query)
            .select('title submittedBy assignedEditor category createdAt status')
            .sort({ createdAt: -1 })
            .lean();

        res.json(submissions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load pending approvals' });
    }
};

// Author's own posts — both submissions and published, server-filtered (no client-side filtering of /posts/all anymore)
const getMyPosts = async (req, res) => {
    try {
        const username = req.session.user.username;
        const usernameRegex = new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

        const [submissions, published] = await Promise.all([
            PostSubmission.find({ submittedBy: usernameRegex })
                .select('title status createdAt category editorComments')
                .sort({ createdAt: -1 })
                .lean(),
            Post.find({ submittedBy: usernameRegex })
                .select('title slug views schedule category')
                .sort({ schedule: -1 })
                .lean()
        ]);

        res.json({ submissions, published });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load your posts' });
    }
};



const getManagedPosts = async (req, res) => {
    try {
        const user = req.session.user;
        const { status = 'all', page = 1, search = '', category = '', author = '' } = req.query;
        const limit = 20;
        const skip = (parseInt(page) - 1) * limit;
        const now = new Date();

        // Author-specific statuses: pending / rejected (submissions) or approved (published Post)
        if (user.role === 'author' && ['pending', 'rejected'].includes(status)) {
            let query = { status, submittedBy: user.username };

            if (search) query.title = { $regex: search, $options: 'i' };
            if (category) query.category = category;

            const [items, total] = await Promise.all([
                PostSubmission.find(query)
                    .select('id title slug category submittedBy featured assignedEditor createdAt status editorComments')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                PostSubmission.countDocuments(query)
            ]);

            return res.json({
                items: items.map(i => ({ ...i, source: 'submission' })),
                total, page: parseInt(page), totalPages: Math.ceil(total / limit)
            });
        }

        if (user.role === 'author' && status === 'approved') {
            let query = { submittedBy: user.username };
            if (search) query.title = { $regex: search, $options: 'i' };
            if (category) query.category = category;

            const [items, total] = await Promise.all([
                Post.find(query)
                    .select('title slug category author schedule views featured')
                    .sort({ schedule: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Post.countDocuments(query)
            ]);

            return res.json({
                items: items.map(i => ({ ...i, source: 'post' })),
                total, page: parseInt(page), totalPages: Math.ceil(total / limit)
            });
        }

        if (user.role === 'author' && status === 'all') {
            // Combine all three for authors: pending + rejected submissions + approved posts
            const [pending, rejected, approved] = await Promise.all([
                PostSubmission.find({ status: 'pending', submittedBy: user.username })
                    .select('title slug category submittedBy createdAt status featured editorComments').lean(),
                PostSubmission.find({ status: 'rejected', submittedBy: user.username })
                    .select('title slug category submittedBy createdAt status featured  editorComments').lean(),
                Post.find({ submittedBy: user.username })
                    .select('title slug category author schedule views featured').lean()
            ]);

            const combined = [
                ...pending.map(i => ({ ...i, source: 'submission' })),
                ...rejected.map(i => ({ ...i, source: 'submission' })),
                ...approved.map(i => ({ ...i, source: 'post', status: 'approved' }))
            ].sort((a, b) => new Date(b.createdAt || b.schedule) - new Date(a.createdAt || a.schedule));

            const total = combined.length;
            const paginated = combined.slice(skip, skip + limit);

            return res.json({
                items: paginated,
                total, page: parseInt(page), totalPages: Math.ceil(total / limit)
            });
        }

        // ---- Existing admin/editor logic below, unchanged ----
        if (status === 'pending') {
            let query = { status: 'pending' };
            if (user.role === 'editor') query.assignedEditor = user.username;

            if (search) query.title = { $regex: search, $options: 'i' };
            if (category) query.category = category;
            if (author) query.submittedBy = author;
            if (req.query.featured === 'true') query.featured = true;
            if (req.query.featured === 'false') query.featured = false;

            const [items, total] = await Promise.all([
                PostSubmission.find(query)
                    .select('id title slug category submittedBy assignedEditor createdAt status featured')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                PostSubmission.countDocuments(query)
            ]);

            return res.json({
                items: items.map(i => ({ ...i, source: 'submission' })),
                total, page: parseInt(page), totalPages: Math.ceil(total / limit)
            });
        }

        let query = {};
        if (status === 'live') query.schedule = { $lte: now };
        if (status === 'scheduled') query.schedule = { $gt: now };
        if (search) query.title = { $regex: search, $options: 'i' };
        if (category) query.category = category;
        if (author) query.author = author;

        const [items, total] = await Promise.all([
            Post.find(query)
                .select('title slug category author schedule views featured')
                .sort({ schedule: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Post.countDocuments(query)
        ]);

        res.json({
            items: items.map(i => ({ ...i, source: 'post' })),
            total, page: parseInt(page), totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('getManagedPosts error:', err);
        res.status(500).json({ error: 'Failed to load posts' });
    }
};

const bulkDeletePosts = async (req, res) => {
    try {
        const user = req.session.user;
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'No items provided' });
        }

        const postSlugs = items.filter(i => i.source === 'post').map(i => i.slug);
        const submissionSlugs = items.filter(i => i.source === 'submission').map(i => i.slug);

        // Authors can never delete published posts — only their own pending/rejected submissions
        if (user.role === 'author' && postSlugs.length > 0) {
            return res.status(403).json({ error: 'Authors cannot delete published posts' });
        }

        let deletedPosts = 0;
        let deletedSubmissions = 0;

        if (postSlugs.length > 0) {
            const result = await Post.deleteMany({ slug: { $in: postSlugs } });
            deletedPosts = result.deletedCount;
        }

        if (submissionSlugs.length > 0) {
            let filter = { slug: { $in: submissionSlugs } };
            if (user.role === 'author') filter.submittedBy = user.username;
            if (user.role === 'editor') filter.assignedEditor = user.username;

            const result = await PostSubmission.deleteMany(filter);
            deletedSubmissions = result.deletedCount;
        }

        await logAction(user.username, 'bulk-delete-posts', 'multiple', { deletedPosts, deletedSubmissions });
        res.json({ message: 'Bulk delete complete', deletedPosts, deletedSubmissions });
    } catch (err) {
        console.error('bulkDeletePosts error:', err);
        res.status(500).json({ error: 'Bulk delete failed' });
    }
};



module.exports = {
    getManagedPosts,
    bulkDeletePosts,
    getMyPosts,
    getPendingApproval,
    getAllPosts,
    getPostBySlug,
    getFeaturedPosts,
    getPostsByCategory,
    getRelatedPosts,
    getTrendingPosts,
    getPopularPosts,
    getAllPostsLean,
    getDashboardStats,
    getHomepageCategoryPosts,
    incrementPostView,
    createPost,
    updatePost,
    deletePost,
    createPostSubmission,
    getPostSubmissions,
    getPostSubmissionById,
    updatePostSubmission,
    deletePostSubmission,
    getPosts,
};