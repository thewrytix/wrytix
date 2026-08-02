const { Post, PostSubmission, Ad, User, PendingUser, Visit } = require('../models');

const getDynamicThreshold = (posts, percentage) => {
    if (posts.length === 0) return 0;
    const sorted = [...posts].sort((a, b) => b.views - a.views);
    return sorted[Math.max(Math.floor(sorted.length * percentage), 0)]?.views || 0;
};

const buildAdminStats = async () => {
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [posts, ads, users, pendingUserCount, pendingApprovals, visitsToday] = await Promise.all([
        Post.find().select('title slug schedule views lastViewed').lean(),
        Ad.find().select('type company category active startDate endDate').lean(),
        User.find().select('status role').lean(),
        PendingUser.countDocuments(),
        PostSubmission.countDocuments({ status: 'pending' }),
        Visit.countDocuments({ timestamp: { $gte: yesterday } })
    ]);

    const live = posts.filter(p => new Date(p.schedule) <= now).length;
    const trendingThreshold = getDynamicThreshold(posts, 0.1);
    const popularThreshold = getDynamicThreshold(posts, 0.05);

    const isRecent = (p, cutoff) => {
        const d = new Date(p.schedule);
        const lv = p.lastViewed ? new Date(p.lastViewed) : null;
        return d >= cutoff || (lv && lv >= cutoff);
    };

    const trendingPosts = posts.filter(p => isRecent(p, twoWeeksAgo) || p.views >= trendingThreshold)
        .sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
    const popularPosts = posts.filter(p => isRecent(p, oneMonthAgo) || p.views >= popularThreshold)
        .sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
    const recentActivity = [...posts].sort((a, b) => new Date(b.schedule) - new Date(a.schedule)).slice(0, 5);

    const recentAds = [...ads].sort((a, b) => new Date(b.startDate) - new Date(a.startDate)).slice(0, 5)
        .map(ad => ({
            type: ad.type, company: ad.company, category: ad.category,
            status: new Date(ad.endDate) < now ? 'Expired' : (ad.active ? 'Active' : 'Inactive'),
            startDate: ad.startDate, endDate: ad.endDate
        }));

    const expiringAds = ads.filter(ad => {
        const end = new Date(ad.endDate);
        return end >= now && end <= sevenDaysFromNow;
    }).map(ad => {
        const daysLeft = Math.ceil((new Date(ad.endDate) - now) / (1000 * 60 * 60 * 24));
        return {
            company: ad.company, type: ad.type, category: ad.category,
            endsIn: daysLeft === 0 ? 'Today' : `${daysLeft} day(s)`, endDate: ad.endDate
        };
    }).sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

    const usersByRole = {
        viewer: users.filter(u => u.role === 'viewer').length,
        author: users.filter(u => u.role === 'author').length,
        editor: users.filter(u => u.role === 'editor').length,
        admin: users.filter(u => u.role === 'admin').length
    };

    return {
        role: 'admin',
        totalPosts: posts.length,
        livePosts: live,
        scheduledPosts: posts.length - live,
        totalViews: posts.reduce((s, p) => s + (p.views || 0), 0),
        trendingCount: trendingPosts.length,
        popularCount: popularPosts.length,
        trendingPosts, popularPosts, recentActivity,

        totalUsers: users.length,
        activeUsers: users.filter(u => u.status === 'active').length,
        inactiveUsers: users.filter(u => u.status === 'inactive').length,
        pendingUsers: pendingUserCount,
        usersByRole,

        totalAds: ads.length,
        activeAds: ads.filter(a => a.active).length,
        inactiveAds: ads.filter(a => !a.active).length,
        expiredAds: ads.filter(a => new Date(a.endDate) < now).length,
        recentAds, expiringAds,

        pendingApprovals,
        visitsToday
    };
};

const buildEditorStats = async (username) => {
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [posts, mySubmissionQueue, myAssignedAuthorsCount] = await Promise.all([
        Post.find().select('title slug schedule views lastViewed').lean(),
        PostSubmission.find({ assignedEditor: username })
            .select('title status submittedBy category createdAt')
            .sort({ createdAt: -1 })
            .lean(),
        User.countDocuments({ role: 'author', lineManager: username })
    ]);

    const live = posts.filter(p => new Date(p.schedule) <= now).length;
    const topViewed = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
    const pending = mySubmissionQueue.filter(s => s.status === 'pending');
    const recentSubmissions = mySubmissionQueue.slice(0, 5);

    // 🔥 Compute trending and popular (same as admin)
    const trendingThreshold = getDynamicThreshold(posts, 0.1);
    const popularThreshold = getDynamicThreshold(posts, 0.05);

    const isRecent = (p, cutoff) => {
        const d = new Date(p.schedule);
        const lv = p.lastViewed ? new Date(p.lastViewed) : null;
        return d >= cutoff || (lv && lv >= cutoff);
    };

    const trendingPosts = posts.filter(p => isRecent(p, twoWeeksAgo) || p.views >= trendingThreshold)
        .sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
    const popularPosts = posts.filter(p => isRecent(p, oneMonthAgo) || p.views >= popularThreshold)
        .sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);

    return {
        role: 'editor',
        totalPosts: posts.length,
        livePosts: live,
        scheduledPosts: posts.length - live,
        totalViews: posts.reduce((s, p) => s + (p.views || 0), 0),
        pendingApprovals: pending.length,
        myAuthorsCount: myAssignedAuthorsCount,
        trendingCount: trendingPosts.length,
        popularCount: popularPosts.length,
        recentSubmissions,
        trendingPosts,  
        popularPosts,
        topViewed,
    };
};

const buildAuthorStats = async (username) => {
    const [mySubmissions, myPublished] = await Promise.all([
        PostSubmission.find({ submittedBy: username })
            .select('title status createdAt category').lean(),
        Post.find({ submittedBy: username })
            .select('title slug views schedule category').lean()
    ]);

    return {
        role: 'author',
        totalPosts: mySubmissions.length + myPublished.length,
        approved: myPublished.length,
        pending: mySubmissions.filter(s => s.status === 'pending').length,
        rejected: mySubmissions.filter(s => s.status === 'rejected').length,
        myPosts: myPublished
    };
};

const getDashboardStats = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        let stats;
        if (user.role === 'admin') stats = await buildAdminStats();
        else if (user.role === 'editor') stats = await buildEditorStats(user.username);
        else if (user.role === 'author') stats = await buildAuthorStats(user.username);
        else return res.status(403).json({ error: 'Forbidden' });

        res.set('Cache-Control', 'private, max-age=30');
        res.json(stats);
    } catch (err) {
        console.error('Dashboard stats error:', err);
        res.status(500).json({ error: 'Failed to load dashboard stats' });
    }
};

module.exports = { getDashboardStats };