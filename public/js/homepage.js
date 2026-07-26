
// Trending and Popular Posts
async function fetchPostsFromAPI() {
    try {
        const data = await window.WrytixPosts.getPosts();
        return data.map(post => ({
            title: post.title || 'Untitled',
            slug: post.slug || '',
            schedule: post.schedule || '',
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



// Ads Main Show


/*
async function loadMainAds() {
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
                renderMainAdSlides(ads);
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
        document.getElementById("mediaContent").innerHTML = "<p>⚠️ Failed to load media.</p>";
        console.error(err);
    }
}

function renderMainAdSlides(ads) {
    const slider = document.getElementById("mediaContent");
    slider.innerHTML = '';
    if (ads.length === 0) {
        slider.innerHTML = '<p>No media to display.</p>';
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
        slider.appendChild(slide);
    });
    if (ads.length > 1) enableHorizontalSlider(slider, ads.length);
}



function enableHorizontalSlider(slider, count) {
    let index = 0;
    let paused = false;
    const wrapper = document.getElementById("mediaContainer");
    wrapper.addEventListener("mouseenter", () => paused = true);
    wrapper.addEventListener("mouseleave", () => paused = false);
    setInterval(() => {
        if (paused) return;
        index = (index + 1) % count;
        slider.style.transform = `translateY(-${index * 600}px)`;
    }, 4000);
}

loadMainAds();

*/






// Ads Side Show
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




(function () {
    const blogData = {
        posts: [],

        async init() {
            try {
                const data = await window.WrytixPosts.getPosts();

                // Convert API fields if needed
                this.posts = data.map(post => {
                    // Handle all image formats - check if already a data URL or needs conversion
                    let thumbnail;
                    if (!post.thumbnail) {
                        thumbnail = ''; // No thumbnail
                    } else if (post.thumbnail.startsWith('data:image')) {
                        thumbnail = post.thumbnail; // Already formatted
                    } else if (post.thumbnail.startsWith('http') || post.thumbnail.startsWith('/')) {
                        thumbnail = post.thumbnail; // Regular URL
                    } else {
                        // Assume it's base64 data but don't force jpeg format
                        thumbnail = `data:image;base64,${post.thumbnail}`;
                    }

                    return {
                        title: post.title,
                        slug: post.slug, // ✅ Add this line
                        url: post.url,
                        date: post.schedule,
                        category: post.category,
                        excerpt: post.excerpt || '',
                        thumbnail: thumbnail
                    };
                });

                this.renderAll();
            } catch (error) {
                console.error("Failed to fetch posts:", error);
            }
        },



        formatDate: function (dateStr) {
            const date = new Date(dateStr);
            const now = new Date();
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

            function timeAgo(time) {
                const seconds = Math.floor((now - time) / 1000);
                if (seconds < 5) return "Just now";
                if (seconds < 60) return `${seconds} seconds ago`;
                const minutes = Math.floor(seconds / 60);
                if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
                const hours = Math.floor(minutes / 60);
                if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
                const days = Math.floor(hours / 24);
                return `${days} day${days !== 1 ? "s" : ""} ago`;
            }

            if (diffDays < 7) {
                // Show relative time if within 7 days
                return timeAgo(date);
            } else {
                //  Show absolute date if 7+ days
                const options = { year: 'numeric', month: 'short', day: 'numeric' };
                return date.toLocaleDateString(undefined, options);
            }},


        createPostHTML: function (post) {
            return `
            <article class="post-preview">
                <div>
                    <h3><a href="./posts/view-post.html?slug=${post.slug}">${post.title}</a></h3>
                  <!--  <small class="post-date">${this.formatDate(post.date)}</small>-->
                    <p>${post.excerpt}</p>
                </div>
                ${post.thumbnail ? `<img src="${post.thumbnail}" alt="${post.title}" onerror="this.style.display='none'">` : ''}
            </article>`;
        },

        renderCategory: function (categoryId) {
            const section = document.getElementById(categoryId);
            if (!section) return;

            const heading = section.querySelector("h2");

            const categoryPosts = this.posts
                .filter(post => post.category === categoryId)
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)
                .map(post => this.createPostHTML(post))
                .join('');

            section.innerHTML = heading.outerHTML + categoryPosts;
        },

        renderAll: function () {
            const categories = ["news", "foreign", "business", "sports", "lifestyle", "technology"];
            categories.forEach(cat => this.renderCategory(cat));
        }
    };

    // Run it safely after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => blogData.init());
    } else {
        blogData.init();
    }
})();

