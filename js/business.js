document.addEventListener("DOMContentLoaded", () => {
    const newsContainer = document.getElementById("latest-business");
    const paginationContainer = document.getElementById("pagination-controls");

    let currentPage = 1;
    const postsPerPage = 10;
    let allNewsPosts = [];

    async function fetchNewsPosts() {
        try {
            const response = await fetch('https://wrytix.onrender.com/posts');
            const data = await response.json();

            allNewsPosts = data
                .filter(post => post.category.toLowerCase() === "business")
                .sort((a, b) => new Date(b.schedule) - new Date(a.schedule));

            renderPage(currentPage);
            renderPagination();
        } catch (error) {
            console.error("Failed to fetch business posts:", error);
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
                    <h3>${post.title}</h3>
                    <small class="post-date">${date}</small>
                    <p>${post.content.slice(0, 100)}...</p>
                    <a href="../posts/view-post.html?slug=${post.slug}">Read More</a>
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
    const articleCategory = document.querySelector("article")?.dataset.category || "business";
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

        renderAdSlides(filtered);
    } catch (err) {
        document.getElementById("adSlider").innerHTML = "<p>⚠️ Failed to load ads.</p>";
        console.error(err);
    }
}

function renderAdSlides(ads) {
    const slider = document.getElementById("adSlider");
    slider.innerHTML = '';

    if (ads.length === 0) {
        slider.innerHTML = '<p>No ads to display.</p>';
        return;
    }

    ads.forEach(ad => {
        const slide = document.createElement("div");
        slide.className = "ad-slide";

        let content = '';
        if (ad.type === "image" && ad.file) {
            content = `<a href="${ad.link || '#'}" target="_blank"><img src="${ad.file}" alt="Ad Image"></a>`;
        } else if (ad.type === "video" && ad.file) {
            content = `<video src="${ad.file}" controls></video>`;
        } else if (ad.type === "html" && ad.html) {
            content = `<div class="html-ad">${ad.html}</div>`;
        } else if (ad.type === "text" && ad.text) {
            content = `<div class="text-ad">${ad.text}</div>`;
        }

        slide.innerHTML = content;
        slider.appendChild(slide);
    });

    if (ads.length > 1) enableVerticalSlider(slider, ads.length);
}

function enableVerticalSlider(slider, count) {
    let index = 0;
    let paused = false;

    const wrapper = document.getElementById("adSliderWrapper");

    wrapper.addEventListener("mouseenter", () => paused = true);
    wrapper.addEventListener("mouseleave", () => paused = false);

    setInterval(() => {
        if (paused) return;
        index = (index + 1) % count;
        slider.style.transform = `translateY(-${index * 600}px)`;
    }, 4000);
}

loadSidebarAds();


//Live Market Data
(function () {
    const app = {
        refreshInterval: 60000,
        prevPrices: {},

        init() {
            this.fetchMarketData();
            this.interval = setInterval(() => this.fetchMarketData(), this.refreshInterval);
        },

        async fetchMarketData() {
            try {
                const res = await fetch('https://wrytix.onrender.com/api/market-data');
                const data = await res.json();

                if (data.stocks) this.paginateAndRender(data.stocks, 'stock-data', 'stock-dots');
                if (data.forex?.rates) this.updateForex(data.forex);
                if (data.crypto) this.updateCrypto(data.crypto);
                if (data.gse) this.paginateAndRender(data.gse, 'gse-data', 'gse-dots');


                this.updateTimestamp(new Date(data.lastUpdated));
            } catch (err) {
                console.error("Error fetching market data:", err);
            }
        },

        updateTimestamp(date) {
            document.getElementById('market-updated').textContent =
                `Last updated: ${date.toLocaleTimeString()}`;
        },

        paginateAndRender(data, containerId, dotsId) {
            const container = document.getElementById(containerId);
            const dots = document.getElementById(dotsId);
            const perPage = 5;
            const pages = Math.ceil(data.length / perPage);

            const renderPage = (i) => {
                const items = data.slice(i * perPage, i * perPage + perPage);
                container.innerHTML = items.map(item => {
                    const prev = this.prevPrices[item.symbol];
                    let changeClass = '';
                    if (item.price && typeof item.price === 'number' && prev !== undefined) {
                        changeClass = item.price > prev ? 'up' : item.price < prev ? 'down' : '';
                    }
                    this.prevPrices[item.symbol] = item.price;
                    return `
              <div class="market-item">
                <span class="symbol">${item.symbol}</span>
                <span class="price ${changeClass}">
                  ${item.price ? `$${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '--'}
                </span>
              </div>`;
                }).join('');

                dots.innerHTML = Array.from({ length: pages }, (_, idx) =>
                    `<span class="dot ${idx === i ? 'active' : ''}"></span>`
                ).join('');

                dots.querySelectorAll('.dot').forEach((dot, idx) => dot.onclick = () => renderPage(idx));
            };

            renderPage(0);
        },

        updateForex(forex) {
            const list = Object.entries(forex.rates).map(([symbol, rate]) => {
                const formatted = symbol === 'EUR' || symbol === 'GBP'
                    ? { symbol: `USD/${symbol}`, price: (1 / rate).toFixed(4) }
                    : { symbol: `USD/${symbol}`, price: rate.toFixed(4) };
                return formatted;
            });
            this.paginateAndRender(list, 'forex-data', 'forex-dots');
        },

        updateCrypto(crypto) {
            const list = Object.entries(crypto).map(([key, val]) => ({
                symbol: key.toUpperCase().replace(/[^A-Z]/g, ''),
                price: val.usd
            }));
            this.paginateAndRender(list, 'crypto-data', 'crypto-dots');
        }
    };

    setTimeout(() => app.init(), 500);
})();