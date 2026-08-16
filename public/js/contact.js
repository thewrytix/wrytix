// js/contact.js
// API_BASE is defined globally in config.js – must be loaded before this script.

// Contact Form
const form = document.querySelector('.contact-form');
form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(form);
    const rawName = formData.get('name');
    const rawEmail = formData.get('email');
    const rawMessage = formData.get('message');

    // Sanitize inputs before sending
    const data = {
        name: SecurityUtils.sanitizeInput(rawName, { maxLength: 100 }),
        email: SecurityUtils.sanitizeInput(rawEmail, { maxLength: 100 }),
        message: SecurityUtils.sanitizeInput(rawMessage, { maxLength: 500 })
    };

    try {
        const response = await fetch(`${API_BASE}/contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            form.innerHTML = "<p style='color: green;'>Thank you! Your message has been sent successfully.</p>";
        } else {
            // Escape error message to prevent XSS
            const safeError = SecurityUtils.escapeHtml(result.error || 'Something went wrong. Please try again.');
            form.innerHTML = `<p style='color: red;'>${safeError}</p>`;
        }
    } catch (error) {
        console.error('Error:', error);
        form.innerHTML = "<p style='color: red;'>Network error. Please check your connection and try again.</p>";
    }
});

// Ads Show — now uses API_BASE
async function loadSidebarAds() {
    const articleCategory = document.querySelector("article")?.dataset.category || "contact";
    const cacheKey = `wrytix-ads-${articleCategory}`;
    const cacheTTL = 300000; // 5 minutes in ms

    // Check cache first
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try {
            const { ads, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < cacheTTL) {
                console.log(`Using cached ads for ${articleCategory}`);
                renderAdSlides(ads);
                return;
            }
        } catch (err) {
            console.warn('Invalid cache, fetching fresh:', err);
            localStorage.removeItem(cacheKey);
        }
    }

    try {
        const res = await fetch(`${API_BASE}/ads`);
        const ads = await res.json();
        const now = new Date();
        const filtered = ads.filter(ad =>
            ad.category === articleCategory &&
            ad.active &&
            new Date(ad.startDate) <= now &&
            new Date(ad.endDate) >= now
        );

        // Cache the filtered ads
        localStorage.setItem(cacheKey, JSON.stringify({
            ads: filtered,
            timestamp: Date.now()
        }));

        renderAdSlides(filtered);
    } catch (err) {
        document.getElementById("mediaTrack").innerHTML = "<p>⚠️ Failed to load media.</p>";
        console.error(err);
    }
}

function renderAdSlides(ads) {
    const slider = document.getElementById("mediaTrack");
    slider.innerHTML = '';
    if (ads.length === 0) {
        slider.innerHTML = '<p>No media to display.</p>';
        return;
    }
    ads.forEach(ad => {
        const slide = document.createElement("div");
        slide.className = "media-item";
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
        slider.appendChild(slide);
    });
    if (ads.length > 1) enableVerticalSlider(slider, ads.length);
}

function enableVerticalSlider(slider, count) {
    let index = 0;
    let paused = false;
    const wrapper = document.getElementById("rotContainer");
    wrapper.addEventListener("mouseenter", () => paused = true);
    wrapper.addEventListener("mouseleave", () => paused = false);
    setInterval(() => {
        if (paused) return;
        index = (index + 1) % count;
        slider.style.transform = `translateY(-${index * 600}px)`;
    }, 4000);
}

loadSidebarAds();