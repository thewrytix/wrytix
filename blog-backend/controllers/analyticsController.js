const { Visit } = require('../models');

// ✅ CHANGED: Day labels now start with Sunday (Sun, Mon, Tue, ... Sat)
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ✅ CHANGED: Renamed getMonday → getSunday and adjusted to return the Sunday of the week.
function getSunday(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
    // Move back to Sunday (day=0)
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
}

const countPipeline = (matchStage, groupId) => Visit.aggregate([
    { $match: matchStage },
    {
        $group: {
            _id: groupId,
            total: { $sum: 1 },
            anonymous: { $sum: { $cond: [{ $eq: ['$userId', null] }, 1, 0] } },
            loggedIn: { $sum: { $cond: [{ $ne: ['$userId', null] }, 1, 0] } }
        }
    }
]);

// ✅ CHANGED: buildDailyBreakdown now uses Sunday as the start of the week
async function buildDailyBreakdown(referenceDate) {
    const sunday = getSunday(referenceDate);
    const saturday = new Date(sunday);
    saturday.setDate(saturday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);

    const results = await countPipeline(
        { timestamp: { $gte: sunday, $lte: saturday } },
        { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
    );

    const byDate = Object.fromEntries(results.map(r => [r._id, r]));

    const breakdown = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(sunday);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        const found = byDate[key];
        return {
            label: DAY_LABELS[i],  // 'Sun', 'Mon', ...
            date: key,
            total: found?.total || 0,
            anonymous: found?.anonymous || 0,
            loggedIn: found?.loggedIn || 0
        };
    });

    return { startDate: sunday, endDate: saturday, breakdown };
}

// ----------------------------------------------------------------------
// The rest of the functions (weekly, monthly, yearly, custom, geo) remain UNCHANGED
// ----------------------------------------------------------------------

// Weekly: Week 1 - Week 4/5 of the current month
async function buildWeeklyBreakdown(referenceDate) {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const results = await countPipeline(
        { timestamp: { $gte: startDate, $lte: endDate } },
        { $dayOfMonth: '$timestamp' }
    );

    const byDay = Object.fromEntries(results.map(r => [r._id, r]));
    const daysInMonth = endDate.getDate();
    const numWeeks = Math.ceil(daysInMonth / 7);
    const buckets = Array.from({ length: numWeeks }, () => ({ total: 0, anonymous: 0, loggedIn: 0 }));

    for (let day = 1; day <= daysInMonth; day++) {
        const idx = Math.floor((day - 1) / 7);
        const found = byDay[day];
        if (found) {
            buckets[idx].total += found.total;
            buckets[idx].anonymous += found.anonymous;
            buckets[idx].loggedIn += found.loggedIn;
        }
    }

    const breakdown = buckets.map((b, i) => ({ label: `Week ${i + 1}`, ...b }));
    return { startDate, endDate, breakdown };
}

// Monthly: Jan - Dec of the current year
async function buildMonthlyBreakdown(referenceDate) {
    const year = referenceDate.getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    const results = await countPipeline(
        { timestamp: { $gte: startDate, $lte: endDate } },
        { $month: '$timestamp' } // 1-indexed
    );

    const byMonth = Object.fromEntries(results.map(r => [r._id, r]));
    const breakdown = MONTH_LABELS.map((label, i) => {
        const found = byMonth[i + 1];
        return { label, total: found?.total || 0, anonymous: found?.anonymous || 0, loggedIn: found?.loggedIn || 0 };
    });

    return { startDate, endDate, breakdown };
}

// Yearly: last 5 years through current year
async function buildYearlyBreakdown(referenceDate, yearsBack = 5) {
    const currentYear = referenceDate.getFullYear();
    const startYear = currentYear - (yearsBack - 1);
    const startDate = new Date(startYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const results = await countPipeline(
        { timestamp: { $gte: startDate, $lte: endDate } },
        { $year: '$timestamp' }
    );

    const byYear = Object.fromEntries(results.map(r => [r._id, r]));
    const breakdown = [];
    for (let y = startYear; y <= currentYear; y++) {
        const found = byYear[y];
        breakdown.push({ label: String(y), total: found?.total || 0, anonymous: found?.anonymous || 0, loggedIn: found?.loggedIn || 0 });
    }

    return { startDate, endDate, breakdown };
}

// Custom range
async function buildCustomBreakdown(from, to) {
    const startDate = new Date(from);
    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);

    const results = await countPipeline(
        { timestamp: { $gte: startDate, $lte: endDate } },
        { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
    );

    const breakdown = results
        .sort((a, b) => a._id.localeCompare(b._id))
        .map(r => ({ label: r._id, date: r._id, total: r.total, anonymous: r.anonymous, loggedIn: r.loggedIn }));

    return { startDate, endDate, breakdown };
}

// Country breakdown — unchanged
async function buildGeoBreakdown(startDate, endDate) {
    const results = await Visit.aggregate([
        { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
        {
            $group: {
                _id: { $ifNull: ['$country', 'Unknown'] },
                total: { $sum: 1 },
                anonymous: { $sum: { $cond: [{ $eq: ['$userId', null] }, 1, 0] } },
                loggedIn: { $sum: { $cond: [{ $ne: ['$userId', null] }, 1, 0] } }
            }
        },
        { $sort: { total: -1 } },
        { $limit: 15 }
    ]);

    return results.map(r => ({ country: r._id, total: r.total, anonymous: r.anonymous, loggedIn: r.loggedIn }));
}

// Main controller — unchanged
const getVisitAnalytics = async (req, res) => {
    try {
        const { range = 'daily', from, to } = req.query;
        const now = new Date();

        let result;
        switch (range) {
            case 'daily': result = await buildDailyBreakdown(now); break;
            case 'weekly': result = await buildWeeklyBreakdown(now); break;
            case 'monthly': result = await buildMonthlyBreakdown(now); break;
            case 'yearly': result = await buildYearlyBreakdown(now, 5); break;
            case 'custom':
                if (!from || !to) return res.status(400).json({ error: 'from and to are required for custom range' });
                result = await buildCustomBreakdown(from, to);
                break;
            default:
                return res.status(400).json({ error: 'Invalid range' });
        }

        const geoBreakdown = await buildGeoBreakdown(result.startDate, result.endDate);

        const totalVisits = result.breakdown.reduce((s, b) => s + b.total, 0);
        const totalAnonymous = result.breakdown.reduce((s, b) => s + b.anonymous, 0);
        const totalLoggedIn = result.breakdown.reduce((s, b) => s + b.loggedIn, 0);

        res.set('Cache-Control', 'private, max-age=30');
        res.json({
            range,
            startDate: result.startDate,
            endDate: result.endDate,
            totalVisits,
            totalAnonymous,
            totalLoggedIn,
            breakdown: result.breakdown,
            geoBreakdown
        });
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: 'Failed to load analytics' });
    }
};

module.exports = { getVisitAnalytics };