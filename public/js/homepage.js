/**
 * homepage.js
 * Fetches all homepage data in parallel via lean, purpose-built endpoints,
 * then renders each section from the pre-fetched data.
 */

const API_BASE = "https://wrytix.onrender.com";

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
   Ad Rotator (Sidebar) — unchanged, separate data source
   ========================================================= */

const AdSlider = ((trackId, containerId, category) => {
    const CACHE_TTL_MS = 5 * 60 * 1000;
    const cacheKey = `wrytix-ads-${category}`;

    const getCached = () => {
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return null;
        try {
            const { ads, timestamp } = JSON.parse(cached);
            return Date.now() - timestamp < CACHE_TTL_MS ? ads : null;
        } catch {
            localStorage.removeItem(cacheKey);
            return null;
        }
    };

    const setCached = (ads) => {
        localStorage.setItem(cacheKey, JSON.stringify({ ads, timestamp: Date.now() }));
    };

    const renderSlideContent = (ad) => {
        if (ad.type === "image" && ad.file) {
            return `<a href="${ad.link || "#"}" target="_blank"><img src="${ad.file}" alt="Media Image" loading="lazy"></a>`;
        }
        if (ad.type === "video" && ad.file) {
            return `<video src="${ad.file}" controls></video>`;
        }
        if (ad.type === "html" && ad.html) {
            return `<div class="custom-content">${ad.html}</div>`;
        }
        if (ad.type === "text" && ad.text) {
            return `<div class="promo-text">${ad.text}</div>`;
        }
        return "";
    };

    const enableRotation = (track, count) => {
        let index = 0;
        let paused = false;
        const wrapper = document.getElementById(containerId);

        wrapper.addEventListener("mouseenter", () => (paused = true));
        wrapper.addEventListener("mouseleave", () => (paused = false));

        setInterval(() => {
            if (paused) return;
            index = (index + 1) % count;
            track.style.transform = `translateY(-${index * 600}px)`;
        }, 4000);
    };

    const render = (ads) => {
        const track = document.getElementById(trackId);
        if (!track) return;

        if (ads.length === 0) {
            track.innerHTML = "<p>No media to display.</p>";
            return;
        }

        track.innerHTML = ads.map(ad => `<div class="media-item">${renderSlideContent(ad)}</div>`).join("");

        if (ads.length > 1) enableRotation(track, ads.length);
    };

    const init = async () => {
        const cached = getCached();
        if (cached) {
            render(cached);
            return;
        }

        try {
            const ads = await window.WrytixAds.getAds();
            const now = new Date();

            const filtered = ads.filter(ad =>
                ad.category === category &&
                ad.active &&
                new Date(ad.startDate) <= now &&
                new Date(ad.endDate) >= now
            );

            setCached(filtered);
            render(filtered);
        } catch (error) {
            console.error("AdSlider: failed to load ads:", error);
            const track = document.getElementById(trackId);
            if (track) track.innerHTML = "<p>⚠️ Failed to load media.</p>";
        }
    };

    return { init };
})("mediaTrack", "rotContainer", document.querySelector("article")?.dataset.category || "homepage");

/* =========================================================
   Init — fetch everything in parallel, then render
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    AdSlider.init(); // independent data source, runs concurrently with the rest

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