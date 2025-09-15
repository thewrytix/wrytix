const express = require("express");
const router = express.Router();
const API_KEY = "6f9bb75e7cd942f49e24fb72185bbd9";

let fetch;
(async () => {
    fetch = (await import("node-fetch")).default;
})();

// In-memory cache per league
// Structure: { leagueId: { data: ..., timestamp: ... } }
const cache = {};
const CACHE_DURATION = 60 * 60 * 1000; // 60 minutes in milliseconds

// GET /standings/:leagueId
router.get("/:leagueId", async (req, res) => {
    const leagueId = req.params.leagueId;
    const now = Date.now();

    // Serve from cache if available and not expired
    if (cache[leagueId] && (now - cache[leagueId].timestamp < CACHE_DURATION)) {
        return res.json(cache[leagueId].data);
    }

    // Ensure fetch is loaded
    if (!fetch) {
        return res.status(500).json({ error: "Fetch not loaded yet" });
    }

    try {
        const response = await fetch(
            `https://api.football-data.org/v4/competitions/${leagueId}/standings`,
            {
                headers: {
                    "X-Auth-Token": API_KEY,
                },
            }
        );

        if (!response.ok) {
            return res
                .status(response.status)
                .json({ error: `Football API error: ${response.statusText}` });
        }

        const data = await response.json();

        // Cache the result
        cache[leagueId] = {
            data,
            timestamp: now
        };

        res.json(data);
    } catch (err) {
        console.error("Standings fetch error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
