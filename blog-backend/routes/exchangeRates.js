const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

// In-memory cache
let cache = { data: null, timestamp: 0 };
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour, adjust if needed

router.get('/api/forex', async (req, res) => {
    const now = Date.now();

    if (cache.data && now - cache.timestamp < CACHE_DURATION) {
        return res.json(cache.data);
    }

    try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await response.json();

        if (!data || !data.rates) {
            throw new Error("Invalid API response");
        }

        // Some APIs use GHS, some GHC
        const usdToGhc = data.rates.GHC || data.rates.GHS;
        const usdToEur = data.rates.EUR;
        const usdToGbp = data.rates.GBP;

        const eurToGhc = usdToGhc / usdToEur;
        const gbpToGhc = usdToGhc / usdToGbp;

        const result = {
            USD: usdToGhc,
            EUR: eurToGhc,
            GBP: gbpToGhc,
            lastUpdated: new Date()
        };

        // Cache result
        cache = { data: result, timestamp: now };

        res.json(result);
    } catch (err) {
        console.error("Forex fetch error:", err);
        res.status(500).json({ error: "Failed to fetch forex rates" });
    }
});

module.exports = router;
