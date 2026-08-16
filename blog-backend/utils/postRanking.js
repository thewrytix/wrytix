// utils/postRanking.js
//
// Single source of truth for "trending" and "popular" post ranking.
// Import THIS everywhere trending/popular is needed — postController.js,
// dashboardController.js, or anywhere else — instead of writing a local
// copy. Duplicating this per-controller is exactly what caused dashboard
// and public-site trending/popular to silently diverge before.
//
// Logic: a post qualifies if it was published within the window (e.g.
// last 2 weeks for trending, last month for popular) — full stop. Then
// ranked by views within that window.
//
// Deliberately NOT using a "recent OR above a view-percentile" OR-rule
// (an earlier version of this file did). That design had three real
// problems, not just style preference:
//   1. A brand-new post with 0 views could appear in "Trending" purely
//      for being recent — that's not what trending means to a reader.
//   2. `views` is a lifetime cumulative counter (see incrementPostView —
//      no timestamped per-day event log exists), so the percentile
//      threshold structurally favors OLD posts that had more calendar
//      time to accumulate views, which is close to the opposite of what
//      "trending" should reward.
//   3. The percentile pool (90-day working set) didn't match either the
//      14-day or 30-day window it was feeding into, so a post published
//      80 days ago could leak into "Trending" via the threshold escape
//      hatch despite not being part of the 14-day window conceptually.
//
// If trending/popular lists end up too sparse in practice (few posts
// published in the window), the fix is a visible primary+backfill UI
// pattern — not silently blending in older high-view posts as if they
// were trending.

const { Post } = require('../models');

const RANK_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const rankCache = new Map(); // cacheKey -> { data, expiresAt }

function invalidateRankCache() {
    rankCache.clear();
}

async function computeMostViewedInWindow(windowMs, limit) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - windowMs);

    return Post.find({ schedule: { $lte: now, $gte: cutoff } })
        .select('title slug views schedule')
        .sort({ views: -1 })
        .limit(limit)
        .lean();
}

async function getRankedPosts(windowMs, limit = 10) {
    const cacheKey = `${windowMs}:${limit}`;
    const cached = rankCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    const data = await computeMostViewedInWindow(windowMs, limit);
    rankCache.set(cacheKey, { data, expiresAt: Date.now() + RANK_CACHE_TTL_MS });
    return data;
}

const TRENDING_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks
const POPULAR_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;  // 1 month

module.exports = {
    getRankedPosts,
    invalidateRankCache,
    TRENDING_WINDOW_MS,
    POPULAR_WINDOW_MS,
};