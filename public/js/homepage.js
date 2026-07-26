/**
 * homepage.js
 * Handles: sidebar (trending/popular), featured section, category sections,
 * and homepage sidebar ad rotator.
 * Depends on: window.WrytixPosts (postsCache.js) — must load before this file.
 */

/* =========================================================
   Utilities
   ========================================================= */

const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
};

const truncateText = (text, wordLimit) => {
    if (!text) return "";
    return text.split(" ").slice(0, wordLimit).join(" ") + "...";
};

/* =========================================================
   Sidebar: Trending & Popular Posts
   ========================================================= */

const Sidebar = (() => {
    const getDynamicThreshold = (posts, percentage = 0.1) => {
        if (posts.length === 0) return 0;
        const sorted = [...posts].sort((a, b) => b.views - a.views);
        const cutoffIndex = Math.max(Math.floor(sorted.length * percentage), 0);
        return sorted[cutoffIndex]?.views || 0;
    };

    const createListItem = (post) => `
        <li>
            <a href="posts/view-post.html?slug=${encodeURIComponent(post.slug)}">${post.title}</a>
        </li>`;

    const render = (posts) => {
        const trendingUl = document.getElementById("trending-list");
        const popularUl = document.getElementById("popular-list");
        if (!trendingUl || !popularUl) return;

        const now = new Date();
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const trendingThreshold = getDynamicThreshold(posts, 0.1);
        const popularThreshold = getDynamicThreshold(posts, 0.05);

        const trendingPosts = posts
            .filter(post => new Date(post.schedule) >= twoWeeksAgo || post.views >= trendingThreshold)
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);

        const popularPosts = posts
            .filter(post => new Date(post.schedule) >= oneMonthAgo || post.views >= popularThreshold)
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);

        trendingUl.innerHTML = trendingPosts.map(createListItem).join("");
        popularUl.innerHTML = popularPosts.map(createListItem).join("");
    };

    const init = async () => {
        try {
            const data = await window.WrytixPosts.getPosts();
            const posts = data.map(post => ({
                title: post.title || "Untitled",
                slug: post.slug || "",
                schedule: post.schedule || "",
                views: post.views || 0
            }));
            render(posts);
        } catch (error) {
            console.error("Sidebar: failed to load posts:", error);
        }
    };

    return { init };
})();

/* =========================================================
   Featured Section
   ========================================================= */

const FeaturedSection = (() => {
    const el = () => document.querySelector(".featured-section");

    const renderLarge = (post) => `
        <div class="featured-large">
            <img src="${post.thumbnail}" alt="${post.title}">
            <div class="featured-info">
                <h3><a href="posts/view-post.html?slug=${post.slug}">${post.title}</a></h3>
                <p>${truncateText(post.excerpt, 20)}</p>
            </div>
        </div>`;

    const renderGridItem = (post) => `
        <div class="small-post">
            <img src="${post.thumbnail}" alt="${post.title}">
            <div>
                <h4><a href="posts/view-post.html?slug=${post.slug}">${post.title}</a></h4>
                <p>${truncateText(post.excerpt, 10)}</p>
            </div>
        </div>`;

    const init = async () => {
        const section = el();
        if (!section) return;

        try {
            const posts = await window.WrytixPosts.getPosts();
            const featured = posts.filter(post => post.featured === true);

            if (featured.length === 0) {
                section.innerHTML = "<p>No featured posts found.</p>";
                return;
            }

            const [largePost, ...rest] = featured;
            const gridHtml = rest.slice(0, 6).map(renderGridItem).join("");

            section.innerHTML = `
                ${renderLarge(largePost)}
                <div class="featured-grid">${gridHtml}</div>
            `;
        } catch (error) {
            console.error("FeaturedSection: failed to load posts:", error);
            section.innerHTML = "<p>Failed to load featured posts.</p>";
        }
    };

    return { init };
})();

/* =========================================================
   Category Sections (News, Sports, Business, etc.)
   ========================================================= */

const CategorySections = (() => {
    const CATEGORIES = ["news", "foreign", "business", "sports", "lifestyle", "technology"];

    const createPostHTML = (post) => `
        <article class="post-preview">
            <div>
                <h3><a href="./posts/view-post.html?slug=${post.slug}">${post.title}</a></h3>
                <p>${post.excerpt}</p>
            </div>
            ${post.thumbnail ? `<img src="${post.thumbnail}" alt="${post.title}" onerror="this.style.display='none'">` : ""}
        </article>`;

    const renderCategory = (categoryId, posts) => {
        const section = document.getElementById(categoryId);
        if (!section) return;

        const heading = section.querySelector("h2");
        const postsHtml = posts
            .filter(post => post.category === categoryId)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5)
            .map(createPostHTML)
            .join("");

        section.innerHTML = heading.outerHTML + postsHtml;
    };

    const normalizePost = (post) => ({
        title: post.title,
        slug: post.slug,
        url: post.url,
        date: post.schedule,
        category: post.category,
        excerpt: post.excerpt || "",
        thumbnail: post.thumbnail || ""
    });

    const init = async () => {
        try {
            const data = await window.WrytixPosts.getPosts();
            const posts = data.map(normalizePost);
            CATEGORIES.forEach(cat => renderCategory(cat, posts));
        } catch (error) {
            console.error("CategorySections: failed to load posts:", error);
        }
    };

    return { init };
})();

/* =========================================================
   Ad Rotator (Sidebar)
   ========================================================= */

const AdSlider = ((trackId, containerId, category) => {
    const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
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
            return `<a href="${ad.link || "#"}" target="_blank"><img src="${ad.file}" alt="Media Image"></a>`;
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

        track.innerHTML = ads
            .map(ad => `<div class="media-item">${renderSlideContent(ad)}</div>`)
            .join("");

        if (ads.length > 1) enableRotation(track, ads.length);
    };

    const init = async () => {
        const cached = getCached();
        if (cached) {
            render(cached);
            return;
        }

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
   Init
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    Sidebar.init();
    FeaturedSection.init();
    CategorySections.init();
    AdSlider.init();
});