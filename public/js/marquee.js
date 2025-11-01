
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch("https://wrytix.onrender.com/headline");
        const data = await res.json();
        document.getElementById("headline-marquee").textContent = data.text || "Welcome to Wrytix!";
    } catch (err) {
        console.error("Failed to fetch headline:", err);
        document.getElementById("headline-marquee").textContent = "Welcome to Wrytix!";
    }
});