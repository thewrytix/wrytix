const express = require("express");
const router = express.Router();
const fetch = (...args) => import("node-fetch").then(mod => mod.default(...args));

const API_KEY = "30924e040f3b4bbea4219464d1c8e788";
const CACHE_DURATION = 5 * 60 * 60 * 1000; // 60 minutes

// In-memory cache object for all leagues
const cache = {};

// Helper: safely parse JSON
async function safeJson(res) {
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return await res.json();
    } else {
        const text = await res.text();
        console.error("⚠️ Non-JSON response from Football API:", text);
        return null;
    }
}

// GET /standings/:leagueId
router.get("/:leagueId", async (req, res) => {
    const leagueId = req.params.leagueId;
    const now = Date.now();

    // Serve from cache if valid
    if (cache[leagueId] && now - cache[leagueId].timestamp < CACHE_DURATION) {
        return res.json(cache[leagueId].data);
    }

    try {
        const response = await fetch(
            `https://api.football-data.org/v4/competitions/${leagueId}/standings`,
            {
                headers: { "X-Auth-Token": API_KEY },
            }
        );

        const data = await safeJson(response);

        console.log(`Football API response for ${leagueId}:`, data);


        if (!response.ok || !data) {
            return res
                .status(response.status || 500)
                .json({ error: `Football API error: ${response.statusText || "No data"}` });
        }

        // Cache the fresh data
        cache[leagueId] = {
            data,
            timestamp: now,
        };

        res.json(data);
    } catch (err) {
        console.error(`Standings fetch error for ${leagueId}:`, err);
        // If cached data exists, serve it even if API fails
        if (cache[leagueId]) {
            console.warn(`Serving cached data for ${leagueId} due to API failure`);
            return res.json(cache[leagueId].data);
        }
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
