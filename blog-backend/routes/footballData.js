const express = require("express");
const fetch = import("node-fetch");
const router = express.Router();

const API_KEY = "6f9bb75e7cd942f49e24fb72185bbd9d"; // football-data.org key

// GET /standings/:leagueId
router.get("/:leagueId", async (req, res) => {
    try {
        const leagueId = req.params.leagueId;

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
