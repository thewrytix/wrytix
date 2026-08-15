document.addEventListener("DOMContentLoaded", async function () {
    const API_BASE = "https://wrytix.onrender.com";
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");

    const blogTemplate = `
                <section class="blog-posts">
                    <article data-category="">
                        <nav class="breadcrumbs" id="breadcrumbs">
                            <div class="text-skeleton skeleton" style="width:220px;height:16px;"></div>
                        </nav>
                        <h1 id="post-title">
                            <div class="text-skeleton skeleton" style="width:80%;height:32px;"></div>
                        </h1>
                        <div id="post-thumbnail-wrapper" class="image-skeleton skeleton" style="width:100%;height:400px;border-radius:8px;margin:16px 0;overflow:hidden;">
                            <img id="post-thumbnail" src="" alt="" style="display:none;width:100%; max-height:400px; object-fit:cover; border-radius: 8px;">
                        </div>

                        <p id="post-meta-line" style="display:none;">
                            <strong>By <span id="post-author"></span> | <span id="post-date"></span></strong>
                        </p>
                        <p id="post-meta-skeleton">
                            <span class="text-skeleton skeleton" style="width:180px;height:16px;display:inline-block;"></span>
                        </p>

                        <div id="post-content">
                            <div class="text-skeleton skeleton" style="width:100%;height:20px;margin-bottom:10px;"></div>
                            <div class="text-skeleton skeleton" style="width:95%;height:20px;margin-bottom:10px;"></div>
                            <div class="text-skeleton skeleton" style="width:90%;height:20px;margin-bottom:10px;"></div>
                            <div class="text-skeleton skeleton" style="width:97%;height:20px;margin-bottom:10px;"></div>
                            <div class="text-skeleton skeleton" style="width:60%;height:20px;"></div>
                        </div>

                        <div class="source" id="post-source-line" style="display:none;">Source: <span id="post-source"></span></div>
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
                <h3>Related Posts</h3>
                <ul id="related-list"><li class="loading">Loading related posts...</li></ul>
            </div>
        </aside>
            `;

    const targetContainer = document.querySelector('.main-content');
    targetContainer.innerHTML = blogTemplate;

    if (!slug) {
        document.getElementById("post-title").textContent = "No post selected.";
        return;
    }

    try {
        // Step 1: Fetch post
        const res = await fetch(`${API_BASE}/posts/${slug}`);
        if (!res.ok) throw new Error("Post not found");
        const post = await res.json();

        let desc = post.excerpt || '';
        if (!desc) {
            desc = post.content.replace(/<[^>]*>/g, '').substring(0, 160).trim() + '...';
        }

        // Step 2: Render the post
        document.title = post.title;
        document.getElementById("post-title").textContent = post.title;

        // Meta line (By / date): swap skeleton for real content
        document.getElementById("post-author").textContent = post.author || "Unknown";
        document.getElementById("post-date").textContent = post.schedule
            ? new Date(post.schedule).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
            : "N/A";
        document.getElementById("post-meta-skeleton").style.display = "none";
        document.getElementById("post-meta-line").style.display = "block";

        // Thumbnail: swap skeleton wrapper for the real image
        const thumbWrapper = document.getElementById("post-thumbnail-wrapper");
        const thumbImg = document.getElementById("post-thumbnail");
        if (post.thumbnail) {
            thumbImg.src = post.thumbnail;
            thumbImg.onload = () => {
                thumbWrapper.classList.remove('skeleton', 'image-skeleton');
                thumbWrapper.style.background = 'none';
                thumbImg.style.display = 'block';
            };
        } else {
            thumbWrapper.classList.remove('skeleton', 'image-skeleton');
            thumbWrapper.style.background = 'none';
            thumbWrapper.style.height = 'auto';
        }

        document.getElementById("post-content").innerHTML = post.content;

        if (document.querySelector('meta[property="og:title"]')) {
            document.querySelector('meta[property="og:title"]').setAttribute('content', post.title);
        }
        document.querySelector('meta[name="description"]').setAttribute('content', desc);
        document.querySelector('meta[property="og:description"]').setAttribute('content', desc);
        document.querySelector('meta[property="og:image"]').setAttribute('content', post.thumbnail || '');
        document.querySelector('meta[property="og:url"]').setAttribute('content', window.location.href);
        document.querySelector('meta[name="twitter:card"]').setAttribute('content', 'summary_large_image');

        let twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (!twitterTitle) {
            const meta = document.createElement('meta');
            meta.name = 'twitter:title';
            meta.content = post.title;
            document.head.appendChild(meta);
        } else {
            twitterTitle.setAttribute('content', post.title);
        }
        let twitterDesc = document.querySelector('meta[name="twitter:description"]');
        if (!twitterDesc) {
            const meta = document.createElement('meta');
            meta.name = 'twitter:description';
            meta.content = desc;
            document.head.appendChild(meta);
        } else {
            twitterDesc.setAttribute('content', desc);
        }
        let twitterImg = document.querySelector('meta[name="twitter:image"]');
        if (!twitterImg) {
            const meta = document.createElement('meta');
            meta.name = 'twitter:image';
            meta.content = post.thumbnail || '';
            document.head.appendChild(meta);
        } else {
            twitterImg.setAttribute('content', post.thumbnail || '');
        }

        // Source line: swap skeleton for real content
        const sourceEl = document.getElementById("post-source");
        if (post.source && post.source.startsWith('http')) {
            sourceEl.innerHTML = `<a href="${post.source}" target="_blank">${post.source}</a>`;
        } else if (post.source) {
            sourceEl.textContent = post.source;
        } else {
            sourceEl.textContent = "N/A";
        }
        document.getElementById("post-source-line").style.display = "block";

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

        // Step 4: Increment views in background (fire and forget)
        fetch(`${API_BASE}/posts/${slug}/view`, { method: 'POST' })
            .catch(err => console.warn("Failed to update views:", err));

        // Step 5: Setup interactive features
        setupShareFeatures();
        setupCommentSystem();

    } catch (error) {
        console.error("Error loading post:", error);
        document.getElementById("post-title").textContent = "Failed to load post";
        document.getElementById("post-content").innerHTML = "<p>Unable to retrieve post content.</p>";
        document.getElementById("post-thumbnail-wrapper").classList.remove('skeleton', 'image-skeleton');
        document.getElementById("post-meta-skeleton").style.display = "none";
    }

    // Step 6: Fetch + render related posts
    const relatedList = document.getElementById("related-list");
    try {
        const relatedRes = await fetch(`${API_BASE}/posts/${slug}/related`);
        if (!relatedRes.ok) throw new Error(`API: ${relatedRes.status}`);
        const relatedPosts = await relatedRes.json();

        if (relatedList) {
            relatedList.innerHTML = relatedPosts.length > 0
                ? relatedPosts.map(p => `
                    <li><a href="/posts/view-post.html?slug=${encodeURIComponent(p.slug)}">${p.title}</a></li>
                `).join('')
                : "<li>No related posts found.</li>";
        }
    } catch (err) {
        if (relatedList) {
            relatedList.innerHTML = "<li>Unable to load related posts.</li>";
        }
    }

    function setupShareFeatures() {
      //  console.log("Share features will be initialized by post-share-icons.js");
    }

    function setupCommentSystem() {
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
            content = `<a href="${ad.link || '#'}" target="_blank"><img src="${ad.file}" alt="Ad Image" loading="lazy"></a>`;
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