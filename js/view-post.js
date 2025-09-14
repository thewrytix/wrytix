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






document.addEventListener("DOMContentLoaded", async () => {
    const slug = new URLSearchParams(location.search).get("slug");
    const container = document.getElementById("post-container");
    // <div id="post-container"></div> should exist in your HTML as mount point

    if (!slug) {
        container.innerHTML = "<p>No post selected.</p>";
        return;
    }

    // --- Create article template ---
    container.innerHTML = `
    <article data-category="">
      <nav class="breadcrumbs" id="breadcrumbs"></nav>
      <h1 id="post-title" class="skeleton"></h1>
      <img id="post-thumbnail" class="skeleton" alt=""
           style="width:100%; max-height:400px; object-fit:cover; margin:16px 0; border-radius:8px;">
      <p class="skeleton post-meta-skeleton">
        <span class="meta-pill"></span>
        <span class="meta-pill"></span>
      </p>
      <div id="post-content">
        ${Array(5).fill(`<div class="skeleton-line skeleton"></div>`).join("")}
      </div>
      <div class="source">Source: <span id="post-source"> </span></div>
    </article>
  `;

    // --- Fetch + populate post ---
    try {
        const res = await fetch(`https://wrytix.onrender.com/posts/${slug}`);
        if (!res.ok) throw new Error("Post not found");
        const post = await res.json();

        // Title
        const titleEl = document.getElementById("post-title");
        titleEl.textContent = post.title || "";
        titleEl.classList.remove("skeleton");

        // Thumbnail
        const thumb = document.getElementById("post-thumbnail");
        if (post.thumbnail) {
            thumb.src = post.thumbnail;
            thumb.onload = thumb.onerror = () => thumb.classList.remove("skeleton");
        } else {
            thumb.classList.remove("skeleton");
        }

        // Meta
        const meta = titleEl.nextElementSibling.nextElementSibling; // the <p>
        meta.className = "";
        meta.innerHTML = `<strong>By <span id="post-author">${post.author || "Unknown"}</span> | 
      <span id="post-date">${post.schedule ? new Date(post.schedule).toLocaleDateString("en-US", {
            year: "numeric", month: "long", day: "numeric"
        }) : "N/A"}</span></strong>`;

        // Content
        const contentEl = document.getElementById("post-content");
        contentEl.innerHTML = post.content || "<p>No content</p>";

        // Source
        const sourceEl = document.getElementById("post-source");
        if (post.source && post.source.startsWith("http")) {
            sourceEl.innerHTML = `<a href="${post.source}" target="_blank">${post.source}</a>`;
        } else {
            sourceEl.textContent = post.source || "N/A";
        }

        // Breadcrumbs
        const crumbs = document.getElementById("breadcrumbs");
        if (crumbs) {
            const category = post.category || "Uncategorized";
            document.querySelector("article").setAttribute("data-category", category);
            crumbs.innerHTML = `
        <a href="../index.html">Home</a>
        <span>›</span>
        <a href="../html/${category.toLowerCase()}.html">${category}</a>
        <span>›</span>
        <span>${post.title}</span>`;
        }

        // Increment views in background
        fetch(`https://wrytix.onrender.com/posts/${slug}/view`, { method: "POST" })
            .catch(err => console.warn("Failed to update views:", err));

    } catch (err) {
        console.error("Error loading post:", err);
        container.innerHTML = "<p>Failed to load post.</p>";
    }
});
