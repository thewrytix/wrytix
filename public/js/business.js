// js/business.js
// API_BASE is defined globally in config.js – must be loaded before this script.

document.addEventListener("DOMContentLoaded", () => {
    const CATEGORY = "business";

    const newsContainer = document.getElementById("latest-business");
    const paginationContainer = document.getElementById("pagination-controls");

    let currentPage = parseInt(new URLSearchParams(window.location.hash.slice(1)).get('page')) || 1;
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
            window.location.hash = `page=${page}`;
        } catch (error) {
            console.error("Failed to fetch business posts:", error);
            newsContainer.innerHTML = `<p>Something went wrong loading the news.</p>`;
        }
    }

    function renderPosts(posts) {
        if (posts.length === 0) {
            newsContainer.innerHTML = `<p>No business posts found.</p>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        posts.forEach(post => {
            const postElement = document.createElement("article");
            postElement.classList.add("post-preview");
            postElement.innerHTML = `
                <div>
                    <h3><a href="../posts/view-post.html?slug=${post.slug}">${post.title}</a></h3>
                    <p>${post.excerpt || ""}</p>
                </div>
                ${post.thumbnail ? `<img src="${window.optimizeThumbnail(post.thumbnail, 300)}" alt="${post.title}" loading="lazy">` : ''}
            `;
            fragment.appendChild(postElement);
        });

        newsContainer.innerHTML = "";
        newsContainer.appendChild(fragment);
    }

    function renderPagination() {
        paginationContainer.innerHTML = "";
        if (totalPages <= 1) return;

        const prevBtn = document.createElement("button");
        prevBtn.textContent = "Previous";
        prevBtn.disabled = currentPage === 1;
        prevBtn.classList.toggle("disabled", currentPage === 1);
        prevBtn.onclick = () => {
            if (currentPage > 1) fetchCategoryPage(currentPage - 1);
        };
        paginationContainer.appendChild(prevBtn);

        const maxVisible = 7;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement("button");
            pageBtn.textContent = i;
            pageBtn.classList.toggle("active-page", i === currentPage);
            pageBtn.onclick = () => fetchCategoryPage(i);
            paginationContainer.appendChild(pageBtn);

            if (i !== endPage && i < totalPages) {
                const ellipsis = document.createElement("span");
                ellipsis.textContent = "...";
                ellipsis.classList.add("ellipsis");
                paginationContainer.appendChild(ellipsis);
            }
        }

        const nextBtn = document.createElement("button");
        nextBtn.textContent = "Next";
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.classList.toggle("disabled", currentPage === totalPages);
        nextBtn.onclick = () => {
            if (currentPage < totalPages) fetchCategoryPage(currentPage + 1);
        };
        paginationContainer.appendChild(nextBtn);

        paginationContainer.setAttribute("role", "navigation");
        paginationContainer.setAttribute("aria-label", "Business news pagination");
    }

    // Load on init
    fetchCategoryPage(currentPage);

    // Listen for hash changes (back/forward nav)
    window.addEventListener('hashchange', () => {
        const newPage = parseInt(new URLSearchParams(window.location.hash.slice(1)).get('page')) || 1;
        if (newPage !== currentPage && newPage >= 1 && newPage <= totalPages) {
            fetchCategoryPage(newPage);
        }
    });

    window.loadSidebarAds({
        sliderId: 'mediaTrack',
        wrapperId: 'rotContainer',
        defaultCategory: 'business'
    });
});



// Live market Data — now uses API_BASE
(function () {
    const app = {
        refreshInterval: 30000,
        cacheKey: 'wrytix-market-data',
        cacheTTL: 300000,
        prevPrices: JSON.parse(localStorage.getItem('wrytix-prev-prices') || '{}'),

        init() {
            this.loadData(true);
            this.interval = setInterval(() => this.loadData(false), this.refreshInterval);
        },

        async loadData(useCache = false) {
            let data;
            if (useCache) {
                data = this.getCachedData();
                if (data) {
                    this.renderAll(data);
                    return;
                }
            }

            try {
                const res = await this.fetchWithRetry(`${API_BASE}/api/market-data`);
                data = await res.json();
                this.cacheData(data);
                this.renderAll(data);
            } catch (err) {
                console.error('Market data fetch failed:', err);
                data = this.getCachedData();
                if (data) {
                    this.renderAll(data);
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
                    await new Promise(resolve => setTimeout(resolve, backoff * Math.pow(2, i)));
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

                container.innerHTML = '';
                container.appendChild(fragment);

                dots.innerHTML = Array.from({ length: pages }, (_, idx) =>
                    `<span class="dot ${idx === pageIdx ? 'active' : ''}" role="button" tabindex="0" aria-label="Page ${idx + 1} of ${pages}" data-page="${idx}"></span>`
                ).join('');

                dots.querySelectorAll('.dot').forEach((dot, idx) => {
                    dot.onclick = () => renderPage(idx);
                    dot.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') renderPage(idx); };
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
            ['stock-data', 'forex-data', 'crypto-data', 'gse-data'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = `<div class="error-msg">${msg}</div>`;
            });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => app.init());
    } else {
        app.init();
    }

    window.addEventListener('beforeunload', () => {
        localStorage.setItem('wrytix-prev-prices', JSON.stringify(app.prevPrices));
        clearInterval(app.interval);
    });
})();