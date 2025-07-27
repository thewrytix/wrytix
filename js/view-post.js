document.addEventListener("DOMContentLoaded", async function () {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");

    if (!slug) {
        document.getElementById("post-title").textContent = "No post selected.";
        return;
    }

    try {
        // Step 1: Fetch post quickly
        const res = await fetch(`http://localhost:3000/posts/${slug}`);
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
                const allPostsRes = await fetch("http://localhost:3000/posts");
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
        fetch(`http://localhost:3000/posts/${slug}/view`, { method: 'POST' })
            .catch(err => console.warn("Failed to update views:", err));

    } catch (error) {
        console.error("Error loading post:", error);
        document.getElementById("post-title").textContent = "Failed to load post";
        document.getElementById("post-content").innerHTML = "<p>Unable to retrieve post content.</p>";
    }
});