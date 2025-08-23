// Fetch Forex rates
async function fetchForexRates() {
    try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await response.json();

        console.log("API response:", data);

        if (!data || !data.rates) {
            throw new Error("Invalid data format from API");
        }

        const usdToGhs = data.rates.GHS;
        const usdToEur = data.rates.EUR;
        const usdToGbp = data.rates.GBP;

        const eurToGhs = usdToGhs / usdToEur;
        const gbpToGhs = usdToGhs / usdToGbp;

        document.getElementById("usd-rate").textContent = `💵 USD/GHS: ${usdToGhs.toFixed(2)}`;
        document.getElementById("eur-rate").textContent = `💶 EUR/GHS: ${eurToGhs.toFixed(2)}`;
        document.getElementById("gbp-rate").textContent = `💷 GBP/GHS: ${gbpToGhs.toFixed(2)}`;
    } catch (error) {
        console.error("Error fetching forex rates:", error);
    }
}

// Auto-refresh every 5 minutes (300,000 milliseconds)
setInterval(fetchForexRates, 300000);
document.addEventListener("DOMContentLoaded", fetchForexRates);


// Back to the top
let backtToTopValue = () => {
    let backToTopBtn = document.getElementById("backToTop");
    let pos = document.documentElement.scrollTop;

    if (pos > 100) {
        backToTopBtn.style.display = "block";
    } else {
        backToTopBtn.style.display = "none";
    }

    backToTopBtn.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    });


};

    window.onscroll = backtToTopValue;
    window.onload = backtToTopValue;


//Hamburger
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('show');
});

// Optional: Sticky on scroll
window.addEventListener("scroll", function () {
    const nav = document.querySelector(".main-nav");
    nav.classList.toggle("sticky", window.scrollY > 0);
});



// Top header date and time
const dateTimeEl = document.getElementById("date-time");

function updateTime() {
    const now = new Date();
    const dateOptions = {weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'};
    const dateString = now.toLocaleDateString(undefined, dateOptions);
    const timeString = now.toLocaleTimeString(); // e.g., 10:23:45 AM
    dateTimeEl.textContent = `${dateString} — ${timeString}`;
}

updateTime();
setInterval(updateTime, 1000); // Update every second for real-time clock



//Feature posts

document.addEventListener("DOMContentLoaded", async () => {
    const featuredSection = document.querySelector(".featured-section");

    try {
        const res = await fetch("https://wrytix.onrender.com/posts"); // Replace with your actual API URL
        const posts = await res.json();

        // Filter only featured posts
        const featuredPosts = posts.filter(post => post.featured === true);

        if (!Array.isArray(featuredPosts) || featuredPosts.length === 0) {
            featuredSection.innerHTML = "<p>No featured posts found.</p>";
            return;
        }

        // Use first featured post as the large one
        const largePost = featuredPosts[0];
        const featuredLarge = `
            <div class="featured-large">
                <img src="${largePost.thumbnail}" alt="${largePost.title}">
                <div class="featured-info">
                    <h2><a href="posts/view-post.html?slug=${largePost.slug}">${largePost.title}</a></h2>
                    <p>${truncateText(largePost.content, 20)}</p>
                </div>
            </div>
        `;

        // Remaining featured posts in grid
        const gridPosts = featuredPosts.slice(1, 6).map(post => `
            <div class="small-post">
                <img src="${post.thumbnail}" alt="${post.title}">
                <div>
                    <h4><a href="posts/view-post.html?slug=${post.slug}">${post.title}</a></h4>
                    <p>${truncateText(post.content, 15)}</p>
                </div>
            </div>
        `).join("");

        const featuredGrid = `
            <div class="featured-grid">
                ${gridPosts}
            </div>
        `;

        featuredSection.innerHTML = featuredLarge + featuredGrid;

    } catch (error) {
        console.error("Error loading featured posts:", error);
        featuredSection.innerHTML = "<p>Failed to load featured posts.</p>";
    }

    function truncateText(text, wordLimit) {
        return text.split(" ").slice(0, wordLimit).join(" ") + "...";
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
          <span class="post-date">${formatDate(post.schedule)}</span>
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

(function () {
    const blogData = {
        posts: [],

        async init() {
            try {
                const response = await fetch("https://wrytix.onrender.com/posts");
                const data = await response.json();

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
                        excerpt: post.content.slice(0, 100) + '...',
                        thumbnail: thumbnail
                    };
                });

                this.renderAll();
            } catch (error) {
                console.error("Failed to fetch posts:", error);
            }
        },

        formatDate: function (dateStr) {
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            return new Date(dateStr).toLocaleDateString(undefined, options);
        },

        createPostHTML: function (post) {
            return `
            <article class="post-preview">
                <div>
                    <h3>${post.title}</h3>
                    <small class="post-date">${this.formatDate(post.date)}</small>
                    <p>${post.excerpt}</p>
                  <a href="./posts/view-post.html?slug=${post.slug}">Read More</a>
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


