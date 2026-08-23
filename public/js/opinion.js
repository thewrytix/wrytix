// js/lifestyle.js
// API_BASE is defined globally in config.js – must be loaded before this script.

document.addEventListener("DOMContentLoaded", () => {
    const CATEGORY = "opinion";

    const newsContainer = document.getElementById("latest-opinion");
    const paginationContainer = document.getElementById("pagination-controls");

    let currentPage = 1;
    let totalPages = 1;

    async function fetchCategoryPage(page) {
        try {
            newsContainer.innerHTML = `<p>Loading...</p>`;

            const res = await fetch(`${API_BASE}/posts/category/${CATEGORY}?page=${page}`);
            if (!res.ok) throw new Error(`API: ${res.status}`);
            const { posts, totalPages: pages } = await res.json();

            totalPages = pages;
            currentPage = page;

            renderPosts(posts);
            renderPagination();
        } catch (error) {
            console.error("Failed to fetch lifestyle posts:", error);
            newsContainer.innerHTML = `<p>Something went wrong loading the news.</p>`;
        }
    }

    function renderPosts(posts) {
        newsContainer.innerHTML = "";

        if (posts.length === 0) {
            newsContainer.innerHTML = `<p>No news posts found.</p>`;
            return;
        }

        posts.forEach(post => {
            const postElement = document.createElement("article");
            postElement.classList.add("post-preview");

            postElement.innerHTML = `
                <div>
                    <h3><a href="../posts/view-post.html?slug=${post.slug}">${post.title}</a></h3>
                    <p>${post.excerpt || ""}</p>
                </div>
                <img src="${window.optimizeThumbnail(post.thumbnail, 300)}" alt="${post.title}" loading="lazy">
            `;

            newsContainer.appendChild(postElement);
        });
    }

    function renderPagination() {
        paginationContainer.innerHTML = "";
        if (totalPages <= 1) return;

        const prevBtn = document.createElement("button");
        prevBtn.textContent = "Previous";
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => fetchCategoryPage(currentPage - 1);
        paginationContainer.appendChild(prevBtn);

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement("button");
            pageBtn.textContent = i;
            pageBtn.classList.toggle("active-page", i === currentPage);
            pageBtn.onclick = () => fetchCategoryPage(i);
            paginationContainer.appendChild(pageBtn);
        }

        const nextBtn = document.createElement("button");
        nextBtn.textContent = "Next";
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => fetchCategoryPage(currentPage + 1);
        paginationContainer.appendChild(nextBtn);
    }

    fetchCategoryPage(1);

    window.loadSidebarAds({
        sliderId: 'mediaTrack',
        wrapperId: 'rotContainer',
        defaultCategory: 'opinion'
    });
});

