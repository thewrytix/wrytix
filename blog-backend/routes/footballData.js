const express = require("express");
const router = express.Router();
const API_KEY = "6f9bb75e7cd942f49e24fb72185bbd9d";

let fetch;
(async () => {
    fetch = (await import("node-fetch")).default;
})();

// GET /standings/:leagueId
router.get("/:leagueId", async (req, res) => {
    try {
        const leagueId = req.params.leagueId;

        // Ensure fetch is loaded
        if (!fetch) {
            return res.status(500).json({ error: "Fetch not loaded yet" });
        }

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
        res.json(data);
    } catch (err) {
        console.error("Standings fetch error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
