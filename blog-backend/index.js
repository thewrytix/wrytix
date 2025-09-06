const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const marketDataRoutes = require('./routes/marketData');
const { v4: uuid } = require('uuid');
const connectDB = require('./config/db');
const {
    User,
    Post,
    Ad,
    Comment,
    PendingUser,
    PendingDeletion,
    PostSubmission,
    Log,
} = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

// ========= Middleware ========= //
app.use(cors({
    origin: ["https://wrytix.netlify.app", "http://localhost:5500"],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.get("/", (req, res) => {
    res.send("Backend is running 🚀");
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(helmet());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.use(marketDataRoutes);

// ======================
// 🛠️ UTILITY FUNCTIONS
// ======================

async function readCollection(Model) {
    try {
        return await Model.find().lean();
    } catch (err) {
        console.error(`Error reading ${Model.modelName}:`, err);
        return [];
    }
}

async function writeDocument(Model, document) {
    try {
        await new Model(document).save();
    } catch (err) {
        console.error(`Error writing to ${Model.modelName}:`, err);
        throw err;
    }
}

async function updateDocument(Model, filter, update) {
    try {
        await Model.updateOne(filter, { $set: update });
    } catch (err) {
        console.error(`Error updating ${Model.modelName}:`, err);
        throw err;
    }
}

async function deleteDocument(Model, filter) {
    try {
        await Model.deleteOne(filter);
    } catch (err) {
        console.error(`Error deleting from ${Model.modelName}:`, err);
        throw err;
    }
}

async function getPublishedPosts() {
    const now = new Date();
    return await Post.find({ schedule: { $lte: now } }).lean();
}

async function readAds() {
    const now = new Date();
    const ads = await Ad.find().lean();
    let updated = false;
    for (let ad of ads) {
        if (ad.endDate && new Date(ad.endDate) < now && ad.active) {
            ad.active = false;
            updated = true;
            await updateDocument(Ad, { _id: ad._id }, { active: false });
        }
    }
    return ads;
}

async function writeAds(ad) {
    await writeDocument(Ad, ad);
}

function verifySession(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(403).json({ error: 'Forbidden' });
}

function autoToggleAds(ads) {
    const now = new Date();
    return ads.map(ad => {
        const start = new Date(ad.startDate);
        const end = new Date(ad.endDate);
        const shouldBeActive = start <= now && now <= end;
        return { ...ad, active: shouldBeActive };
    });
}

function requireRole(allowedRoles) {
    return function (req, res, next) {
        const user = req.session?.user;
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized: No session found' });
        }
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient role' });
        }
        next();
    };
}

async function readComments(slug) {
    try {
        const commentDoc = await Comment.findOne({ slug }).lean();
        return commentDoc ? commentDoc.comments : [];
    } catch (err) {
        console.error("Error reading comments:", err);
        return [];
    }
}

async function writeComments(slug, comment) {
    try {
        await Comment.updateOne(
            { slug },
            { $push: { comments: comment } },
            { upsert: true }
        );
    } catch (err) {
        console.error("Error writing comments:", err);
        throw err;
    }
}

async function logAction(actor, action, target, additionalData = {}) {
    const newLog = {
        id: Date.now().toString(),
        actor: actor || 'system',
        action,
        target: target || '',
        timestamp: new Date(),
        ip: additionalData.ip || '',
        userAgent: additionalData.userAgent || '',
        ...additionalData
    };
    await writeDocument(Log, newLog);
    return newLog;
}

function requireAdmin(req, res, next) {
    if (!req.session.user || req.session.user.role !== 'admin') {
        logAction(req.session.user?.username, 'admin-access-denied', req.path, {
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
        return res.status(403).json({ error: 'Forbidden – Admins only' });
    }
    next();
}

function requireLogin(req, res, next) {
    if (!req.session.user) {
        logAction('anonymous', 'login-required', req.path, {
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
        return res.status(401).json({ error: 'Login required' });
    }
    next();
}

function requireEditorOrAdmin(req, res, next) {
    if (req.session.user?.role === 'editor' || req.session.user?.role === 'admin') {
        return next();
    }
    return res.status(403).json({ error: 'Forbidden' });
}

// ⏱️ Auto-refresh ad status every 10 minutes
setInterval(async () => {
    await readAds();
}, 10 * 60 * 1000);

// ======================
// 🚀 ROUTES
// ======================

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, status: 'active' }).lean();

    if (!user) {
        await logAction(username, 'login-failed', username, { reason: 'User not found' });
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    bcrypt.compare(password, user.password, (err, result) => {
        if (err || !result) {
            logAction(username, 'login-failed', username, { reason: 'Invalid password' });
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
        };

        logAction(username, 'login-success', username);
        res.json({ message: 'Login successful', user: req.session.user });
    });
});

app.post('/logout', (req, res) => {
    const username = req.session.user?.username || 'anonymous';
    req.session.destroy();
    logAction(username, 'logout', 'system');
    res.json({ message: 'Logged out' });
});

let headline = "Welcome to Wrytix – Tips, Stories, Tech & Lifestyle! 🚀 | Check out our latest post on boosting productivity | Don't miss our trending business hacks!";

app.get("/headline", (req, res) => {
    res.json({ text: headline });
});

app.put("/headline", (req, res) => {
    const { text } = req.body;
    if (typeof text === "string" && text.trim() !== "") {
        headline = text.trim();
        logAction(req.session.user?.username, 'update-headline', headline);
        return res.status(200).json({ message: "Headline updated successfully" });
    }
    logAction(req.session.user?.username, 'update-headline-failed', 'invalid input');
    res.status(400).json({ error: "Invalid headline text" });
});

app.post('/ads', async (req, res) => {
    try {
        const now = new Date();
        const ad = {
            id: Date.now().toString(),
            type: req.body.type,
            category: req.body.category,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            link: req.body.link || "",
            company: req.body.company || '',
            html: req.body.html || "",
            text: req.body.text || "",
            file: req.body.file || "",
            active: !!req.body.active,
            createdAt: now
        };

        await writeDocument(Ad, ad);
        await logAction(req.session.user?.username, 'ad-created', ad.id, {
            type: ad.type,
            company: ad.company
        });

        res.status(201).json({ message: 'Ad created successfully', ad });
    } catch (error) {
        await logAction(req.session.user?.username, 'ad-create-failed', 'system', {
            error: error.message
        });
        res.status(500).json({ error: 'Failed to save ad' });
    }
});

app.get('/ads', async (req, res) => {
    try {
        const ads = await readAds();
        res.json(ads);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch ads' });
    }
});

app.get('/ads/:id', async (req, res) => {
    try {
        const ad = await Ad.findOne({ id: req.params.id }).lean();
        if (!ad) {
            return res.status(404).json({ error: 'Ad not found' });
        }
        res.json(ad);
    } catch (e) {
        res.status(500).json({ error: 'Failed to load ad' });
    }
});

app.put('/ads/:id', upload.single('file'), async (req, res) => {
    try {
        const ad = await Ad.findOne({ id: req.params.id }).lean();
        if (!ad) {
            await logAction(req.session.user?.username, 'ad-update-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'Ad not found' });
        }

        const updatedAd = {
            ...ad,
            ...req.body,
            active: req.body.active === 'true' || req.body.active === true,
            id: ad.id,
            updatedAt: new Date()
        };

        if (req.file) {
            updatedAd.file = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }

        await updateDocument(Ad, { id: req.params.id }, updatedAd);
        await logAction(req.session.user?.username, 'ad-updated', updatedAd.id, {
            changes: Object.keys(req.body)
        });

        res.json({ message: 'Ad updated', ad: updatedAd });
    } catch (err) {
        await logAction(req.session.user?.username, 'ad-update-error', req.params.id, {
            error: err.message
        });
        res.status(500).json({ error: "Server error" });
    }
});

app.delete('/ads/:id', async (req, res) => {
    try {
        const ad = await Ad.findOne({ id: req.params.id }).lean();
        if (!ad) {
            await logAction(req.session.user?.username, 'ad-delete-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: "Ad not found" });
        }

        await deleteDocument(Ad, { id: req.params.id });
        await logAction(req.session.user?.username, 'ad-deleted', ad.id, {
            type: ad.type,
            company: ad.company
        });

        res.json({ message: 'Ad deleted successfully', deleted: ad });
    } catch (err) {
        await logAction(req.session.user?.username, 'ad-delete-error', req.params.id, {
            error: err.message
        });
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/posts', async (req, res) => {
    try {
        const posts = await getPublishedPosts();
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/posts/all', async (req, res) => {
    try {
        const posts = await readCollection(Post);
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/posts/:slug', async (req, res) => {
    try {
        const post = await Post.findOne({ slug: req.params.slug }).lean();
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/posts/:slug/view', async (req, res) => {
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

        await logAction(req.session.user?.username, 'post-viewed', post.slug, {
            views: (post.views || 0) + 1
        });

        res.status(200).json({ message: "View incremented" });
    } catch (err) {
        await logAction(req.session.user?.username, 'post-view-error', req.params.slug, {
            error: err.message
        });
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/posts', async (req, res) => {
    try {
        const now = new Date();
        let scheduleDate;
        if (req.body.schedule) {
            scheduleDate = new Date(req.body.schedule);
            if (isNaN(scheduleDate.getTime())) {
                await logAction(req.session.user?.username, 'post-create-failed', 'invalid date', {
                    schedule: req.body.schedule
                });
                return res.status(400).json({ error: "Invalid schedule date format" });
            }
        } else {
            scheduleDate = now;
        }

        const newPost = {
            id: uuidv4(), // Generate unique ID
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

        await writeDocument(Post, newPost);
        await logAction(req.session.user?.username, 'post-created', newPost.slug, {
            title: newPost.title,
            scheduled: newPost.schedule
        });

        res.status(201).json(newPost);
    } catch (err) {
        await logAction(req.session.user?.username, 'post-create-error', 'system', {
            error: err.message,
            stack: err.stack,
            code: err.code
        });
        if (err.name === 'MongoServerError' && err.code === 11000) {
            return res.status(400).json({ error: `Duplicate key error: ${err.message}` });
        }
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: `Validation failed: ${err.message}` });
        }
        res.status(500).json({ error: `Server error: ${err.message}` });
    }
});


app.put('/posts/:slug', async (req, res) => {
    try {
        const post = await Post.findOne({ slug: req.params.slug }).lean();
        if (!post) {
            await logAction(req.session.user?.username, 'post-update-failed', req.params.slug, {
                reason: 'Not found'
            });
            return res.status(404).json({ message: 'Post not found' });
        }

        let scheduleDate;
        if (req.body.schedule) {
            scheduleDate = new Date(req.body.schedule);
            if (isNaN(scheduleDate.getTime())) {
                await logAction(req.session.user?.username, 'post-update-failed', req.params.slug, {
                    reason: 'Invalid date',
                    schedule: req.body.schedule
                });
                return res.status(400).json({ error: "Invalid schedule date format" });
            }
        } else {
            scheduleDate = new Date(post.schedule);
        }

        const updatedPost = {
            ...post,
            ...req.body,
            schedule: scheduleDate,
            isPublished: scheduleDate <= new Date()
        };

        await updateDocument(Post, { slug: req.params.slug }, updatedPost);
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
});

app.delete('/posts/:slug', async (req, res) => {
    try {
        const post = await Post.findOne({ slug: req.params.slug }).lean();
        if (!post) {
            await logAction(req.session.user?.username, 'post-delete-failed', req.params.slug, {
                reason: 'Not found'
            });
            return res.status(404).json({ message: 'Post not found' });
        }

        await deleteDocument(Post, { slug: req.params.slug });
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
});

app.post('/postSubmissions', requireRole(['author']), async (req, res) => {
    try {
        const newPost = {
            id: Date.now().toString(),
            ...req.body,
            status: 'pending',
            submittedBy: req.session.user.username,
            editorComments: '',
            createdAt: new Date()
        };
        await writeDocument(PostSubmission, newPost);
        await logAction(req.session.user.username, 'post-submitted', newPost.title);
        res.status(201).json({ message: 'Post submitted for approval', post: newPost });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit post' });
    }
});

app.get('/postSubmissions', requireRole(['author', 'editor', 'admin']), async (req, res) => {
    const submissions = await readCollection(PostSubmission);
    res.json(submissions);
});

app.get('/postSubmissions/:id', requireRole(['author', 'editor', 'admin']), async (req, res) => {
    const post = await PostSubmission.findOne({ id: req.params.id }).lean();
    if (!post) return res.status(404).send("Submission not found.");
    res.json(post);
});

app.put('/postSubmissions/:id', requireRole(['author', 'editor', 'admin']), async (req, res) => {
    try {
        const submission = await PostSubmission.findOne({ id: req.params.id }).lean();
        if (!submission) return res.status(404).json({ error: 'Submission not found' });

        const update = req.body;
        await updateDocument(PostSubmission, { id: req.params.id }, update);

        const logType = update.status === 'approved'
            ? 'post-approved'
            : update.status === 'rejected'
                ? 'post-rejected'
                : 'post-updated';

        await logAction(req.session.user.username, logType, submission.title);

        if (update.status === 'approved') {
            const finalPost = { ...submission, ...update, isPublished: new Date(submission.schedule) <= new Date() };
            await writeDocument(Post, finalPost);
            await deleteDocument(PostSubmission, { id: req.params.id });
        }

        res.json({ message: 'Submission updated', post: { ...submission, ...update } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update submission' });
    }
});

app.delete('/postSubmissions/:id', requireRole(['author', 'editor', 'admin']), async (req, res) => {
    try {
        const submission = await PostSubmission.findOne({ id: req.params.id }).lean();
        if (!submission) return res.status(404).json({ error: 'Not found' });

        await deleteDocument(PostSubmission, { id: req.params.id });
        await logAction(req.session.user.username, 'post-deleted', submission.title);

        res.json({ message: 'Submission deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete submission' });
    }
});

app.get('/debug/timecheck', async (req, res) => {
    try {
        const posts = await readCollection(Post);
        const now = new Date();
        const samplePost = posts.length > 0 ? posts[0] : null;

        await logAction(req.session.user?.username, 'timecheck-requested', 'system');
        res.json({
            serverTime: now.toISOString(),
            serverTimeLocal: now.toString(),
            postCount: posts.length,
            samplePost: samplePost ? {
                title: samplePost.title,
                schedule: samplePost.schedule,
                isPublished: new Date(samplePost.schedule) <= now
            } : null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            note: "Remember: /posts filters by schedule, /posts/all shows all"
        });
    } catch (err) {
        await logAction(req.session.user?.username, 'timecheck-failed', 'system', {
            error: err.message
        });
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/posts/:slug.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'posts/view-post.html'));
});

app.get('/comments', async (req, res) => {
    const slug = req.query.slug;
    if (!slug) {
        return res.status(400).json({ error: 'Missing slug' });
    }

    const comments = await readComments(slug);
    res.json(comments);
});

app.post('/comments', async (req, res) => {
    const { slug, username, comment, timestamp } = req.body;

    if (!slug || !username || !comment || !timestamp) {
        await logAction(req.session.user?.username, 'comment-create-failed', 'missing fields');
        return res.status(400).json({ error: 'All fields are required' });
    }

    const newComment = { username, comment, timestamp: new Date(timestamp) };
    await writeComments(slug, newComment);

    await logAction(username, 'comment-created', slug, {
        commentLength: comment.length
    });

    res.status(201).json({ message: 'Comment saved', comment: newComment });
});

app.get('/users', async (req, res) => {
    const users = await readCollection(User);
    res.json(users);
});

app.get('/users/:id', async (req, res) => {
    const user = await User.findOne({ id: req.params.id }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
});

app.post('/users', requireAdmin, async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = {
            ...req.body,
            id: Date.now().toString(),
            password: hashedPassword
        };

        const duplicate = await User.findOne({
            $or: [{ username: newUser.username }, { email: newUser.email }]
        }).lean();
        if (duplicate) {
            await logAction(req.session.user.username, 'user-create-failed', newUser.username || newUser.email, {
                reason: 'Duplicate user'
            });
            return res.status(409).json({ message: 'User already exists' });
        }

        await writeDocument(User, newUser);
        await logAction(
            req.session.user.username,
            'user-created',
            newUser.username || newUser.email,
            { role: newUser.role }
        );

        res.status(201).json({ message: 'User added', user: newUser });
    } catch (err) {
        await logAction(
            req.session.user?.username,
            'user-create-error',
            'system',
            { error: err.message }
        );
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.put('/users/:id', requireAdmin, upload.none(), async (req, res) => {
    try {
        const user = await User.findOne({ id: req.params.id }).lean();
        if (!user) {
            await logAction(req.session.user.username, 'user-update-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'User not found' });
        }

        await updateDocument(User, { id: req.params.id }, req.body);
        await logAction(
            req.session.user.username,
            'user-updated',
            user.username || user.email,
            { changes: Object.keys(req.body) }
        );

        res.json({ message: 'User updated', user: { ...user, ...req.body } });
    } catch (err) {
        await logAction(
            req.session.user.username,
            'user-update-error',
            req.params.id,
            { error: err.message }
        );
        res.status(500).json({ error: 'Failed to update user' });
    }
});

app.delete('/users/:id', requireAdmin, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.params.id }).lean();
        if (!user) {
            await logAction(req.session.user.username, 'user-delete-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'User not found' });
        }

        await deleteDocument(User, { id: req.params.id });
        await logAction(
            req.session.user.username,
            'user-deleted',
            user.username || user.email,
            { role: user.role }
        );

        res.json({ message: 'User deleted', user });
    } catch (err) {
        await logAction(
            req.session.user.username,
            'user-delete-error',
            req.params.id,
            { error: err.message }
        );
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

app.get('/pendingUsers', async (req, res) => {
    const pending = await readCollection(PendingUser);
    res.json(pending);
});

app.get('/pendingUsers/:id', async (req, res) => {
    const user = await PendingUser.findOne({ id: req.params.id }).lean();
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
});

app.post('/pendingUsers', upload.single('pdf'), async (req, res) => {
    try {
        const { username, email, password, submittedBy } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        let pdfFilename = null;
        let pdfOriginalName = null;

        if (req.file) {
            if (!req.file.mimetype.includes('pdf')) {
                return res.status(400).json({ error: 'Only PDFs are allowed' });
            }
            pdfFilename = req.file.filename;
            pdfOriginalName = req.file.originalname;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newRequest = {
            ...req.body,
            id: uuid(),
            createdAt: new Date(),
            password: hashedPassword,
            pdfFilename,
            pdfOriginalName
        };

        await writeDocument(PendingUser, newRequest);
        await logAction(
            username || 'anonymous',
            'pending-user-created',
            email || username,
            { submittedBy }
        );

        res.status(201).json({ message: 'Pending request submitted', request: newRequest });
    } catch (err) {
        await logAction(
            'system',
            'pending-user-create-error',
            'system',
            { error: err.message }
        );
        res.status(500).json({ error: 'Failed to create pending user' });
    }
});

app.delete('/pendingUsers/:id', requireAdmin, async (req, res) => {
    try {
        const user = await PendingUser.findOne({ id: req.params.id }).lean();
        if (!user) {
            await logAction(req.session.user.username, 'pending-user-delete-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'Pending user not found' });
        }

        await deleteDocument(PendingUser, { id: req.params.id });
        await logAction(
            req.session.user.username,
            'pending-user-deleted',
            user.email || user.username,
            { reason: 'Admin action' }
        );

        res.json({ message: 'Pending request removed', removed: user });
    } catch (err) {
        await logAction(
            req.session.user.username,
            'pending-user-delete-error',
            req.params.id,
            { error: err.message }
        );
        res.status(500).json({ error: 'Failed to remove pending user' });
    }
});

app.post('/approve-user', requireAdmin, async (req, res) => {
    try {
        const { pendingUserId } = req.body;
        if (!pendingUserId) {
            await logAction(req.session.user.username, 'user-approve-failed', 'no id', {
                reason: 'Missing pendingUserId'
            });
            return res.status(400).json({ error: 'Missing pendingUserId' });
        }

        const pendingUser = await PendingUser.findOne({ id: pendingUserId }).lean();
        if (!pendingUser) {
            await logAction(req.session.user.username, 'user-approve-failed', pendingUserId, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'Pending user not found' });
        }

        const duplicate = await User.findOne({
            $or: [{ username: pendingUser.username }, { email: pendingUser.email }]
        }).lean();
        if (duplicate) {
            await logAction(req.session.user.username, 'user-approve-failed', pendingUser.username || pendingUser.email, {
                reason: 'Duplicate user'
            });
            return res.status(409).json({ error: 'User already exists' });
        }

        const newUser = {
            ...pendingUser,
            id: Date.now().toString(),
            status: 'active',
            createdAt: new Date()
        };
        await writeDocument(User, newUser);
        await deleteDocument(PendingUser, { id: pendingUserId });

        await logAction(
            req.session.user.username,
            'user-approved',
            newUser.username || newUser.email,
            { role: newUser.role }
        );

        res.json({ message: 'User approved', user: newUser });
    } catch (err) {
        await logAction(
            req.session.user.username,
            'user-approve-error',
            'system',
            { error: err.message }
        );
        res.status(500).json({ error: 'Failed to approve user' });
    }
});

app.post('/pendingUsers/:id/approve', requireAdmin, async (req, res) => {
    try {
        const pendingUser = await PendingUser.findOne({ id: req.params.id }).lean();
        if (!pendingUser) {
            await logAction(req.session.user.username, 'user-approve-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'Pending user not found' });
        }

        const approvedUser = {
            ...pendingUser,
            id: Date.now().toString(),
            status: 'active',
            approvedBy: req.session.user.username,
            approvedAt: new Date()
        };

        await writeDocument(User, approvedUser);
        await deleteDocument(PendingUser, { id: req.params.id });

        await logAction(
            req.session.user.username,
            'user-approved',
            approvedUser.username || approvedUser.email,
            { method: 'direct-approve' }
        );

        res.json({
            message: 'User approved successfully',
            user: approvedUser
        });
    } catch (err) {
        await logAction(
            req.session.user.username,
            'user-approve-error',
            req.params.id,
            { error: err.message }
        );
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/pdfs/:filename', requireAdmin, (req, res) => {
    const filepath = path.join(__dirname, 'uploads', req.params.filename);

    if (fs.existsSync(filepath)) {
        res.download(filepath);
    } else {
        logAction(
            req.session.user?.username,
            'pdf-download-failed',
            req.params.filename,
            { reason: 'File not found' }
        );
        res.status(404).json({ error: 'File not found' });
    }
});

app.post('/pendingDeletions', async (req, res) => {
    const userRole = req.session.user?.role;
    if (userRole !== 'editor' && userRole !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const {
            userId,
            reason,
            targetUsername,
            targetEmail,
            targetRole,
            targetFullName,
            targetAvatar,
            requestedBy
        } = req.body;

        if (!userId || !reason) {
            return res.status(400).json({ error: 'Missing userId or reason' });
        }

        const newDeletion = {
            id: Date.now().toString(),
            userId,
            reason,
            targetUsername,
            targetEmail,
            targetRole,
            targetFullName,
            targetAvatar,
            requestedBy: requestedBy || req.session.user.username,
            createdAt: new Date(),
            status: 'pending'
        };

        await writeDocument(PendingDeletion, newDeletion);
        await logAction(req.session.user.username, 'user-delete-requested', userId, {
            reason,
            targetUsername,
            targetEmail,
            targetRole,
            targetFullName,
            targetAvatar,
        });

        res.status(201).json({ message: 'Delete request submitted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit delete request' });
    }
});

app.get('/pendingDeletions', verifySession, async (req, res) => {
    const user = req.session.user;
    if (!user || !['admin', 'editor'].includes(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const pending = await readCollection(PendingDeletion);
    res.json(pending);
});

app.post('/pendingDeletions/:id/approve', requireAdmin, async (req, res) => {
    try {
        const deletion = await PendingDeletion.findOne({ id: req.params.id }).lean();
        if (!deletion) return res.status(404).json({ error: 'Request not found' });

        const user = await User.findOne({ id: deletion.userId }).lean();
        if (!user) return res.status(404).json({ error: 'User not found' });

        await deleteDocument(User, { id: deletion.userId });
        await deleteDocument(PendingDeletion, { id: req.params.id });

        await logAction(req.session.user.username, 'user-delete-approved', user.username, {
            requestedBy: deletion.requestedBy,
            deletedUserId: deletion.userId
        });

        res.json({ message: 'User deleted', user });
    } catch (err) {
        res.status(500).json({ error: 'Failed to approve deletion' });
    }
});

app.post('/pendingDeletions/:id/reject', requireAdmin, async (req, res) => {
    try {
        const deletion = await PendingDeletion.findOne({ id: req.params.id }).lean();
        if (!deletion) return res.status(404).json({ error: 'Request not found' });

        await deleteDocument(PendingDeletion, { id: req.params.id });
        await logAction(req.session.user.username, 'user-delete-rejected', deletion.userId, {
            requestedBy: deletion.requestedBy
        });

        res.json({ message: 'Deletion request rejected' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reject deletion' });
    }
});

app.delete('/pendingDeletions/:id', async (req, res) => {
    try {
        const username = req.session.user?.username;
        if (!username) return res.status(403).json({ error: 'Not logged in' });

        const deletion = await PendingDeletion.findOne({ id: req.params.id }).lean();
        if (!deletion) return res.status(404).json({ error: 'Request not found' });

        const isOwner = deletion.requestedBy === username;
        const isAdmin = req.session.user.role === 'admin';
        if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Not authorized' });

        await deleteDocument(PendingDeletion, { id: req.params.id });
        await logAction(username, 'user-delete-cancelled', deletion.targetUsername, {
            userId: deletion.userId,
            requestedBy: deletion.requestedBy
        });

        res.json({ message: 'Request cancelled' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to cancel deletion request' });
    }
});

app.get('/check-username', async (req, res) => {
    try {
        const username = req.query.username;
        const taken = await User.findOne({ username }).lean() ||
            await PendingUser.findOne({ username }).lean();
        res.json({ available: !taken });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check username' });
    }
});

app.get('/check-email', async (req, res) => {
    try {
        const email = req.query.email?.toLowerCase();
        const taken = await User.findOne({ email }).lean() ||
            await PendingUser.findOne({ email }).lean();
        res.json({ available: !taken });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check email' });
    }
});

app.get('/verify-session', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Session expired' });
    }
    res.json({
        user: {
            id: req.session.user.id,
            username: req.session.user.username,
            role: req.session.user.role
        }
    });
});

app.get('/logs', async (req, res) => {
    try {
        let query = {};
        if (req.query.action) {
            query.action = { $regex: req.query.action, $options: 'i' };
        }
        if (req.query.actor) {
            query.actor = { $regex: req.query.actor, $options: 'i' };
        }

        let logs = await Log.find(query).lean();
        if (req.query.limit) {
            logs = logs.slice(0, parseInt(req.query.limit));
        }

        res.json(logs);
    } catch (err) {
        await logAction(req.session.user?.username, 'logs-fetch-failed', 'system', {
            error: err.message
        });
        res.status(500).json({ error: 'Failed to load logs' });
    }
});

app.delete('/logs', async (req, res) => {
    try {
        await Log.deleteMany({});
        await logAction(req.session.user?.username, 'logs-cleared', 'admin');
        res.json({ message: 'Logs cleared successfully' });
    } catch (err) {
        await logAction(req.session.user?.username, 'logs-clear-failed', 'admin', {
            error: err.message
        });
        res.status(500).json({ error: 'Failed to clear logs' });
    }
});

app.get('/ping', (req, res) => {
    logAction(req.session.user?.username, 'ping', 'admin');
    res.json({ message: 'Backend is alive!' });
});

// Start server after DB connection
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`✅ Server is running at http://localhost:${PORT}`);
        console.log(`Current server time: ${new Date().toISOString()}`);
        logAction('admin', 'server-started', `port: ${PORT}`);
    });
});