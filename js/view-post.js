document.addEventListener("DOMContentLoaded", async function () {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");

    // Blog post template
    const blogTemplate = `
                <section class="blog-posts">
                    <article data-category="">
                        <nav class="breadcrumbs" id="breadcrumbs"></nav>
                        <h1 id="post-title"> </h1>
                        <img id="post-thumbnail" src="" alt="" style="width:100%; max-height:400px; object-fit:cover; margin: 16px 0; border-radius: 8px;" >
                        <p><strong>By <span id="post-author"></span> | <span id="post-date"></span></strong></p>
                        <div id="post-content"> </div>
                        <div class="source">Source: <span id="post-source"> </span></div>
                    </article>

                    <div class="share-post">
                        <div class="share-wrapper">
                            <button class="share-toggle" title="Share this post">
                                <i class="fas fa-share-alt"></i>
                            </button>

                            <div class="share-hidden hidden">
                                <a href="mailto:?subject=Check this out&body=Have a look at this post: [URL]" title="Share via Email">
                                    <i class="fas fa-envelope"></i>
                                </a>
                                <a href="#" onclick="window.print();" title="Print this page">
                                    <i class="fas fa-print"></i>
                                </a>
                                <button class="copy-url" title="Copy link">
                                    <i class="fas fa-link"></i>
                                </button>
                            </div>
                        </div>

                        <div class="share-icons">
                            <a href="#" class="share-facebook" title="Share on Facebook" target="_blank"><i class="fab fa-facebook-f"></i></a>
                            <a href="#" class="share-twitter" title="Share on Twitter" target="_blank"><i class="fab fa-x-twitter"></i></a>
                            <a href="#" class="share-linkedin" title="Share on LinkedIn" target="_blank"><i class="fab fa-linkedin-in"></i></a>
                            <a href="#" class="share-whatsapp" title="Share on WhatsApp" target="_blank"><i class="fab fa-whatsapp"></i></a>
                            <a href="#" class="share-telegram" title="Share on Telegram" target="_blank"><i class="fab fa-telegram-plane"></i></a>
                            <a href="#" class="share-reddit" title="Share on Reddit" target="_blank"><i class="fab fa-reddit-alien"></i></a>
                            <a href="#" class="share-pinterest" title="Share on Pinterest" target="_blank"><i class="fab fa-pinterest-p"></i></a>
                            <a href="#" class="share-instagram" title="Share on Instagram" target="_blank"><i class="fab fa-instagram"></i></a>
                        </div>
                    </div>

                    <div class="comment-box">
                        <h3>Leave a Comment</h3>
                        <input type="text" id="username" placeholder="Your name" />
                        <textarea id="commentText" placeholder="Comment"></textarea><br />
                        <button class="comment-button">Post Comment</button>
                        <div class="comments-list">
                            <!-- Comments will be loaded dynamically -->
                        </div>
                    </div>
                </section>


        <!-- Sidebar -->
        <aside class="sidebar">
        
        <div class="sidebar-section ad-sidebar">
                <div class="ad-slider-wrapper" id="adSliderWrapper">
                    <div class="ad-slider" id="adSlider">
                        <p>Loading ads...</p>
                    </div>
                </div>
            </div>
            
            <div class="sidebar-section" id="related-posts">
                <h3>Related Posts </h3>
                <ul id="related-list"></ul>
            </div>


        </aside>
            `;

    // Inject template into target container
    const targetContainer = document.querySelector('.main-content');
    targetContainer.innerHTML = blogTemplate;

    if (!slug) {
        document.getElementById("post-title").textContent = "No post selected.";
        return;
    }

    try {
        // Step 1: Fetch post quickly
        const res = await fetch(`https://wrytix.onrender.com/posts/${slug}`);
        if (!res.ok) throw new Error("Post not found");
        const post = await res.json();

        // Step 2: Render the post
        document.title = post.title;
        document.getElementById("post-title").textContent = post.title;
        document.getElementById("post-author").textContent = post.author || "Unknown";
        document.getElementById("post-date").textContent = post.schedule
            ? new Date(post.schedule).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
            : "N/A";

        if (post.thumbnail) {
            document.getElementById("post-thumbnail").src = post.thumbnail;
        }

        document.getElementById("post-content").innerHTML = post.content;

        // source
        const sourceEl = document.getElementById("post-source");
        if (post.source && post.source.startsWith('http')) {
            sourceEl.innerHTML = `<a href="${post.source}" target="_blank">${post.source}</a>`;
        } else if (post.source) {
            sourceEl.textContent = post.source;
        } else {
            sourceEl.textContent = "N/A";
        }

        // Step 3: Render breadcrumbs
        const breadcrumbsContainer = document.getElementById("breadcrumbs");
        if (breadcrumbsContainer) {
            const category = post.category || "Uncategorized";
            breadcrumbsContainer.innerHTML = `
                            <a href="../index.html">Home</a>
                            <span>›</span>
                            <a href="../html/${category.toLowerCase()}.html">${category}</a>
                            <span>›</span>
                            <span>${post.title}</span>
                        `;
        }

        // Step 4: Fetch related posts in background
        setTimeout(async () => {
            try {
                const allPostsRes = await fetch("https://wrytix.onrender.com/posts");
                const allPosts = await allPostsRes.json();
                const relatedPosts = allPosts.filter(p => p.category === post.category && p.slug !== post.slug).slice(0, 10);

                const relatedList = document.getElementById("related-list");
                if (relatedList) {
                    if (relatedPosts.length === 0) {
                        relatedList.innerHTML = "<li>No related posts found.</li>";
                    } else {
                        relatedList.innerHTML = relatedPosts.map(p => `
                                        <li><a href="/posts/view-post.html?slug=${encodeURIComponent(p.slug)}">${p.title}</a></li>
                                    `).join('');
                    }
                }
            } catch (err) {
                console.error("Failed to load related posts:", err);
            }
        }, 0);

        // Step 5: Increment views in background
        fetch(`https://wrytix.onrender.com/posts/${slug}/view`, { method: 'POST' })
            .catch(err => console.warn("Failed to update views:", err));

        // Step 6: Setup interactive features after content is loaded
        setupShareFeatures();
        setupCommentSystem();

    } catch (error) {
        console.error("Error loading post:", error);
        document.getElementById("post-title").textContent = "Failed to load post";
        document.getElementById("post-content").innerHTML = "<p>Unable to retrieve post content.</p>";
    }

    function setupShareFeatures() {
        // Share functionality is now handled by post-share-icons.js
        // This function can be empty or removed entirely
        console.log("Share features will be initialized by post-share-icons.js");
    }

    function setupCommentSystem() {
        // Comment functionality
        const commentButton = document.querySelector('.comment-button');
        if (commentButton) {
            commentButton.addEventListener('click', function() {
                const username = document.getElementById('username').value;
                const commentText = document.getElementById('commentText').value;

                if (username && commentText) {
                    const commentsList = document.querySelector('.comments-list');
                    const newComment = document.createElement('div');
                    newComment.className = 'comment';
                    newComment.innerHTML = `
                                <strong>${username}</strong>
                                <em>Just now</em>
                                <p>${commentText}</p>
                            `;
                    commentsList.insertBefore(newComment, commentsList.firstChild);

                    // Clear form
                    document.getElementById('username').value = '';
                    document.getElementById('commentText').value = '';
                } else {
                    alert('Please fill in both name and comment fields.');
                }
            });
        }
    }
});

// Ads Show
async function loadSidebarAds() {
    // Get category from the ad container, default to "business"
    const adContainer = document.getElementById("adSlider");
    const category = adContainer?.dataset.category || "view-post";

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

        renderAdSlides(filtered);
    } catch (err) {
        document.getElementById("adSlider").innerHTML = "<p>⚠️ Failed to load ads.</p>";
        console.error(err);
    }
}


function renderAdSlides(ads) {
    const slider = document.getElementById("adSlider");
    slider.innerHTML = '';

    if (ads.length === 0) {
        slider.innerHTML = '<p>No ads to display.</p>';
        return;
    }

    ads.forEach(ad => {
        const slide = document.createElement("div");
        slide.className = "ad-slide";

        let content = '';
        if (ad.type === "image" && ad.file) {
            content = `<a href="${ad.link || '#'}" target="_blank"><img src="${ad.file}" alt="Ad Image"></a>`;
        } else if (ad.type === "video" && ad.file) {
            content = `<video src="${ad.file}" controls></video>`;
        } else if (ad.type === "html" && ad.html) {
            content = `<div class="html-ad">${ad.html}</div>`;
        } else if (ad.type === "text" && ad.text) {
            content = `<div class="text-ad">${ad.text}</div>`;
        }

        slide.innerHTML = content;
        slider.appendChild(slide);
    });

    if (ads.length > 1) enableVerticalSlider(slider, ads.length);
}

function enableVerticalSlider(slider, count) {
    let index = 0;
    let paused = false;

    const wrapper = document.getElementById("adSliderWrapper");

    wrapper.addEventListener("mouseenter", () => paused = true);
    wrapper.addEventListener("mouseleave", () => paused = false);

    setInterval(() => {
        if (paused) return;
        index = (index + 1) % count;
        slider.style.transform = `translateY(-${index * 600}px)`;
    }, 4000);
}

loadSidebarAds();
