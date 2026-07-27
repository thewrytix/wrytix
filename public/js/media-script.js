// Load ads for all media sections
// Update loadAllMediaAds to ensure containers are ready
async function loadAllMediaAds() {
    if (document.readyState === 'loading') {
        await new Promise(resolve => {
            document.addEventListener('DOMContentLoaded', resolve);
        });
    }

    const mediaSections = document.querySelectorAll('.media-section[data-ad-position]');
    if (mediaSections.length === 0) return;

    // Fetch the entire ads collection ONCE, shared across all sections
    let allAds;
    try {
        allAds = await window.WrytixAds.getAds();
    } catch (err) {
        mediaSections.forEach(section => {
            const mediaContent = section.querySelector('.media-content');
            if (mediaContent) mediaContent.innerHTML = "<p class='placeholder'>⚠️ Failed to load media.</p>";
        });
        return;
    }

    const now = new Date();

    mediaSections.forEach(section => {
        const position = section.dataset.adPosition;
        const mediaContent = section.querySelector('.media-content');
        const articleCategory = document.querySelector("article")?.dataset.category || "home-category";

        if (!mediaContent) return;

        const filtered = allAds.filter(ad =>
            ad.category === articleCategory &&
            ad.position === position &&
            ad.active &&
            new Date(ad.startDate) <= now &&
            new Date(ad.endDate) >= now
        );

        renderAdSlides(filtered, mediaContent);
    });
}

// Updated render function
function renderAdSlides(ads, container) {
    if (!container) {
        console.warn("Container is null");
        return;
    }

    // Clear the container
    container.innerHTML = '';

    if (ads.length === 0) {
        container.innerHTML = '<p class="placeholder">No media to display.</p>';
        return;
    }

    // Create a wrapper for slides if more than one (for slider functionality)
    if (ads.length > 1) {
        const slidesWrapper = document.createElement('div');
        slidesWrapper.className = 'slides-wrapper';
        slidesWrapper.style.transition = 'transform 0.5s ease';

        ads.forEach(ad => {
            const slide = document.createElement("div");
            slide.className = "media-slide";
            slide.style.height = '600px'; // Fixed height for slides
            slide.style.overflow = 'hidden';

            let content = '';
            if (ad.type === "image" && ad.file) {
                content = `<a href="${ad.link || '#'}" target="_blank"><img src="${ad.file}" alt="Media Image" style="width:100%; height:100%; object-fit:cover;"></a>`;
            } else if (ad.type === "video" && ad.file) {
                content = `<video src="${ad.file}" controls style="width:100%; height:100%; object-fit:cover;"></video>`;
            } else if (ad.type === "html" && ad.html) {
                content = `<div class="custom-content">${ad.html}</div>`;
            } else if (ad.type === "text" && ad.text) {
                content = `<div class="promo-text" style="padding:20px;">${ad.text}</div>`;
            }

            slide.innerHTML = content;
            slidesWrapper.appendChild(slide);
        });

        container.appendChild(slidesWrapper);
        enableVerticalSlider(slidesWrapper, ads.length, container);
    } else {
        // Single ad - just display it
        const ad = ads[0];
        let content = '';
        if (ad.type === "image" && ad.file) {
            content = `<a href="${ad.link || '#'}" target="_blank"><img src="${ad.file}" alt="Media Image" style="width:100%;"></a>`;
        } else if (ad.type === "video" && ad.file) {
            content = `<video src="${ad.file}" controls style="width:100%;"></video>`;
        } else if (ad.type === "html" && ad.html) {
            content = `<div class="custom-content">${ad.html}</div>`;
        } else if (ad.type === "text" && ad.text) {
            content = `<div class="promo-text">${ad.text}</div>`;
        }
        container.innerHTML = content;
    }
}

// Updated slider function
function enableVerticalSlider(sliderWrapper, count, parentContainer) {
    let index = 0;
    let paused = false;

    const mediaContainer = parentContainer.closest('.media-container');

    if (mediaContainer) {
        mediaContainer.addEventListener("mouseenter", () => paused = true);
        mediaContainer.addEventListener("mouseleave", () => paused = false);
    }

    // Clear any existing interval
    if (window.sliderIntervals) {
        window.sliderIntervals = window.sliderIntervals || [];
        window.sliderIntervals.forEach(interval => clearInterval(interval));
    }

    const interval = setInterval(() => {
        if (paused) return;
        index = (index + 1) % count;
        sliderWrapper.style.transform = `translateY(-${index * 600}px)`;
    }, 4000);

    // Store interval to clean up later
    window.sliderIntervals = window.sliderIntervals || [];
    window.sliderIntervals.push(interval);
}



// Initialize
loadAllMediaAds();