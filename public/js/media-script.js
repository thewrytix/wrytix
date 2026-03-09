// Load ads for all media sections

async function loadAllMediaAds() {
    // Find all media sections
    const mediaSections = document.querySelectorAll('.media-section[data-ad-position]');

    // Create an array of promises for each section
    const loadPromises = Array.from(mediaSections).map(async (section) => {
        const position = section.dataset.adPosition;
        const mediaContent = section.querySelector('.media-content');
        const articleCategory = document.querySelector("article")?.dataset.category || "homepage";

        if (!mediaContent) return;

        // Create position-specific cache key
        const cacheKey = `wrytix-ads-${articleCategory}-${position}`;
        const cacheTTL = 300000;

        // Check cache first
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const { ads, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < cacheTTL) {
                    console.log(`Using cached ${position} ads for ${articleCategory}`);
                    renderAdSlides(ads, mediaContent);
                    return;
                }
            } catch (err) {
                console.warn('Invalid cache, fetching fresh:', err);
                localStorage.removeItem(cacheKey);
            }
        }

        try {
            const res = await fetch("https://wrytix.onrender.com/ads");
            const allAds = await res.json();
            const now = new Date();

            // Filter by category AND position
            const filtered = allAds.filter(ad =>
                ad.category === articleCategory &&
                ad.position === position &&
                ad.active &&
                new Date(ad.startDate) <= now &&
                new Date(ad.endDate) >= now
            );

            // Cache the position-specific filtered ads
            localStorage.setItem(cacheKey, JSON.stringify({
                ads: filtered,
                timestamp: Date.now()
            }));

            renderAdSlides(filtered, mediaContent);
        } catch (err) {
            mediaContent.innerHTML = "<p>⚠️ Failed to load media.</p>";
            console.error(`Error loading ${position} ads:`, err);
        }
    });

    // Wait for all sections to load
    await Promise.all(loadPromises);
    console.log('All media sections loaded');
}

// Updated render function to accept a specific container
function renderAdSlides(ads, container) {
    container.innerHTML = '';

    if (ads.length === 0) {
        container.innerHTML = '<p>No media to display.</p>';
        return;
    }

    ads.forEach(ad => {
        const slide = document.createElement("div");
        slide.className = "media-slide";
        let content = '';

        if (ad.type === "image" && ad.file) {
            content = `<a href="${ad.link || '#'}" target="_blank"><img src="${ad.file}" alt="Media Image"></a>`;
        } else if (ad.type === "video" && ad.file) {
            content = `<video src="${ad.file}" controls></video>`;
        } else if (ad.type === "html" && ad.html) {
            content = `<div class="custom-content">${ad.html}</div>`;
        } else if (ad.type === "text" && ad.text) {
            content = `<div class="promo-text">${ad.text}</div>`;
        }

        slide.innerHTML = content;
        container.appendChild(slide);
    });

    // Enable slider for this specific container if multiple ads
    if (ads.length > 1) {
        enableHorizontalSlider(container, ads.length);
    }
}

// Updated slider function to work with any container
function enableHorizontalSlider(slider, count) {
    let index = 0;
    let paused = false;

    // Find the parent media-container for this specific slider
    const wrapper = slider.closest('.media-container');

    if (wrapper) {
        wrapper.addEventListener("mouseenter", () => paused = true);
        wrapper.addEventListener("mouseleave", () => paused = false);
    }

    setInterval(() => {
        if (paused) return;
        index = (index + 1) % count;
        slider.style.transform = `translateY(-${index * 600}px)`;
    }, 4000);
}

// Initialize all media sections
loadAllMediaAds();