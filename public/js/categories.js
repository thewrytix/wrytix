document.addEventListener("DOMContentLoaded", () => {

    /* =================== CATEGORY SECTIONS =================== */
    const categorySections = document.querySelectorAll(".category-section");

    categorySections.forEach(section => {
        for (let i = 0; i < 4; i++) { // 3 skeleton posts per category
            const postSkeleton = document.createElement("div");
            postSkeleton.className = "post-preview skeleton";
            postSkeleton.innerHTML = `
                <div class="image-skeleton skeleton"></div>
                <div class="text-skeleton skeleton"></div>
            `;
            section.appendChild(postSkeleton);
        }
    });



    /* =================== FETCH API DATA =================== */
    async function loadContent() {
        try {
            // Single fetch for all data (no redundancy)
            const response = await fetch('https://wrytix.onrender.com/posts');
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const allData = await response.json(); // Expect: {featured: {large: {}, small: []}, categories: {...}, sidebar: {...}}


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
