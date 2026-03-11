const { Ad } = require('../models');
const { logAction } = require('../utils/logger');

const readAds = async () => {
    const now = new Date();
    const ads = await Ad.find().lean();
    let updated = false;
    for (let ad of ads) {
        if (ad.endDate && new Date(ad.endDate) < now && ad.active) {
            ad.active = false;
            updated = true;
            await Ad.updateOne({ _id: ad._id }, { active: false });
        }
    }
    return ads;
};

const createAd = async (req, res) => {
    try {
        const now = new Date();
        const ad = {
            id: Date.now().toString(),
            type: req.body.type,
            category: req.body.category,
            adPosition: req.body.adPosition,
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
        const ads = await readAds();
        if (res) {
            res.json(ads);
        } else {
            // Called from interval - no response, just return data
            return ads;
        }
    } catch (e) {
        console.error('Error fetching ads:', e);
        if (res) {
            res.status(500).json({ error: 'Failed to fetch ads' });
        } else {
            // For interval, just log - don't throw
            console.error('Ad auto-refresh failed:', e);
        }
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

        if (req.file) {
            updatedAd.file = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        }

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

module.exports = { createAd, getAds, getAdById, updateAd, deleteAd };