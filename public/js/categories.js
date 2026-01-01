// Category posts
document.addEventListener("DOMContentLoaded", async () => {
    const categorySections = document.querySelectorAll(".category-section");

    try {
        const res = await fetch('https://wrytix.onrender.com/posts');
        const allData = await res.json();

        // Get categories data
        const categories = allData.categories || {};

        categorySections.forEach(section => {
            const categoryId = section.id;
            const posts = categories[categoryId] || [];

            if (posts.length === 0) {
                section.innerHTML = `<p>No posts found for ${categoryId}.</p>`;
                return;
            }

            const postsHTML = posts.map(post => `
                <div class="post-preview">
                    <img src="${post.thumbnail}" alt="${post.title}">
                    <div>
                        <h3><a href="${post.link}">${post.title}</a></h3>
                        <p>${post.description}</p>
                        <span class="post-date">${post.date}</span>
                    </div>
                </div>
            `).join("");

            section.innerHTML = postsHTML;

        });

    } catch (error) {
        console.error("Error loading category posts:", error);

        // Remove skeletons
        document.querySelectorAll('.skeleton').forEach(el => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        });

        // Show error message
        categorySections.forEach(section => {
            section.innerHTML = `
                <div style="padding: 20px; background: #ffebee; color: #d32f2f; text-align: center; margin: 20px; border-radius: 8px;">
                    <p>Failed to load posts. <button onclick="location.reload()" style="background: #d32f2f; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Retry</button></p>
                </div>
            `;
        });
    }
});