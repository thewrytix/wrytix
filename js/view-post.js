document.addEventListener("DOMContentLoaded", () => {
    const slug = new URLSearchParams(location.search).get("slug");
    if (!slug) return;

    const titleEl = document.getElementById("post-title");
    const thumbnailEl = document.getElementById("post-thumbnail");
    const contentEl = document.getElementById("post-content");
    const metaEl = document.querySelector("#post-author")?.closest("p");

    // --- skeleton placeholders ---
    const showSkeletons = () => {
        titleEl?.classList.add("skeleton");
        thumbnailEl?.classList.add("skeleton");
        if (thumbnailEl) thumbnailEl.removeAttribute("src");

        if (metaEl) {
            metaEl.className = "skeleton post-meta-skeleton";
            metaEl.innerHTML = `<span class="meta-pill"></span><span class="meta-pill"></span>`;
        }

        if (contentEl) {
            contentEl.innerHTML = Array(5).fill(`<div class="skeleton-line skeleton"></div>`).join("");
        }
    };

    // --- fetch + render post ---
    const loadPost = async () => {
        try {
            const res = await fetch(`https://wrytix.onrender.com/posts/${slug}`);
            if (!res.ok) throw new Error(res.status);
            const post = await res.json();

            if (titleEl) {
                titleEl.textContent = post.title || "";
                titleEl.classList.remove("skeleton");
            }

            if (thumbnailEl) {
                thumbnailEl.src = post.thumbnail || "";
                thumbnailEl.onload = thumbnailEl.onerror = () => thumbnailEl.classList.remove("skeleton");
            }

            if (metaEl) {
                metaEl.className = "";
                metaEl.innerHTML = `<strong>By <span id="post-author">${post.author || "Unknown"}</span> | <span id="post-date">${post.date ? new Date(post.date).toLocaleDateString() : "N/A"}</span></strong>`;
            }

            if (contentEl) contentEl.innerHTML = post.content || "<p>No content</p>";

        } catch (e) {
            console.error("Post load failed:", e);
            document.querySelectorAll(".skeleton").forEach(el => el.classList.remove("skeleton"));
        }
    };

    showSkeletons();
    loadPost();
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