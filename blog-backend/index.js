// ============================
// 📦 Server Setup - Wrytix CMS
// ============================

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const marketDataRoutes = require('./routes/marketData');



const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

// ========= Middleware ========= //
app.use(cors({
    origin: ["https://wrytix.netlify.app", "http://localhost:5500"],
    credentials: true
}));

app.get("/", (req, res) => {
    res.send("Backend is running 🚀");
});


app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: true, // since you’re on HTTPS
        sameSite: "none",
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

// 📁 JSON File Paths
const usersPath = path.join(__dirname, 'users.json');
const pendingUsersPath = path.join(__dirname, 'pendingUsers.json');
const pendingDeletionsPath = path.join(__dirname, 'pendingDeletions.json');
const logsPath = path.join(__dirname, 'logs.json');
const dataPath = path.join(__dirname, 'posts.json');
const COMMENTS_FILE = path.join(__dirname, 'comments.json');
const ADS_FILE = path.join(__dirname, 'ads.json');
const postSubmissionsPath = path.join(__dirname, 'postSubmissions.json');

// ======================
// 🛠️ UTILITY FUNCTIONS
// ======================

function readJson(file) {
    try {
        if (!fs.existsSync(file)) {
            const dir = path.dirname(file);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(file, '[]');
        }
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
        console.error(`Error reading ${file}:`, err);
        return [];
    }
}

function writeJson(file, data) {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function readPosts() {
    if (!fs.existsSync(dataPath)) return [];
    try {
        const data = fs.readFileSync(dataPath, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Error reading posts:", e);
        return [];
    }
}

function writePosts(posts) {
    try {
        fs.writeFileSync(dataPath, JSON.stringify(posts, null, 2), 'utf-8');
    } catch (e) {
        console.error("Error writing posts:", e);
    }
}

function getPublishedPosts() {
    const now = new Date();
    return readPosts().filter(post => {
        try {
            const postDate = new Date(post.schedule || post.createdAt);
            return postDate <= now;
        } catch (e) {
            console.error("Invalid date for post:", post.slug, e);
            return false;
        }
    });
}

function readAds() {
    try {
        const data = fs.readFileSync(ADS_FILE, 'utf-8');
        const ads = JSON.parse(data || '[]');
        const now = new Date();

        let updated = false;
        for (let ad of ads) {
            if (ad.endDate && new Date(ad.endDate) < now && ad.active) {
                ad.active = false;
                updated = true;
            }
        }

        if (updated) writeAds(ads);
        return ads;
    } catch (e) {
        console.error("Error reading ads:", e);
        return [];
    }
}

function writeAds(data) {
    try {
        fs.writeFileSync(ADS_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error writing ads:", e);
    }
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

function readComments() {
    try {
        const data = fs.readFileSync(COMMENTS_FILE, 'utf8');
        return JSON.parse(data || '{}');
    } catch (err) {
        console.error("Error reading comments:", err);
        return {};
    }
}

function writeComments(data) {
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(data, null, 2));
}

function getPostSubmissions() {
    return JSON.parse(fs.readFileSync(postSubmissionsPath, 'utf-8'));
}

function logAction(actor, action, target, additionalData = {}) {
    const logs = readJson(logsPath);
    const newLog = {
        id: Date.now().toString(),
        actor: actor || 'system',
        action,
        target: target || '',
        timestamp: new Date().toISOString(),
        ip: additionalData.ip || '',
        userAgent: additionalData.userAgent || '',
        ...additionalData
    };
    logs.unshift(newLog);
    writeJson(logsPath, logs);
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
setInterval(() => {
    const ads = readAds();
    writeAds(ads);
}, 10 * 60 * 1000);

// ======================
// 🚀 ROUTES
// ======================


app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = readJson(usersPath);

    const user = users.find(u => u.username === username && u.status === 'active');
    if (!user) {
        logAction(username, 'login-failed', username, { reason: 'User not found' });
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

app.post('/ads', (req, res) => {
    try {
        const ads = readAds();
        const now = new Date().toISOString();

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

        ads.push(ad);
        writeAds(ads);

        logAction(req.session.user?.username, 'ad-created', ad.id, {
            type: ad.type,
            company: ad.company
        });

        res.status(201).json({ message: 'Ad created successfully', ad });
    } catch (error) {
        logAction(req.session.user?.username, 'ad-create-failed', 'system', {
            error: error.message
        });
        res.status(500).json({ error: 'Failed to save ad' });
    }
});

app.get('/ads', (req, res) => {
    try {
        const ads = readAds();
        res.json(ads);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch ads' });
    }
});

app.get('/ads/:id', (req, res) => {
    try {
        const ads = readAds();
        const ad = ads.find(a => a.id === req.params.id);
        if (!ad) {

            return res.status(404).json({ error: 'Ad not found' });
        }

        res.json(ad);
    } catch (e) {
       res.status(500).json({ error: 'Failed to load ad' });
    }
});

app.put('/ads/:id', upload.single('file'), (req, res) => {
    try {
        const ads = readAds();
        const index = ads.findIndex(ad => ad.id === req.params.id);
        if (index === -1) {
            logAction(req.session.user?.username, 'ad-update-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'Ad not found' });
        }

        const updatedAd = {
            ...ads[index],
            ...req.body,
            active: req.body.active === 'true' || req.body.active === true,
            id: ads[index].id,
            updatedAt: new Date().toISOString()
        };

        if (req.file) {
            updatedAd.file = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }

        ads[index] = updatedAd;
        writeAds(ads);

        logAction(req.session.user?.username, 'ad-updated', updatedAd.id, {
            changes: Object.keys(req.body)
        });

        res.json({ message: 'Ad updated', ad: updatedAd });
    } catch (err) {
        logAction(req.session.user?.username, 'ad-update-error', req.params.id, {
            error: err.message
        });
        res.status(500).json({ error: "Server error" });
    }
});

app.delete('/ads/:id', (req, res) => {
    try {
        const ads = readAds();
        const index = ads.findIndex(ad => ad.id === req.params.id);
        if (index === -1) {
            logAction(req.session.user?.username, 'ad-delete-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: "Ad not found" });
        }

        const deleted = ads.splice(index, 1)[0];
        writeAds(ads);

        logAction(req.session.user?.username, 'ad-deleted', deleted.id, {
            type: deleted.type,
            company: deleted.company
        });

        res.json({ message: 'Ad deleted successfully', deleted });
    } catch (err) {
        logAction(req.session.user?.username, 'ad-delete-error', req.params.id, {
            error: err.message
        });
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/posts', (req, res) => {
    try {
        const posts = getPublishedPosts();

        res.json(posts);
    } catch (err) {

        res.status(500).json({ error: "Server error" });
    }
});

app.get('/posts/all', (req, res) => {
    try {
        const posts = readPosts();

        res.json(posts);
    } catch (err) {

        res.status(500).json({ error: "Server error" });
    }
});

app.get('/posts/:slug', (req, res) => {
    try {
        const posts = readPosts();
        const post = posts.find(p => p.slug === req.params.slug);
        if (!post) {

            return res.status(404).json({ message: 'Post not found' });
        }

        res.json(post);
    } catch (err) {

        res.status(500).json({ error: "Server error" });
    }
});

app.post('/posts/:slug/view', (req, res) => {
    try {
        const posts = readPosts();
        const index = posts.findIndex(p => p.slug === req.params.slug);
        if (index === -1) {
            logAction(req.session.user?.username, 'post-view-failed', req.params.slug, {
                reason: 'Not found'
            });
            return res.status(404).json({ message: 'Post not found' });
        }

        posts[index].views = (posts[index].views || 0) + 1;
        posts[index].lastViewed = new Date().toISOString();
        writePosts(posts);

        logAction(req.session.user?.username, 'post-viewed', posts[index].slug, {
            views: posts[index].views
        });

        res.status(200).json({ message: "View incremented" });
    } catch (err) {
        logAction(req.session.user?.username, 'post-view-error', req.params.slug, {
            error: err.message
        });
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/posts', (req, res) => {
    try {
        const posts = readPosts();
        const now = new Date();

        let scheduleDate;
        if (req.body.schedule) {
            scheduleDate = new Date(req.body.schedule);
            if (isNaN(scheduleDate.getTime())) {
                logAction(req.session.user?.username, 'post-create-failed', 'invalid date', {
                    schedule: req.body.schedule
                });
                return res.status(400).json({ error: "Invalid schedule date format" });
            }
        } else {
            scheduleDate = now;
        }

        const newPost = {
            ...req.body,
            createdAt: now.toISOString(),
            schedule: scheduleDate.toISOString(),
            isPublished: scheduleDate <= now
        };

        if (posts.some(p => p.slug === newPost.slug)) {
            logAction(req.session.user?.username, 'post-create-failed', newPost.slug, {
                reason: 'Slug exists'
            });
            return res.status(400).json({ message: 'Slug already exists' });
        }

        posts.push(newPost);
        writePosts(posts);

        logAction(req.session.user?.username, 'post-created', newPost.slug, {
            title: newPost.title,
            scheduled: newPost.schedule
        });

        res.status(201).json(newPost);
    } catch (err) {
        logAction(req.session.user?.username, 'post-create-error', 'system', {
            error: err.message
        });
        res.status(500).json({ error: "Server error" });
    }
});

app.put('/posts/:slug', (req, res) => {
    try {
        const posts = readPosts();
        const index = posts.findIndex(p => p.slug === req.params.slug);
        if (index === -1) {
            logAction(req.session.user?.username, 'post-update-failed', req.params.slug, {
                reason: 'Not found'
            });
            return res.status(404).json({ message: 'Post not found' });
        }

        let scheduleDate;
        if (req.body.schedule) {
            scheduleDate = new Date(req.body.schedule);
            if (isNaN(scheduleDate.getTime())) {
                logAction(req.session.user?.username, 'post-update-failed', req.params.slug, {
                    reason: 'Invalid date',
                    schedule: req.body.schedule
                });
                return res.status(400).json({ error: "Invalid schedule date format" });
            }
        } else {
            scheduleDate = new Date(posts[index].schedule);
        }

        const updatedPost = {
            ...posts[index],
            ...req.body,
            schedule: scheduleDate.toISOString(),
            isPublished: scheduleDate <= new Date()
        };

        posts[index] = updatedPost;
        writePosts(posts);

        logAction(req.session.user?.username, 'post-updated', updatedPost.slug, {
            changes: Object.keys(req.body)
        });

        res.json(updatedPost);
    } catch (err) {
        logAction(req.session.user?.username, 'post-update-error', req.params.slug, {
            error: err.message
        });
        res.status(500).json({ error: "Server error" });
    }
});

app.delete('/posts/:slug', (req, res) => {
    try {
        let posts = readPosts();
        const index = posts.findIndex(p => p.slug === req.params.slug);
        if (index === -1) {
            logAction(req.session.user?.username, 'post-delete-failed', req.params.slug, {
                reason: 'Not found'
            });
            return res.status(404).json({ message: 'Post not found' });
        }

        const deleted = posts.splice(index, 1);
        writePosts(posts);

        logAction(req.session.user?.username, 'post-deleted', req.params.slug, {
            title: deleted[0].title
        });

        res.json({ message: 'Deleted', post: deleted[0] });
    } catch (err) {
        logAction(req.session.user?.username, 'post-delete-error', req.params.slug, {
            error: err.message
        });
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/postSubmissions', requireRole(['author']), (req, res) => {
    try {
        const submissions = readJson(postSubmissionsPath);
        const newPost = {
            id: Date.now().toString(),
            ...req.body,
            status: 'pending',
            submittedBy: req.session.user.username,
            editorComments: '',
            createdAt: new Date().toISOString()
        };
        submissions.push(newPost);
        writeJson(postSubmissionsPath, submissions);
        logAction(req.session.user.username, 'post-submitted', newPost.title);
        res.status(201).json({ message: 'Post submitted for approval', post: newPost });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit post' });
    }
});


app.get('/postSubmissions', requireRole(['author', 'editor', 'admin']), (req, res) => {
    const submissions = readJson(postSubmissionsPath);
    res.json(submissions);
});


app.get('/postSubmissions/:id', requireRole(['author', 'editor', 'admin']), (req, res) => {
    const submissions = getPostSubmissions();
    const post = submissions.find(p => String(p.id) === String(req.params.id));
    if (!post) return res.status(404).send("Submission not found.");
    res.json(post);
});


app.put('/postSubmissions/:id', requireRole(['author','editor', 'admin']), (req, res) => {
    try {
        const submissions = readJson(postSubmissionsPath);
        const index = submissions.findIndex(p => p.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'Submission not found' });

        const update = req.body;
        submissions[index] = { ...submissions[index], ...update };
        writeJson(postSubmissionsPath, submissions);

        const logType = update.status === 'approved'
            ? 'post-approved'
            : update.status === 'rejected'
                ? 'post-rejected'
                : 'post-updated';

        logAction(req.session.user.username, logType, submissions[index].title);

        if (update.status === 'approved') {
            const posts = readJson(postsPath);
            const finalPost = { ...submissions[index] };
            finalPost.isPublished = new Date(finalPost.schedule) <= new Date();
            posts.push(finalPost);
            writeJson(postsPath, posts);

            submissions.splice(index, 1); // remove from submissions
            writeJson(postSubmissionsPath, submissions);
        }

        res.json({ message: 'Submission updated', post: submissions[index] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update submission' });
    }
});

app.delete('/postSubmissions/:id', requireRole(['author','editor', 'admin']), (req, res) => {
    try {
        const submissions = readJson(postSubmissionsPath);
        const index = submissions.findIndex(p => p.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'Not found' });

        const removed = submissions.splice(index, 1)[0];
        writeJson(postSubmissionsPath, submissions);
        logAction(req.session.user.username, 'post-deleted', removed.title);

        res.json({ message: 'Submission deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete submission' });
    }
});

app.get('/debug/timecheck', (req, res) => {
    try {
        const posts = readPosts();
        const now = new Date();
        const samplePost = posts.length > 0 ? posts[0] : null;

        logAction(req.session.user?.username, 'timecheck-requested', 'system');
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
        logAction(req.session.user?.username, 'timecheck-failed', 'system', {
            error: err.message
        });
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/posts/:slug.html', (req, res) => {

    res.sendFile(path.join(__dirname, 'posts/view-post.html'));
});

app.get('/comments', (req, res) => {
    const slug = req.query.slug;
    if (!slug) {

        return res.status(400).json({ error: 'Missing slug' });
    }

    const allComments = readComments();

    res.json(allComments[slug] || []);
});

app.post('/comments', (req, res) => {
    const { slug, username, comment, timestamp } = req.body;

    if (!slug || !username || !comment || !timestamp) {
        logAction(req.session.user?.username, 'comment-create-failed', 'missing fields');
        return res.status(400).json({ error: 'All fields are required' });
    }

    const allComments = readComments();

    if (!allComments[slug]) allComments[slug] = [];
    const newComment = { username, comment, timestamp };

    allComments[slug].push(newComment);
    writeComments(allComments);

    logAction(username, 'comment-created', slug, {
        commentLength: comment.length
    });

    res.status(201).json({ message: 'Comment saved', comment: newComment });
});

app.get('/users', (req, res) => {
    const users = readJson(usersPath);

    res.json(users);
});

app.get('/users/:id', (req, res) => {
    const { id } = req.params;
    const users = readJson('users.json');
    const user = users.find(u => u.id === id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
});

app.post('/users', requireAdmin, async (req, res) => {
    try {
        const users = readJson(usersPath);
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = {
            ...req.body,
            id: Date.now().toString(),
            password: hashedPassword
        };

        const duplicate = users.find(u =>
            u.username === newUser.username || u.email === newUser.email
        );
        if (duplicate) {
            logAction(req.session.user.username, 'user-create-failed', newUser.username || newUser.email, {
                reason: 'Duplicate user'
            });
            return res.status(409).json({ message: 'User already exists' });
        }

        users.push(newUser);
        writeJson(usersPath, users);

        logAction(
            req.session.user.username,
            'user-created',
            newUser.username || newUser.email,
            { role: newUser.role }
        );

        res.status(201).json({ message: 'User added', user: newUser });
    } catch (err) {
        logAction(
            req.session.user?.username,
            'user-create-error',
            'system',
            { error: err.message }
        );
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.put('/users/:id', requireAdmin, upload.none(), (req, res) => {
    try {
        const users = readJson(usersPath);
        const index = users.findIndex(u => u.id === req.params.id);
        if (index === -1) {
            logAction(req.session.user.username, 'user-update-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'User not found' });
        }

        users[index] = { ...users[index], ...req.body };
        writeJson(usersPath, users);

        logAction(
            req.session.user.username,
            'user-updated',
            users[index].username || users[index].email,
            { changes: Object.keys(req.body) }
        );

        res.json({ message: 'User updated', user: users[index] });
    } catch (err) {
        logAction(
            req.session.user.username,
            'user-update-error',
            req.params.id,
            { error: err.message }
        );
        res.status(500).json({ error: 'Failed to update user' });
    }
});

app.delete('/users/:id', requireAdmin, (req, res) => {
    try {
        const users = readJson(usersPath);
        const index = users.findIndex(u => u.id === req.params.id);
        if (index === -1) {
            logAction(req.session.user.username, 'user-delete-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'User not found' });
        }

        const deleted = users.splice(index, 1)[0];
        writeJson(usersPath, users);

        logAction(
            req.session.user.username,
            'user-deleted',
            deleted.username || deleted.email,
            { role: deleted.role }
        );

        res.json({ message: 'User deleted', user: deleted });
    } catch (err) {
        logAction(
            req.session.user.username,
            'user-delete-error',
            req.params.id,
            { error: err.message }
        );
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

app.get('/pendingUsers', (req, res) => {
    const pending = readJson(pendingUsersPath);

    res.json(pending);
});

app.get('/pendingUsers/:id', (req, res) => {
    const pendingUsers = readJson(pendingUsersPath);
    const id = req.params.id;

    const user = pendingUsers.find(u => u.id.toString() === id.toString());

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
});

const { v4: uuid } = require('uuid');
app.post('/pendingUsers', upload.single('pdf'), async (req, res) => {
    try {
        const pending = readJson(pendingUsersPath);

        // Validate required fields
        const { username, email, password, submittedBy } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        // Handle PDF validation (if uploaded)
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
            createdAt: new Date().toISOString(),
            password: hashedPassword,
            pdfFilename,
            pdfOriginalName
        };

        pending.push(newRequest);
        writeJson(pendingUsersPath, pending);

        logAction(
            username || 'anonymous',
            'pending-user-created',
            email || username,
            { submittedBy }
        );

        res.status(201).json({ message: 'Pending request submitted', request: newRequest });
    } catch (err) {
        logAction(
            'system',
            'pending-user-create-error',
            'system',
            { error: err.message }
        );
        res.status(500).json({ error: 'Failed to create pending user' });
    }
});


app.delete('/pendingUsers/:id', requireAdmin, (req, res) => {
    try {
        const pending = readJson(pendingUsersPath);
        const index = pending.findIndex(u => u.id === req.params.id);
        if (index === -1) {
            logAction(req.session.user.username, 'pending-user-delete-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'Pending user not found' });
        }

        const removed = pending.splice(index, 1)[0];
        writeJson(pendingUsersPath, pending);

        logAction(
            req.session.user.username,
            'pending-user-deleted',
            removed.email || removed.username,
            { reason: 'Admin action' }
        );

        res.json({ message: 'Pending request removed', removed });
    } catch (err) {
        logAction(
            req.session.user.username,
            'pending-user-delete-error',
            req.params.id,
            { error: err.message }
        );
        res.status(500).json({ error: 'Failed to remove pending user' });
    }
});

app.post('/approve-user', requireAdmin, (req, res) => {
    try {
        const { pendingUserId } = req.body;
        if (!pendingUserId) {
            logAction(req.session.user.username, 'user-approve-failed', 'no id', {
                reason: 'Missing pendingUserId'
            });
            return res.status(400).json({ error: 'Missing pendingUserId' });
        }

        const pending = readJson(pendingUsersPath);
        const pendingUser = pending.find(u => u.id === pendingUserId);
        if (!pendingUser) {
            logAction(req.session.user.username, 'user-approve-failed', pendingUserId, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'Pending user not found' });
        }

        const users = readJson(usersPath);
        const duplicate = users.find(u =>
            u.username === pendingUser.username || u.email === pendingUser.email
        );
        if (duplicate) {
            logAction(req.session.user.username, 'user-approve-failed', pendingUser.username || pendingUser.email, {
                reason: 'Duplicate user'
            });
            return res.status(409).json({ error: 'User already exists' });
        }

        const newUser = {
            ...pendingUser,
            id: Date.now().toString(),
            status: 'active',
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        writeJson(usersPath, users);

        const updatedPending = pending.filter(u => u.id !== pendingUserId);
        writeJson(pendingUsersPath, updatedPending);

        logAction(
            req.session.user.username,
            'user-approved',
            newUser.username || newUser.email,
            { role: newUser.role }
        );

        res.json({ message: 'User approved', user: newUser });
    } catch (err) {
        logAction(
            req.session.user.username,
            'user-approve-error',
            'system',
            { error: err.message }
        );
        res.status(500).json({ error: 'Failed to approve user' });
    }
});

app.post('/pendingUsers/:id/approve', requireAdmin, (req, res) => {
    try {
        const pendingUsers = readJson(pendingUsersPath);
        const users = readJson(usersPath);
        const userIndex = pendingUsers.findIndex(u => u.id === req.params.id);

        if (userIndex === -1) {
            logAction(req.session.user.username, 'user-approve-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: 'Pending user not found' });
        }

        const approvedUser = {
            ...pendingUsers[userIndex],
            id: Date.now().toString(),
            status: 'active',
            approvedBy: req.session.user.username,
            approvedAt: new Date().toISOString()
        };

        users.push(approvedUser);
        pendingUsers.splice(userIndex, 1);
        writeJson(usersPath, users);
        writeJson(pendingUsersPath, pendingUsers);

        logAction(
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
        logAction(
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


app.post('/pendingDeletions', (req, res) => {
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
            targetAvatar,// Add this
            requestedBy
        } = req.body;

        if (!userId || !reason) {
            return res.status(400).json({ error: 'Missing userId or reason' });
        }

        const pending = readJson(pendingDeletionsPath);
        pending.push({
            id: Date.now().toString(),
            userId,
            reason,
            targetUsername,
            targetEmail,
            targetRole,
            targetFullName,
            targetAvatar,
            requestedBy: requestedBy || req.session.user.username,
            createdAt: new Date().toISOString(),
            status: 'pending'
        });


        writeJson(pendingDeletionsPath, pending);

        logAction(req.session.user.username, 'user-delete-requested', userId, {
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


// ✅ Admin-only view of pending deletion requests
app.get('/pendingDeletions', requireAdmin, (req, res) => {
    try {
        const pending = readJson(pendingDeletionsPath);
        res.json(pending);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load delete requests' });
    }
});

app.get('/pendingDeletions', verifySession, (req, res) => {
    const user = req.session.user;
    if (!user || !['admin', 'editor'].includes(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const pending = readJSON('pendingDeletions.json');
    res.json(pending);
});
// ✅ Admin approval → actual deletion
app.post('/pendingDeletions/:id/approve', requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const pending = readJson(pendingDeletionsPath);
        const requestIndex = pending.findIndex(r => r.id === id);
        if (requestIndex === -1) return res.status(404).json({ error: 'Request not found' });

        const { userId, requestedBy } = pending[requestIndex];
        const users = readJson(usersPath);
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

        const deleted = users.splice(userIndex, 1)[0];
        writeJson(usersPath, users);

        pending.splice(requestIndex, 1);
        writeJson(pendingDeletionsPath, pending);

        logAction(req.session.user.username, 'user-delete-approved', deleted.username, {
            requestedBy,
            deletedUserId: userId
        });

        res.json({ message: 'User deleted', user: deleted });
    } catch (err) {
        res.status(500).json({ error: 'Failed to approve deletion' });
    }
});

// ✅ Admin rejection → discard request
app.post('/pendingDeletions/:id/reject', requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const pending = readJson(pendingDeletionsPath);
        const requestIndex = pending.findIndex(r => r.id === id);
        if (requestIndex === -1) return res.status(404).json({ error: 'Request not found' });

        const rejected = pending.splice(requestIndex, 1)[0];
        writeJson(pendingDeletionsPath, pending);

        logAction(req.session.user.username, 'user-delete-rejected', rejected.userId, {
            requestedBy: rejected.requestedBy
        });

        res.json({ message: 'Deletion request rejected' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reject deletion' });
    }
});

// 🟡 Editor cancels their own pending deletion request
app.delete('/pendingDeletions/:id', (req, res) => {
    try {
        const { id } = req.params;
        const username = req.session.user?.username;

        if (!username) return res.status(403).json({ error: 'Not logged in' });

        const pending = readJson(pendingDeletionsPath);
        const requestIndex = pending.findIndex(r => r.id === id);

        if (requestIndex === -1) return res.status(404).json({ error: 'Request not found' });

        const request = pending[requestIndex];

        // Only requester or admin can cancel
        const isOwner = request.requestedBy === username;
        const isAdmin = req.session.user.role === 'admin';
        if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Not authorized' });

        pending.splice(requestIndex, 1);
        writeJson(pendingDeletionsPath, pending);

        logAction(username, 'user-delete-cancelled', request.targetUsername, {
            userId: request.targetId,
            requestedBy: request.requestedBy
        });

        res.json({ message: 'Request cancelled' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to cancel deletion request' });
    }
});

// GET /check-username?username=john
app.get('/check-username', (req, res) => {
    try {
        const users = readJson(usersPath);
        const pending = readJson(pendingUsersPath);
        const username = req.query.username;

        const taken = users.some(u => u.username === username) || pending.some(p => p.username === username);

        res.json({ available: !taken });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check username' });
    }
});


// GET /check-email?email=user@example.com
app.get('/check-email', (req, res) => {
    try {
        const users = readJson(usersPath);
        const pending = readJson(pendingUsersPath);
        const email = req.query.email?.toLowerCase();

        const taken = users.some(u => u.email?.toLowerCase() === email) ||
            pending.some(p => p.email?.toLowerCase() === email);

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

app.get('/logs', (req, res) => {
    try {
        let logs = readJson(logsPath);

        if (req.query.action) {
            logs = logs.filter(log =>
                log.action?.toLowerCase().includes(req.query.action.toLowerCase())
            );
        }

        if (req.query.actor) {
            logs = logs.filter(log =>
                log.actedBy?.toLowerCase().includes(req.query.actor.toLowerCase())
            );
        }

        if (req.query.limit) {
            logs = logs.slice(0, parseInt(req.query.limit));
        }


        res.json(logs);
    } catch (err) {
        logAction(req.session.user?.username, 'logs-fetch-failed', 'system', {
            error: err.message
        });
        res.status(500).json({ error: 'Failed to load logs' });
    }
});

app.delete('/logs', (req, res) => {
    try {
        writeJson(logsPath, []); // clear log file
        logAction(req.session.user?.username, 'logs-cleared', 'admin');
        res.json({ message: 'Logs cleared successfully' });
    } catch (err) {
        logAction(req.session.user?.username, 'logs-clear-failed', 'admin', {
            error: err.message
        });
        res.status(500).json({ error: 'Failed to clear logs' });
    }
});

app.get('/ping', (req, res) => {
    logAction(req.session.user?.username, 'ping', 'admin');
    res.json({ message: 'Backend is alive!' });
});

app.listen(PORT, () => {
    console.log(`✅ Server is running at http://localhost:${PORT}`);
    console.log(`Current server time: ${new Date().toISOString()}`);
    logAction('admin', 'server-started', `port: ${PORT}`);
});