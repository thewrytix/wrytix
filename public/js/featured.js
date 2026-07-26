// Featured posts
document.addEventListener("DOMContentLoaded", async () => {
    const featuredSection = document.querySelector(".featured-section");

    try {
        const posts = await window.WrytixPosts.getPosts();

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
                    <h3><a href="posts/view-post.html?slug=${largePost.slug}">${largePost.title}</a></h3>
                    <p>${truncateText(largePost.excerpt, 20)}</p>
                </div>
            </div>
        `;

        // Remaining featured posts in grid
        const gridPosts = featuredPosts.slice(1, 7).map(post => `
            <div class="small-post">
                <img src="${post.thumbnail}" alt="${post.title}">
                <div>
                    <h4><a href="posts/view-post.html?slug=${post.slug}">${post.title}</a></h4>
                    <p>${truncateText(post.excerpt, 10)}</p>
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
        if (!text) return "";
        return text.split(" ").slice(0, wordLimit).join(" ") + "...";
    }
});