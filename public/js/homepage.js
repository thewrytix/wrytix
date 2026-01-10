document.addEventListener("DOMContentLoaded", () => {

    /* =================== FEATURED SECTION =================== */
    const featuredSection = document.querySelector(".featured-section");

    if (featuredSection) {
        // Large featured skeleton
        const largeSkeleton = document.createElement("div");
        largeSkeleton.className = "featured-large skeleton";
        largeSkeleton.innerHTML = `
            <div class="image-skeleton skeleton"></div>
            <div class="text-skeleton skeleton"></div>
        `;

        // Small featured grid skeleton
        const smallGridSkeleton = document.createElement("div");
        smallGridSkeleton.className = "featured-grid";
        for (let i = 0; i < 6; i++) { // show 3 skeleton posts
            const smallPost = document.createElement("div");
            smallPost.className = "small-post skeleton";
            smallPost.innerHTML = `
                <div class="image-skeleton skeleton"></div>
                <div class="text-skeleton skeleton"></div>
            `;
            smallGridSkeleton.appendChild(smallPost);
        }

        featuredSection.appendChild(largeSkeleton);
        featuredSection.appendChild(smallGridSkeleton);
    }

    /* =================== CATEGORY SECTIONS =================== */
    const categorySections = document.querySelectorAll(".category-section");

    categorySections.forEach(section => {
        for (let i = 0; i < 4; i++) { // 3 skeleton posts per category
            const postSkeleton = document.createElement("div");
            postSkeleton.className = "post-preview skeleton";
            postSkeleton.innerHTML = `
                <div class="image-skeleton skeleton"></div>
                <div class="text-skeleton skeleton"></div>
            `;
            section.appendChild(postSkeleton);
        }
    });

    /* =================== SIDEBAR LISTS =================== */
    const sidebarLists = document.querySelectorAll(".sidebar-section ul");

    sidebarLists.forEach(list => {
        for (let i = 0; i < 9; i++) { // 5 skeleton items
            const li = document.createElement("li");
            li.className = "skeleton";
            li.innerHTML = `<div class="text-skeleton skeleton"></div>`;
            list.appendChild(li);
        }
    });

    /* =================== FETCH API DATA =================== */
    async function loadAllData() {
        try {
            const response = await fetch('https://wrytix.onrender.com/posts');
            if (!response.ok) throw new Error(`API: ${response.status}`);
            const allPosts = await response.json(); // Raw array of posts

            // Cache for 5min
            localStorage.setItem('wrytix-posts', JSON.stringify({ data: allPosts, timestamp: Date.now() }));

            // Process once: featured, categories, sidebar
            processFeatured(allPosts); // Your existing featured logic
            processCategories(allPosts); // Merge blogData.renderAll logic
            processSidebar(allPosts); // Merge fetchPostsFromAPI + updateSidebarPosts

            // Remove all skeletons
            document.querySelectorAll('.skeleton').forEach(el => {
                el.style.opacity = '0';
                setTimeout(() => el.remove(), 300);
            });
        } catch (error) {
            console.error('Load failed:', error);
            // Enhanced fallback: Load from cache if available
            const cached = localStorage.getItem('wrytix-posts');
            if (cached) {
                const { data: allPosts, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < 300000) { // 5min TTL
                    processFeatured(allPosts); // etc.
                    return;
                }
            }
            // Show retry UI (your existing errorDiv)
            showRetryUI();
        }
    }

// Helper: Check cache first
    function getCachedPosts() {
        const cached = localStorage.getItem('wrytix-posts');
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < 300000) return data;
        }
        return null;
    }

});


// Trending and Popular Posts
async function fetchPostsFromAPI() {
    try {
        const response = await fetch('https://wrytix.onrender.com/posts');
        const data = await response.json();

        // Ensure slug and schedule exist, and format thumbnail if needed
        return data.map(post => ({
            title: post.title || 'Untitled',
            slug: post.slug || '', // ✅ Ensure slug is present
            schedule: post.schedule || '', // fallback if missing
            views: post.views || 0
        }));
    } catch (error) {
        console.error("Error fetching posts:", error);
        return [];
    }
}

function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
}

function updateSidebarPosts(posts) {
    const trendingUl = document.getElementById('trending-list');
    const popularUl = document.getElementById('popular-list');

    if (!trendingUl || !popularUl) return;

    function getDynamicThreshold(posts, percentage = 0.1) {
        if (posts.length === 0) return 0;

        // Sort posts by views (descending)
        const sorted = [...posts].sort((a, b) => b.views - a.views);

        // Index for top X% cutoff
        const index = Math.floor(sorted.length * percentage);

        // If percentage too small, ensure at least 1 element
        const cutoffIndex = Math.max(index, 0);

        return sorted[cutoffIndex]?.views || 0;
    }

    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

// Get thresholds dynamically
    const trendingViewsThreshold = getDynamicThreshold(posts, 0.1); // top 10%
    const popularViewsThreshold = getDynamicThreshold(posts, 0.05); // top 5%

    const trendingPosts = posts
        .filter(post => {
            const postDate = new Date(post.schedule);
            return (
                // Within 2 weeks
                postDate >= twoWeeksAgo ||
                // Or older but in top 10% of views
                post.views >= trendingViewsThreshold
            );
        })
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

    const popularPosts = posts
        .filter(post => {
            const postDate = new Date(post.schedule);
            return (
                // Within 1 month
                postDate >= oneMonthAgo ||
                // Or older but in top 5% of views
                post.views >= popularViewsThreshold
            );
        })
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

    function createListItem(post) {
        return `
        <li>
          <a href="posts/view-post.html?slug=${encodeURIComponent(post.slug)}">${post.title}</a>
        <!--  <span class="post-date">${formatDate(post.schedule)}</span>-->
        </li>`;
    }

    trendingUl.innerHTML = trendingPosts.map(createListItem).join('');
    popularUl.innerHTML = popularPosts.map(createListItem).join('');
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
    const allPosts = await fetchPostsFromAPI();
    updateSidebarPosts(allPosts);
});





// Ads Show
async function loadSidebarAds() {
    const articleCategory = document.querySelector("article")?.dataset.category || "homepage";
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
        const res = await fetch("https://wrytix.onrender.com/ads");
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




