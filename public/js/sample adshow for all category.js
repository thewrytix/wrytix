// Ads Show
async function loadSidebarAds() {
    // Infer category from URL path, fallback to "business"
    const path = window.location.pathname.toLowerCase();
    const category = path.includes("sports") ? "sports"
        : path.includes("news") ? "news"
            : path.includes("technology") ? "technology"
                : path.includes("lifestyle") ? "lifestyle"
                    : path.includes("foreign") ? "foreign"
                        : "business"; // default

    try {
        const res = await fetch("https://wrytix.onrender.com/ads");
        const ads = await res.json();
        const now = new Date();

        const filtered = ads.filter(ad =>
            ad.category === category &&
            ad.active &&
            new Date(ad.startDate) <= now &&
            new Date(ad.endDate) >= now
        );

        renderAdSlides(filtered);
    } catch (err) {
        document.getElementById("adSlider").innerHTML = "<p>⚠️ Failed to load ads.</p>";
        console.error(err);
    }
}