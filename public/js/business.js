document.addEventListener("DOMContentLoaded", () => {
    const newsContainer = document.getElementById("latest-business");
    const paginationContainer = document.getElementById("pagination-controls");
    const postsPerPage = 10;
    let allNewsPosts = [];
    let currentPage = parseInt(new URLSearchParams(window.location.hash.slice(1)).get('page')) || 1;

    // Cache key for business posts
    const cacheKey = 'wrytix-business-posts';
    const cacheTTL = 300000; // 5min

    async function fetchNewsPosts() {
        // Check cache first
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < cacheTTL) {
                allNewsPosts = data;
                renderPage(currentPage);
                renderPagination();
                return;
            }
        }

        try {
            const url = 'https://wrytix.onrender.com/posts?category=business'; // Optimistic backend filter
            const res = await fetchWithRetry(url);
            const data = await res.json();
            allNewsPosts = data
                .filter(post => post.category?.toLowerCase() === "business") // Fallback client filter
                .sort((a, b) => new Date(b.schedule) - new Date(a.schedule));

            // Cache fresh data
            localStorage.setItem(cacheKey, JSON.stringify({ data: allNewsPosts, timestamp: Date.now() }));

            renderPage(currentPage);
            renderPagination();
        } catch (error) {
            console.error("Failed to fetch business posts:", error);
            // Fallback to cache or error UI
            const cachedData = JSON.parse(localStorage.getItem(cacheKey) || '{}').data || [];
            if (cachedData.length > 0) {
                allNewsPosts = cachedData;
                renderPage(currentPage);
                renderPagination();
            } else {
                newsContainer.innerHTML = `
          <p>Something went wrong loading the news. <button onclick="fetchNewsPosts()" class="retry-btn">Retry</button></p>
        `;
            }
        }
    }

    async function fetchWithRetry(url, retries = 3, backoff = 1000) {
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
    }

    function renderPage(page) {
        newsContainer.innerHTML = ""; // Clear container
        const start = (page - 1) * postsPerPage;
        const end = start + postsPerPage;
        const postsToDisplay = allNewsPosts.slice(start, end);

        if (postsToDisplay.length === 0) {
            newsContainer.innerHTML = `<p>No business posts found.</p>`;
            return;
        }

        // Use DocumentFragment for efficient batch appends
        const fragment = document.createDocumentFragment();
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
          <!-- <small class="post-date">${date}</small> -->
          <p>${post.content.slice(0, 100)}...</p>
        </div>
        ${post.thumbnail ? `<img src="${post.thumbnail}" alt="${post.title}" loading="lazy">` : ''}
      `;
            fragment.appendChild(postElement);
        });
        newsContainer.appendChild(fragment);

        // Update URL hash for bookmarking/back-forward
        window.location.hash = `page=${page}`;
        currentPage = page;
    }

    function renderPagination() {
        const totalPages = Math.ceil(allNewsPosts.length / postsPerPage);
        paginationContainer.innerHTML = "";

        if (totalPages <= 1) return;

        // Previous button
        const prevBtn = document.createElement("button");
        prevBtn.textContent = "Previous";
        prevBtn.disabled = currentPage === 1;
        prevBtn.classList.toggle("disabled", currentPage === 1);
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                renderPage(currentPage);
                renderPagination();
            }
        };
        paginationContainer.appendChild(prevBtn);

        // Numbered buttons with ellipsis (for >7 pages)
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
            pageBtn.onclick = () => {
                currentPage = i;
                renderPage(currentPage);
                renderPagination();
            };
            paginationContainer.appendChild(pageBtn);

            // Ellipsis if gap
            if (i !== endPage && i < totalPages) {
                const ellipsis = document.createElement("span");
                ellipsis.textContent = "...";
                ellipsis.classList.add("ellipsis");
                paginationContainer.appendChild(ellipsis);
            }
        }

        // Next button
        const nextBtn = document.createElement("button");
        nextBtn.textContent = "Next";
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.classList.toggle("disabled", currentPage === totalPages);
        nextBtn.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderPage(currentPage);
                renderPagination();
            }
        };
        paginationContainer.appendChild(nextBtn);

        // Accessibility
        paginationContainer.setAttribute("role", "navigation");
        paginationContainer.setAttribute("aria-label", "Business news pagination");
    }

    // Load on init
    fetchNewsPosts();

    // Listen for hash changes (back/forward nav)
    window.addEventListener('hashchange', () => {
        const newPage = parseInt(new URLSearchParams(window.location.hash.slice(1)).get('page')) || 1;
        if (newPage !== currentPage && newPage >= 1 && newPage <= Math.ceil(allNewsPosts.length / postsPerPage)) {
            currentPage = newPage;
            renderPage(currentPage);
            renderPagination();
        }
    });
});

// Ads Show
// Sidebar Media Loader (Obfuscated for Resilience)
async function initMediaPanel() {
    const category = document.querySelector("article")?.dataset.category || "business";
    const track = document.getElementById("mediaTrack");
    if (!track) return;

    // Cache key (neutral name)
    const cacheKey = `wrytix-media-${category}`;
    const cacheTTL = 300000; // 5min

    // Obfuscate elements dynamically
    function obfuscate() {
        const rand = Math.random().toString(36).slice(2, 8);
        track.id = `track-${rand}`;
        track.parentElement.id = `wrap-${rand}`;
        track.className = `item-group-${rand}`;
    }

    // Load from cache or API
    async function loadContent() {
        // Try cache first (instant, evades fetch blocks)
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const { content, ts } = JSON.parse(cached);
            if (Date.now() - ts < cacheTTL) {
                renderSlides(content);
                return;
            }
        }

        try {
            // Fetch pre-rendered HTML from backend (harder to block)
            const res = await fetchWithRetry(`https://wrytix.onrender.com/api/ads?cat=${category}`);
            const data = await res.json();
            const now = new Date();
            const filtered = data.filter(ad =>
                ad.category === category &&
                ad.active &&
                new Date(ad.startDate) <= now &&
                new Date(ad.endDate) >= now
            );

            // Cache slides as HTML array
            const slides = filtered.map(ad => buildSlide(ad));
            localStorage.setItem(cacheKey, JSON.stringify({ content: slides, ts: Date.now() }));
            renderSlides(slides);
        } catch (err) {
            console.error('Media load error:', err);
            // Fallback: Static or notice (non-ad-like)
            track.innerHTML = '<div class="fallback">Discover partners <a href="/sponsors">here</a>.</div>';
            detectBlock(); // Check for interference
        }
    }

    // Build slide HTML (server-like rendering)
    function buildSlide(ad) {
        obfuscate(); // Re-obfuscate per slide
        let html = '';
        if (ad.type === "image" && ad.file) {
            html = `<a href="${ad.link || '#'}" target="_blank" rel="nofollow"><img src="${ad.file}" alt="Featured media" loading="lazy"></a>`;
        } else if (ad.type === "video" && ad.file) {
            html = `<video src="${ad.file}" muted loop playsinline><source src="${ad.file}" type="video/mp4"></video>`;
        } else if (ad.type === "html" && ad.html) {
            html = `<div class="custom-content">${ad.html}</div>`;
        } else if (ad.type === "text" && ad.text) {
            html = `<div class="promo-text">${ad.text} <a href="${ad.link}">Learn more</a></div>`;
        }
        return `<div class="media-item">${html}</div>`;
    }

    // Render slides (CSS-driven for subtlety)
    function renderSlides(slides) {
        track.innerHTML = slides.join('');
        if (slides.length > 1) {
            initRotation(slides.length);
        } else if (slides.length === 0) {
            track.innerHTML = '<p>Content coming soon.</p>';
        }
        detectBlock(); // Post-render check
    }

    // Subtle rotation (CSS transform, less detectable)
    function initRotation(count) {
        let idx = 0;
        const wrapper = document.getElementById("rotContainer") || track.parentElement;
        wrapper.addEventListener("mouseenter", () => wrapper.classList.add("paused"));
        wrapper.addEventListener("mouseleave", () => wrapper.classList.remove("paused"));

        const rotator = () => {
            if (wrapper.classList.contains("paused")) return;
            idx = (idx + 1) % count;
            track.style.transform = `translateY(-${idx * 100}%)`; // Assumes fixed-height slides
        };
        setInterval(rotator, 4000); // 4s cycle
    }

    // Block detection (monitor for empty/mutated content)
    function detectBlock() {
        setTimeout(() => {
            if (track.children.length === 0 || track.innerHTML.includes("Loading")) {
                track.innerHTML = `
          <div class="notice" style="text-align:center;padding:15px;background:#f0f8ff;border-radius:6px;">
            <p>Enjoy ad-free? <a href="/premium" style="color:#007bff;">Upgrade for $1/mo</a> or <button onclick="location.reload()" style="background:#007bff;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">Refresh</button></p>
          </div>
        `;
            }
        }, 2000);
    }

    // Retry fetch
    async function fetchWithRetry(url, retries = 2) {
        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Status ${res.status}`);
                return res;
            } catch (err) {
                if (i === retries - 1) throw err;
                await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Backoff
            }
        }
    }

    // Init
    obfuscate();
    loadContent();
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMediaPanel);
} else {
    initMediaPanel();
}


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