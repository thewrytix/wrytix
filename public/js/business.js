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
                     <h3><a href="../posts/view-post.html?slug=${post.slug}">${post.title}</a></h3>
                    <!--<small class="post-date">${date}</small>-->
                    <p>${post.content.slice(0, 100)}...</p>
                
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


//Live market Data
(function () {
    const app = {
        refreshInterval: 30000, // 30s for livelier feel (was 60s)
        cacheKey: 'wrytix-market-data',
        cacheTTL: 300000, // 5min
        prevPrices: JSON.parse(localStorage.getItem('wrytix-prev-prices') || '{}'), // Persist across sessions

        init() {
            this.loadData(true); // true = from cache if available
            this.interval = setInterval(() => this.loadData(false), this.refreshInterval);
        },

        async loadData(useCache = false) {
            let data;
            if (useCache) {
                data = this.getCachedData();
                if (data) {
                    this.renderAll(data);
                    return; // Instant render from cache
                }
            }

            try {
                const res = await this.fetchWithRetry('https://wrytix.onrender.com/api/market-data');
                data = await res.json();
                this.cacheData(data); // Cache fresh data
                this.renderAll(data);
            } catch (err) {
                console.error('Market data fetch failed:', err);
                // Fallback: Use cache if available
                data = this.getCachedData();
                if (data) {
                    this.renderAll(data); // Render stale data
                    document.getElementById('market-updated').textContent = ' (Using cached data)';
                } else {
                    this.showError('Market data unavailable. Retrying...');
                }
            }
        },

        async fetchWithRetry(url, retries = 3, backoff = 1000) {
            for (let i = 0; i < retries; i++) {
                try {
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res;
                } catch (err) {
                    if (i === retries - 1) throw err;
                    await new Promise(resolve => setTimeout(resolve, backoff * Math.pow(2, i))); // Exponential backoff
                }
            }
        },

        getCachedData() {
            const cached = localStorage.getItem(this.cacheKey);
            if (!cached) return null;
            const { data, timestamp } = JSON.parse(cached);
            return Date.now() - timestamp < this.cacheTTL ? data : null;
        },

        cacheData(data) {
            localStorage.setItem(this.cacheKey, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
            // Update prevPrices cache
            localStorage.setItem('wrytix-prev-prices', JSON.stringify(this.prevPrices));
        },

        renderAll(data) {
            if (data.stocks) this.paginateAndRender(data.stocks, 'stock-data', 'stock-dots');
            if (data.forex?.rates) this.updateForex(data.forex);
            if (data.crypto) this.updateCrypto(data.crypto);
            if (data.gse) this.paginateAndRender(data.gse, 'gse-data', 'gse-dots');
            this.updateTimestamp(new Date(data.lastUpdated || Date.now()));
        },

        updateTimestamp(date) {
            const el = document.getElementById('market-updated');
            if (el) el.textContent = `Last updated: ${date.toLocaleTimeString()}`;
        },

        paginateAndRender(data, containerId, dotsId) {
            const container = document.getElementById(containerId);
            const dots = document.getElementById(dotsId);
            if (!container || !dots) return;

            const perPage = 5;
            const pages = Math.ceil(data.length / perPage);

            // Use DocumentFragment for efficient batch DOM updates (no flicker)
            const renderPage = (pageIdx) => {
                const fragment = document.createDocumentFragment();
                const items = data.slice(pageIdx * perPage, (pageIdx + 1) * perPage);

                items.forEach(item => {
                    const prev = this.prevPrices[item.symbol];
                    let changeClass = '';
                    let changeIcon = '';
                    if (item.price && typeof item.price === 'number' && prev !== undefined && prev !== item.price) {
                        changeClass = item.price > prev ? 'up' : 'down';
                        changeIcon = item.price > prev ? '↗' : '↘';
                    }
                    this.prevPrices[item.symbol] = item.price;

                    const div = document.createElement('div');
                    div.className = `market-item ${changeClass}`;
                    div.innerHTML = `
            <span class="symbol">${item.symbol}</span>
            <span class="price" aria-label="${changeClass ? 'Price changed' : 'Price stable'}">
              ${item.price ? `$${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}${changeIcon}` : '--'}
            </span>
          `;
                    fragment.appendChild(div);
                });

                container.innerHTML = ''; // Clear once
                container.appendChild(fragment); // Batch insert

                // Dots with ARIA
                dots.innerHTML = Array.from({ length: pages }, (_, idx) =>
                    `<span class="dot ${idx === pageIdx ? 'active' : ''}" role="button" tabindex="0" aria-label="Page ${idx + 1} of ${pages}" data-page="${idx}"></span>`
                ).join('');

                dots.querySelectorAll('.dot').forEach((dot, idx) => {
                    dot.onclick = () => renderPage(idx);
                    dot.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') renderPage(idx); }; // Keyboard nav
                });
            };

            if (pages > 0) renderPage(0);
        },

        updateCrypto(crypto) {
            const list = Object.entries(crypto).map(([key, val]) => ({
                symbol: key.toUpperCase().replace(/[^A-Z]/g, ''),
                price: val.usd
            }));
            this.paginateAndRender(list, 'crypto-data', 'crypto-dots');
        },

        updateForex(forex) {
            const list = Object.entries(forex.rates).map(([symbol, rate]) => {
                const formatted = symbol === 'EUR' || symbol === 'GBP'
                    ? { symbol: `USD/${symbol}`, price: parseFloat((1 / rate).toFixed(4)) }
                    : { symbol: `USD/${symbol}`, price: parseFloat(rate.toFixed(4)) };
                return formatted;
            });
            this.paginateAndRender(list, 'forex-data', 'forex-dots');
        },

        showError(msg) {
            // Inject error into containers if needed
            ['stock-data', 'forex-data', 'crypto-data', 'gse-data'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = `<div class="error-msg">${msg}</div>`;
            });
        }
    };

    // Init on DOM ready (no setTimeout delay)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => app.init());
    } else {
        app.init();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        localStorage.setItem('wrytix-prev-prices', JSON.stringify(app.prevPrices));
        clearInterval(app.interval);
    });
})();