// js/technology.js
// API_BASE is defined globally in config.js – must be loaded before this script.

document.addEventListener("DOMContentLoaded", () => {
    const CATEGORY = "technology";

    const newsContainer = document.getElementById("latest-technology");
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
            console.error("Failed to fetch technology posts:", error);
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
});

// Ads Show — now uses API_BASE
async function loadSidebarAds() {
    const articleCategory = document.querySelector("article")?.dataset.category || "technology";
    const cacheKey = `wrytix-ads-${articleCategory}`;
    const cacheTTL = 300000;

    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try {
            const { ads, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < cacheTTL) {
                renderAdSlides(ads);
                return;
            }
        } catch (err) {
            localStorage.removeItem(cacheKey);
        }
    }

    try {
        const res = await fetch(`${API_BASE}/ads`);
        const ads = await res.json();
        const now = new Date();
        const filtered = ads.filter(ad =>
            ad.category === articleCategory &&
            ad.active &&
            new Date(ad.startDate) <= now &&
            new Date(ad.endDate) >= now
        );

        localStorage.setItem(cacheKey, JSON.stringify({ ads: filtered, timestamp: Date.now() }));
        renderAdSlides(filtered);
    } catch (err) {
        document.getElementById("mediaTrack").innerHTML = "<p>⚠️ Failed to load media.</p>";
        console.error(err);
    }
}

function renderAdSlides(ads) {
    const slider = document.getElementById("mediaTrack");
    slider.innerHTML = '';
    if (ads.length === 0) {
        slider.innerHTML = '<p>No media to display.</p>';
        return;
    }
    ads.forEach(ad => {
        const slide = document.createElement("div");
        slide.className = "media-item";
        let content = '';
        if (ad.type === "image" && ad.file) {
            content = `<a href="${ad.link || '#'}" target="_blank"><img src="${ad.file}" alt="Media Image" loading="lazy"></a>`;
        } else if (ad.type === "video" && ad.file) {
            content = `<video src="${ad.file}" controls></video>`;
        } else if (ad.type === "html" && ad.html) {
            content = `<div class="custom-content">${ad.html}</div>`;
        } else if (ad.type === "text" && ad.text) {
            content = `<div class="promo-text">${ad.text}</div>`;
        }
        slide.innerHTML = content;
        slider.appendChild(slide);
    });
    if (ads.length > 1) enableVerticalSlider(slider, ads.length);
}

function enableVerticalSlider(slider, count) {
    let index = 0;
    let paused = false;
    const wrapper = document.getElementById("rotContainer");
    wrapper.addEventListener("mouseenter", () => paused = true);
    wrapper.addEventListener("mouseleave", () => paused = false);
    setInterval(() => {
        if (paused) return;
        index = (index + 1) % count;
        slider.style.transform = `translateY(-${index * 600}px)`;
    }, 4000);
}

loadSidebarAds();