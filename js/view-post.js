document.addEventListener("DOMContentLoaded", () => {
    const titleEl = document.getElementById("post-title");
    const thumbnailEl = document.getElementById("post-thumbnail");
    const authorSpan = document.getElementById("post-author");
    const dateSpan = document.getElementById("post-date");
    const contentEl = document.getElementById("post-content");
    // the <p><strong>By ...</strong></p> parent
    const metaParagraph = authorSpan ? authorSpan.closest("p") : null;

    // 1) SHOW skeleton placeholders immediately
    function showSkeletons() {
        if (titleEl) titleEl.classList.add("skeleton");
        if (thumbnailEl) {
            // ensure no src is set yet (so browser doesn't try to load)
            // keep src blank or placeholder if you prefer:
            thumbnailEl.removeAttribute("src");
            thumbnailEl.classList.add("skeleton");
        }
        if (metaParagraph) {
            // replace meta content with skeleton structure (but keep original spans for later)
            // add a helper class to style the skeleton pieces
            metaParagraph.classList.add("post-meta-skeleton", "skeleton");
            // create two small skeleton pills (we won't remove the paragraph element)
            metaParagraph.innerHTML = `
        <span class="meta-pill"></span>
        <span class="meta-pill"></span>
      `;
        }

        // content skeleton lines (insert into #post-content)
        if (contentEl) {
            contentEl.innerHTML = ""; // ensure empty while loading
            for (let i = 0; i < 5; i++) {
                const line = document.createElement("div");
                line.className = "skeleton-line skeleton";
                contentEl.appendChild(line);
            }
        }
    }

    // 2) REMOVE skeletons and populate real data
    async function loadPostAndShow(slug) {
        try {
            const res = await fetch(`https://wrytix.onrender.com/posts/${slug}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const post = await res.json();

            // populate title and make it visible
            if (titleEl) {
                titleEl.textContent = post.title || "";
                titleEl.classList.remove("skeleton");
            }

            // set thumbnail src first, wait for load, then remove its skeleton
            if (thumbnailEl) {
                if (post.thumbnail) {
                    // add handlers before setting src to ensure we catch load/error
                    const cleanUpThumb = () => {
                        thumbnailEl.classList.remove("skeleton");
                        thumbnailEl.removeEventListener("load", cleanUpThumb);
                        thumbnailEl.removeEventListener("error", handleThumbError);
                    };
                    const handleThumbError = () => {
                        // Use a fallback image URL if you have one, otherwise remove skeleton anyway
                        thumbnailEl.classList.remove("skeleton");
                        thumbnailEl.removeEventListener("load", cleanUpThumb);
                        thumbnailEl.removeEventListener("error", handleThumbError);
                        // optionally: thumbnailEl.src = '/images/default-thumb.jpg';
                    };

                    thumbnailEl.addEventListener("load", cleanUpThumb);
                    thumbnailEl.addEventListener("error", handleThumbError);

                    // set the src which triggers load event
                    thumbnailEl.src = post.thumbnail;
                } else {
                    // no thumbnail provided
                    thumbnailEl.classList.remove("skeleton");
                    thumbnailEl.src = ""; // or a placeholder
                }
            }

            // populate author and date AFTER thumbnail skeleton has been created (order)
            if (metaParagraph) {
                // restore metaParagraph markup to original structure
                metaParagraph.classList.remove("skeleton", "post-meta-skeleton");
                metaParagraph.innerHTML = `<strong>By <span id="post-author">${post.author || "Unknown"}</span> | <span id="post-date">${post.date ? new Date(post.date).toLocaleDateString() : "N/A"}</span></strong>`;
            } else {
                // fallback if paragraph not found: set spans if they exist
                if (authorSpan) authorSpan.textContent = post.author || "Unknown";
                if (dateSpan) dateSpan.textContent = post.date ? new Date(post.date).toLocaleDateString() : "N/A";
            }

            // replace content (this overwrites skeleton lines)
            if (contentEl) {
                contentEl.innerHTML = post.content || "<p>No content</p>";
            }

            // remove any remaining skeleton classes just in case
            document.querySelectorAll(".skeleton").forEach(el => el.classList.remove("skeleton"));

        } catch (err) {
            console.error("Error loading post:", err);
            // keep skeleton removed so user can see error or show an error message
            document.querySelectorAll(".skeleton").forEach(el => el.classList.remove("skeleton"));
            // optionally show an error UI here
        }
    }

    // run
    const slug = new URLSearchParams(window.location.search).get("slug");
    if (slug) {
        showSkeletons();
        loadPostAndShow(slug);
    } else {
        // If no slug, remove any skeletons so UI doesn't stay grey
        setTimeout(() => document.querySelectorAll(".skeleton").forEach(el => el.classList.remove("skeleton")), 1000);
    }
});





document.addEventListener("DOMContentLoaded", async function () {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");

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
                if (relatedPosts.length === 0) {
                    relatedList.innerHTML = "<li>No related posts found.</li>";
                } else {
                    relatedList.innerHTML = relatedPosts.map(p => `
                            <li><a href="/posts/view-post.html?slug=${encodeURIComponent(p.slug)}">${p.title}</a></li>
                        `).join('');
                }
            } catch (err) {
                console.error("Failed to load related posts:", err);
            }
        }, 0);

        // Step 5: Increment views in background
        fetch(`https://wrytix.onrender.com/posts/${slug}/view`, { method: 'POST' })
            .catch(err => console.warn("Failed to update views:", err));

    } catch (error) {
        console.error("Error loading post:", error);
        document.getElementById("post-title").textContent = "Failed to load post";
        document.getElementById("post-content").innerHTML = "<p>Unable to retrieve post content.</p>";
    }
});