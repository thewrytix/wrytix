// js/marquee.js (or wherever this code lives)
// API_BASE is defined globally in config.js – must be loaded before this script.

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch(`${API_BASE}/headline`);
        const data = await res.json();
        document.getElementById("headline-marquee").textContent = data.text || "Welcome to Wrytix!";
    } catch (err) {
        console.error("Failed to fetch headline:", err);
        document.getElementById("headline-marquee").textContent = "Welcome to Wrytix!";
    }
});