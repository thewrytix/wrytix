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
        for (let i = 0; i < 5; i++) { // 3 skeleton posts per category
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
        for (let i = 0; i < 10; i++) { // 5 skeleton items
            const li = document.createElement("li");
            li.className = "skeleton";
            li.innerHTML = `<div class="text-skeleton skeleton"></div>`;
            list.appendChild(li);
        }
    });
    /* =================== FETCH API DATA =================== */
    async function loadContent() {
        try {
            // Single fetch for all data (no redundancy)
            const startTime = performance.now(); // Measure fetch speed
            const response = await fetch('https://wrytix.onrender.com/posts');
            const fetchTime = performance.now() - startTime;
            console.log(`Fetch took ${fetchTime.toFixed(2)}ms`); // Log for debugging

            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const allData = await response.json(); // Expect: {featured: {large: {}, small: []}, categories: {...}, sidebar: {...}}

            // Remove skeletons FIRST (unblocks even partial loads)
            document.querySelectorAll('.skeleton').forEach(el => {
                el.style.opacity = '0'; // Fade out smooth
                setTimeout(() => el.remove(), 300); // 0.3s transition
            });

            // Inject Featured (adapt if API keys differ)
            if (featuredSection && allData.featured) {
                const { large, small } = allData.featured;
                // Large featured
                const largeDiv = document.createElement("div");
                largeDiv.className = "featured-large";
                largeDiv.innerHTML = `
                    <img src="${large.thumbnail}" alt="${large.title}" loading="lazy">
                    <div class="featured-info">
                      <h2><a href="${large.link}">${large.title}</a></h2>
                      <p>${large.description}</p>
                    </div>
                `;
                featuredSection.appendChild(largeDiv);
                // Small grid
                const gridDiv = document.createElement("div");
                gridDiv.className = "featured-grid";
                small.forEach(post => {
                    const smallDiv = document.createElement("div");
                    smallDiv.className = "small-post";
                    smallDiv.innerHTML = `
                        <img src="${post.thumbnail}" alt="${post.title}" loading="lazy">
                        <div>
                          <h4><a href="${post.link}">${post.title}</a></h4>
                          <p>${post.description}</p>
                        </div>
                    `;
                    gridDiv.appendChild(smallDiv);
                });
                featuredSection.appendChild(gridDiv);
            }
            // Inject Categories
            categorySections.forEach(section => {
                const categoryId = section.id;
                const posts = allData.categories?.[categoryId] || [];
                posts.forEach(post => {
                    const postDiv = document.createElement("div");
                    postDiv.className = "post-preview";
                    postDiv.innerHTML = `
                        <img src="${post.thumbnail}" alt="${post.title}" loading="lazy">
                        <div>
                          <h3><a href="${post.link}">${post.title}</a></h3>
                          <p>${post.description}</p>
                          <span class="post-date">${post.date}</span>
                        </div>
                    `;
                    section.appendChild(postDiv);
                });
            });
            // Inject Sidebar
            sidebarLists.forEach(list => {
                const listId = list.id;
                const items = allData.sidebar?.[listId] || [];
                items.forEach(item => {
                    const li = document.createElement("li");
                    li.innerHTML = `<a href="${item.link}">${item.title}</a> <span>${item.date}</span>`;
                    list.appendChild(li);
                });
            });
        } catch (error) {
            console.error('Content load failed:', error);
            // Always remove skeletons on error + show retry
            document.querySelectorAll('.skeleton').forEach(el => {
                el.style.opacity = '0';
                setTimeout(() => el.remove(), 300);
            });
            // Add error UI (append to body or a section)
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'padding: 20px; background: #ffebee; color: #d32f2f; text-align: center; margin: 20px; border-radius: 8px;';
            errorDiv.innerHTML = '<p>Oops! Failed to load content. <button onclick="location.reload()" style="background: #d32f2f; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Retry Now</button></p>';
            document.body.insertBefore(errorDiv, document.body.firstChild);
        }
    }
    loadContent();
});

(() => {
    async function fetchForexRates() {
        try {
            const response = await fetch("https://wrytix.onrender.com/api/forex");
            const data = await response.json();

            const usdEl = document.getElementById("usd-rate");
            const eurEl = document.getElementById("eur-rate");
            const gbpEl = document.getElementById("gbp-rate");

            if (usdEl) usdEl.textContent = `💵 USD/GHC: ${data.USD.toFixed(2)}`;
            if (eurEl) eurEl.textContent = `💶 EUR/GHC: ${data.EUR.toFixed(2)}`;
            if (gbpEl) gbpEl.textContent = `💷 GBP/GHC: ${data.GBP.toFixed(2)}`;

        } catch (error) {
            console.error("Error fetching forex rates from backend:", error);
        }
    }

    // Run once page loads
    document.addEventListener("DOMContentLoaded", fetchForexRates);

    // Refresh every 5 minutes
    setInterval(fetchForexRates, 300000);
})();



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
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('show');
});

// Close menu when clicking a link on mobile
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('show');
    });
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !hamburger.contains(e.target) && navLinks.classList.contains('show')) {
        hamburger.classList.remove('active');
        navLinks.classList.remove('show');
    }
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


document.addEventListener("DOMContentLoaded", () => {
    const MOBILE_BREAKPOINT = 486;

    const SOCIAL_LINKS = {
        web: {
            facebook: "https://facebook.com",
            twitter: "https://x.com/WrytixOfficial",
            instagram: "https://www.instagram.com/wrytixofficial/",
            youtube: "https://www.youtube.com/channel/UCig810dXawPE2YlVwwS6EOQ",
            tiktok: "https://www.tiktok.com/@wrytix",
            linkedin: "https://www.linkedin.com/company/wrytix/?viewAsMember=true"
        },
        mobile: {
            facebook: "fb://page/your-page-id",
            twitter: "twitter://user?screen_name=WrytixOfficial",
            instagram: "instagram://user?username=wrytixofficial",
            youtube: "youtube://channel/UCig810dXawPE2YlVwwS6EOQ",
            tiktok: "snssdk1128://user/profile/wrytix",
            linkedin: "linkedin://profile/company/wrytix"
        }
    };

    const buildSocialHtml = () => {
        const links = window.innerWidth <= MOBILE_BREAKPOINT ? SOCIAL_LINKS.mobile : SOCIAL_LINKS.web;
        return Object.entries(links)
            .map(([platform, url]) =>
                `<a href="${url}" target="_blank" rel="noopener noreferrer" class="${platform}" aria-label="${platform}"></a>`
            ).join('');
    };

    const injectSocialIcons = () => {
        document.querySelectorAll('.social-icons, .header-social-icons')
            .forEach(container => {
                if (!container.querySelector('a')) {
                    container.innerHTML = buildSocialHtml();
                }
            });
    };

    injectSocialIcons();

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            document.querySelectorAll('.social-icons a, .header-social-icons a')
                .forEach(link => {
                    const platform = link.className;
                    const links = window.innerWidth <= MOBILE_BREAKPOINT ? SOCIAL_LINKS.mobile : SOCIAL_LINKS.web;
                    link.href = links[platform];
                });
        }, 100);
    });
});
