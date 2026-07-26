document.addEventListener("DOMContentLoaded", () => {
    const newsContainer = document.getElementById("latest-foreign");
    const paginationContainer = document.getElementById("pagination-controls");

    let currentPage = 1;
    const postsPerPage = 10;
    let allNewsPosts = [];

    async function fetchNewsPosts() {
        try {
            const data = await window.WrytixPosts.getPosts();

            allNewsPosts = data
                .filter(post => post.category.toLowerCase() === "foreign")
                .sort((a, b) => new Date(b.schedule) - new Date(a.schedule));

            renderPage(currentPage);
            renderPagination();
        } catch (error) {
            console.error("Failed to fetch news posts:", error);
            newsContainer.innerHTML = `<p>Something went wrong loading the news.</p>`;
        }
    }

    function renderPage(page) {
        newsContainer.innerHTML = "";

        const start = (page - 1) * postsPerPage;
        const end = start + postsPerPage;
        const postsToDisplay = allNewsPosts.slice(start, end);

        if (postsToDisplay.length === 0) {
            newsContainer.innerHTML = `<p>No news posts found.</p>`;
            return;
        }

        postsToDisplay.forEach(post => {
            const postElement = document.createElement("article");
            postElement.classList.add("post-preview");

            const date = new Date(post.schedule).toLocaleDateString("en-GB", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });

            postElement.innerHTML = `
                <div>
                    <h3><a href="../posts/view-post.html?slug=${post.slug}">${post.title}</a></h3>
                     <!--<small class="post-date">${date}</small>-->
                   <p>${(post.excerpt || '').slice(0, 120)}...</p>
                   
                </div>
                <img src="${post.thumbnail}" alt="${post.title}">
            `;

            newsContainer.appendChild(postElement);
        });
    }

    function renderPagination() {
        const totalPages = Math.ceil(allNewsPosts.length / postsPerPage);
        paginationContainer.innerHTML = "";

        if (totalPages <= 1) return;

        const prevBtn = document.createElement("button");
        prevBtn.textContent = "Previous";
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => {
            currentPage--;
            renderPage(currentPage);
            renderPagination();
        };
        paginationContainer.appendChild(prevBtn);

        // Numbered page buttons
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement("button");
            pageBtn.textContent = i;
            pageBtn.classList.toggle("active-page", i === currentPage); // Add a class to style the current page
            pageBtn.onclick = () => {
                currentPage = i;
                renderPage(currentPage);
                renderPagination();
            };
            paginationContainer.appendChild(pageBtn);
        }

        const nextBtn = document.createElement("button");
        nextBtn.textContent = "Next";
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => {
            currentPage++;
            renderPage(currentPage);
            renderPagination();
        };
        paginationContainer.appendChild(nextBtn);
    }


    fetchNewsPosts();
});



// Ads Show
async function loadSidebarAds() {
    const articleCategory = document.querySelector("article")?.dataset.category || "foreign";
    const cacheKey = `wrytix-ads-${articleCategory}`;
    const cacheTTL = 300000; // 5 minutes in ms

    // Check cache first
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try {
            const { ads, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < cacheTTL) {
                console.log(`Using cached ads for ${articleCategory}`);
                renderAdSlides(ads);
                return;
            }
        } catch (err) {
            console.warn('Invalid cache, fetching fresh:', err);
            localStorage.removeItem(cacheKey);
        }
    }

    try {
        const res = await fetch("https://wrytix.onrender.com/ads");
        const ads = await res.json();
        const now = new Date();
        const filtered = ads.filter(ad =>
            ad.category === articleCategory &&
            ad.active &&
            new Date(ad.startDate) <= now &&
            new Date(ad.endDate) >= now
        );

        // Cache the filtered ads
        localStorage.setItem(cacheKey, JSON.stringify({
            ads: filtered,
            timestamp: Date.now()
        }));

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
            content = `<a href="${ad.link || '#'}" target="_blank"><img src="${ad.file}" alt="Media Image"></a>`;
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