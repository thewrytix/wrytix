const { Visit } = require('../models');

const RANGE_DAYS = {
    daily: 1,
    weekly: 7,
    monthly: 30,
    yearly: 365
};

const getVisitAnalytics = async (req, res) => {
    try {
        const { range, from, to } = req.query;

        let startDate, endDate = new Date();

        if (range === 'custom' && from && to) {
            startDate = new Date(from);
            endDate = new Date(to);
        } else {
            const days = RANGE_DAYS[range] || 7;
            startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        }

        // Group by day for the chart, regardless of overall range
        const results = await Visit.aggregate([
            { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                    total: { $sum: 1 },
                    anonymous: {
                        $sum: { $cond: [{ $eq: ['$userId', null] }, 1, 0] }
                    },
                    loggedIn: {
                        $sum: { $cond: [{ $ne: ['$userId', null] }, 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const totalVisits = results.reduce((sum, r) => sum + r.total, 0);

        res.json({
            range: range || 'weekly',
            startDate,
            endDate,
            totalVisits,
            dailyBreakdown: results.map(r => ({
                date: r._id,
                total: r.total,
                anonymous: r.anonymous,
                loggedIn: r.loggedIn
            }))
        });
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: 'Failed to load analytics' });
    }
};

module.exports = { getVisitAnalytics };