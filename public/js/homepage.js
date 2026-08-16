/**
 * homepage.js
 * Fetches all homepage data in parallel via lean, purpose-built endpoints,
 * then renders each section from the pre-fetched data.
 *
 * API_BASE is defined globally in config.js – must be loaded before this script.
 */

/* =========================================================
   Utilities
   ========================================================= */

const truncateText = (text, wordLimit) => {
    if (!text) return "";
    return text.split(" ").slice(0, wordLimit).join(" ") + "...";
};

/* =========================================================
   Sidebar: Trending & Popular Posts
   ========================================================= */

const Sidebar = (() => {
    const createListItem = (post) => `
        <li>
            <a href="posts/view-post.html?slug=${encodeURIComponent(post.slug)}">${post.title}</a>
        </li>`;

    const render = (trending, popular) => {
        const trendingUl = document.getElementById("trending-list");
        const popularUl = document.getElementById("popular-list");
        if (!trendingUl || !popularUl) return;

        trendingUl.innerHTML = trending.map(createListItem).join("");
        popularUl.innerHTML = popular.map(createListItem).join("");
    };

    return { render };
})();

/* =========================================================
   Featured Section
   ========================================================= */

const FeaturedSection = (() => {
    const renderLarge = (post) => `
        <div class="featured-large">
            <img src="${window.optimizeThumbnail(post.thumbnail, 800)}" alt="${post.title}" loading="lazy">
            <div class="featured-info">
                <h3><a href="posts/view-post.html?slug=${post.slug}">${post.title}</a></h3>
                <p>${truncateText(post.excerpt, 20)}</p>
            </div>
        </div>`;

    const renderGridItem = (post) => `
        <div class="small-post">
            <img src="${window.optimizeThumbnail(post.thumbnail, 300)}" alt="${post.title}" loading="lazy">
            <div>
                <h4><a href="posts/view-post.html?slug=${post.slug}">${post.title}</a></h4>
                <p>${truncateText(post.excerpt, 10)}</p>
            </div>
        </div>`;

    const render = (featuredPosts) => {
        const section = document.querySelector(".featured-section");
        if (!section) return;

        if (!featuredPosts || featuredPosts.length === 0) {
            section.innerHTML = "<p>No featured posts found.</p>";
            return;
        }

        const [largePost, ...rest] = featuredPosts;
        const gridHtml = rest.slice(0, 6).map(renderGridItem).join("");

        section.innerHTML = `
            ${renderLarge(largePost)}
            <div class="featured-grid">${gridHtml}</div>
        `;
    };

    return { render };
})();

/* =========================================================
   Category Sections (News, Sports, Business, etc.)
   ========================================================= */

const CategorySections = (() => {
    const createPostHTML = (post) => `
        <article class="post-preview">
            <div>
                <h3><a href="./posts/view-post.html?slug=${post.slug}">${post.title}</a></h3>
                <p>${post.excerpt || ""}</p>
            </div>
            ${post.thumbnail ? `<img src="${window.optimizeThumbnail(post.thumbnail, 300)}" alt="${post.title}" loading="lazy" onerror="this.style.display='none'">` : ""}
        </article>`;

    const renderCategory = (categoryId, posts) => {
        const section = document.getElementById(categoryId);
        if (!section) return;

        const heading = section.querySelector("h2");
        const postsHtml = (posts || []).map(createPostHTML).join("");
        section.innerHTML = heading.outerHTML + postsHtml;
    };

    const render = (categoryData) => {
        Object.keys(categoryData).forEach(cat => renderCategory(cat, categoryData[cat]));
    };

    return { render };
})();

/* =========================================================
   Category Inline Ads Loader (homepage-specific)
   ========================================================= */

function renderInlineAdSlides(ads, container) {
    if (!container) {
        console.warn("Container is null");
        return;
    }

    container.innerHTML = '';

    if (ads.length === 0) {
        container.innerHTML = '<p class="placeholder">No media to display.</p>';
        return;
    }

    if (ads.length > 1) {
        const slidesWrapper = document.createElement('div');
        slidesWrapper.className = 'slides-wrapper';
        slidesWrapper.style.transition = 'transform 0.5s ease';

        ads.forEach(ad => {
            const slide = document.createElement("div");
            slide.className = "media-slide";
            slide.style.height = '600px';
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
        enableInlineSlider(slidesWrapper, ads.length, container);
    } else {
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

function enableInlineSlider(sliderWrapper, count, parentContainer) {
    let index = 0;
    let paused = false;

    const mediaContainer = parentContainer.closest('.media-container');

    if (mediaContainer) {
        mediaContainer.addEventListener("mouseenter", () => paused = true);
        mediaContainer.addEventListener("mouseleave", () => paused = false);
    }

    if (parentContainer._sliderInterval) {
        clearInterval(parentContainer._sliderInterval);
    }

    parentContainer._sliderInterval = setInterval(() => {
        if (paused) return;
        index = (index + 1) % count;
        sliderWrapper.style.transform = `translateY(-${index * 600}px)`;
    }, 4000);
}

/**
 * Loads all category inline ads on the homepage
 * Uses: category = "home-category" + position (e.g., "news", "business")
 */
async function loadAllCategoryAds() {
    if (document.readyState === 'loading') {
        await new Promise(resolve => {
            document.addEventListener('DOMContentLoaded', resolve);
        });
    }

    const mediaSections = document.querySelectorAll('.media-section[data-ad-position]');
    if (mediaSections.length === 0) return;

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
    // ✅ Inline ads use category: "home-category"
    const articleCategory = document.querySelector("article")?.dataset.category || "home-category";

    mediaSections.forEach(section => {
        const position = section.dataset.adPosition;
        const mediaContent = section.querySelector('.media-content');
        if (!mediaContent) return;

        const filtered = allAds.filter(ad =>
            ad.category === articleCategory &&
            ad.position === position &&
            ad.active &&
            new Date(ad.startDate) <= now &&
            new Date(ad.endDate) >= now
        );

        renderInlineAdSlides(filtered, mediaContent);
    });
}

/* =========================================================
   Init — fetch everything in parallel, then render
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Load sidebar ads (from frontend.js global loader)
    // ✅ Sidebar ads use category: "homepage" (no position)
    window.loadSidebarAds({
        sliderId: 'mediaTrack',
        wrapperId: 'rotContainer',
        defaultCategory: 'homepage'
    });

    // 2. Load category inline ads (homepage-specific)
    loadAllCategoryAds();

    // 3. Load main content
    try {
        const [featured, categoryPosts, trending, popular] = await Promise.all([
            fetch(`${API_BASE}/posts/featured`).then(r => r.json()),
            fetch(`${API_BASE}/posts/homepage-categories`).then(r => r.json()),
            fetch(`${API_BASE}/posts/trending`).then(r => r.json()),
            fetch(`${API_BASE}/posts/popular`).then(r => r.json())
        ]);

        FeaturedSection.render(featured);
        CategorySections.render(categoryPosts);
        Sidebar.render(trending, popular);
    } catch (error) {
        console.error("Homepage: failed to load data:", error);
    }
});