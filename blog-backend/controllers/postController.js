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
        const posts = await Post.find({ schedule: { $lte: now } }).lean();
        res.json(posts);
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