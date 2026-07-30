const { Ad } = require('../models');
const { logAction } = require('../utils/logger');

// Background job only — never called during a GET request
const expireOldAds = async () => {
    const now = new Date();
    const result = await Ad.updateMany(
        { endDate: { $lt: now }, active: true },
        { $set: { active: false } }
    );
    if (result.modifiedCount > 0) {
        console.log(`Expired ${result.modifiedCount} ads`);
    }
};

const createAd = async (req, res) => {
    try {
        const now = new Date();
        const ad = {
            id: Date.now().toString(),
            type: req.body.type,
            category: req.body.category,
            position: req.body.position,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            link: req.body.link || "",
            company: req.body.company || '',
            html: req.body.html || "",
            text: req.body.text || "",
            file: req.body.file || "",       // should now be a Cloudinary URL from the frontend
            thumbnail: req.body.thumbnail || "", // same
            active: !!req.body.active,
            createdAt: now
        };

        await Ad.create(ad);
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
};

const getAds = async (req, res) => {
    try {
        const ads = await Ad.find()
            .select('id type category position startDate endDate link company html text file thumbnail active')
            .lean();
        res.set('Cache-Control', 'public, max-age=60');
        res.json(ads);
    } catch (e) {
        console.error('Error fetching ads:', e);
        res.status(500).json({ error: 'Failed to fetch ads' });
    }
};

const getAdById = async (req, res) => {
    try {
        const ad = await Ad.findOne({ id: req.params.id }).lean();
        if (!ad) {
            return res.status(404).json({ error: 'Ad not found' });
        }
        res.json(ad);
    } catch (e) {
        res.status(500).json({ error: 'Failed to load ad' });
    }
};

const updateAd = async (req, res) => {
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

        // NOTE: no more multer file->base64 conversion here — file uploads now
        // go directly to Cloudinary from the frontend, and req.body.file already
        // contains the resulting URL. See frontend upload flow.

        await Ad.updateOne({ id: req.params.id }, updatedAd);
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
};

const deleteAd = async (req, res) => {
    try {
        const ad = await Ad.findOne({ id: req.params.id }).lean();
        if (!ad) {
            await logAction(req.session.user?.username, 'ad-delete-failed', req.params.id, {
                reason: 'Not found'
            });
            return res.status(404).json({ error: "Ad not found" });
        }

        await Ad.deleteOne({ id: req.params.id });
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
};


const getManagedAds = async (req, res) => {
    try {
        const { status = 'all', page = 1, search = '', category = '' } = req.query;
        const limit = 20;
        const skip = (parseInt(page) - 1) * limit;
        const now = new Date();

        let query = {};

        if (status === 'active') query.active = true;
        if (status === 'inactive') query.active = false;
        if (status === 'expired') query.endDate = { $lt: now };

        if (search) query.company = { $regex: search, $options: 'i' };
        if (category) query.category = category;

        const [items, total] = await Promise.all([
            Ad.find(query)
                .select('id type category position startDate endDate link company html text file thumbnail active')
                .sort({ startDate: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Ad.countDocuments(query)
        ]);

        res.json({
            items,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('getManagedAds error:', err);
        res.status(500).json({ error: 'Failed to load ads' });
    }
};

const bulkDeleteAds = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No ids provided' });
        }

        const result = await Ad.deleteMany({ id: { $in: ids } });

        await logAction(req.session.user?.username, 'bulk-delete-ads', 'multiple', {
            deletedCount: result.deletedCount
        });

        res.json({ message: 'Bulk delete complete', deletedCount: result.deletedCount });
    } catch (err) {
        console.error('bulkDeleteAds error:', err);
        res.status(500).json({ error: 'Bulk delete failed' });
    }
};

const bulkToggleAdsStatus = async (req, res) => {
    try {
        const { ids, active } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No ids provided' });
        }

        const result = await Ad.updateMany({ id: { $in: ids } }, { $set: { active: !!active } });

        await logAction(req.session.user?.username, 'bulk-toggle-ads', 'multiple', {
            modifiedCount: result.modifiedCount, active
        });

        res.json({ message: 'Bulk update complete', modifiedCount: result.modifiedCount });
    } catch (err) {
        console.error('bulkToggleAdsStatus error:', err);
        res.status(500).json({ error: 'Bulk update failed' });
    }
};


module.exports = { createAd, getAds, getAdById, updateAd, deleteAd, expireOldAds,getManagedAds,
    bulkDeleteAds,
    bulkToggleAdsStatus };