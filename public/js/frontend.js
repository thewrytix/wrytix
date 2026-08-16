/**
 * frontend.js
 * Handles: loading skeletons, forex ticker, back-to-top button,
 * mobile nav (hamburger), header clock, social icon injection,
 * copyright year updater, AND global ads loader.
 *
 * Note: Featured/category/sidebar post rendering is handled by homepage.js.
 */

/* =========================================================
   Skeleton Loaders (placeholder markup shown before homepage.js renders data)
   ========================================================= */

const SkeletonLoaders = (() => {
    const injectFeaturedSkeleton = () => {
        const featuredSection = document.querySelector(".featured-section");
        if (!featuredSection) return;

        const largeSkeleton = document.createElement("div");
        largeSkeleton.className = "featured-large skeleton";
        largeSkeleton.innerHTML = `
            <div class="image-skeleton skeleton"></div>
            <div class="text-skeleton skeleton"></div>
        `;

        const smallGridSkeleton = document.createElement("div");
        smallGridSkeleton.className = "featured-grid";
        for (let i = 0; i < 6; i++) {
            const smallPost = document.createElement("div");
            smallPost.className = "small-post skeleton";
            smallPost.innerHTML = `
                <div class="image-skeleton skeleton"></div>
                <div class="text-skeleton skeleton"></div>
            `;
            smallGridSkeleton.appendChild(smallPost);
        }

        featuredSection.append(largeSkeleton, smallGridSkeleton);
    };

    const injectCategorySkeletons = () => {
        document.querySelectorAll(".category-section").forEach(section => {
            for (let i = 0; i < 4; i++) {
                const postSkeleton = document.createElement("div");
                postSkeleton.className = "post-preview skeleton";
                postSkeleton.innerHTML = `
                    <div class="image-skeleton skeleton"></div>
                    <div class="text-skeleton skeleton"></div>
                `;
                section.appendChild(postSkeleton);
            }
        });
    };

    const injectSidebarSkeletons = () => {
        document.querySelectorAll(".sidebar-section ul").forEach(list => {
            for (let i = 0; i < 9; i++) {
                const li = document.createElement("li");
                li.className = "skeleton";
                li.innerHTML = `<div class="text-skeleton skeleton"></div>`;
                list.appendChild(li);
            }
        });
    };

    const init = () => {
        injectFeaturedSkeleton();
        injectCategorySkeletons();
        injectSidebarSkeletons();
    };

    return { init };
})();

/* =========================================================
   Forex Ticker
   ========================================================= */

const ForexTicker = (() => {
    const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    const fetchRates = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/forex`);
            const data = await response.json();

            const usdEl = document.getElementById("usd-rate");
            const eurEl = document.getElementById("eur-rate");
            const gbpEl = document.getElementById("gbp-rate");

            if (usdEl) usdEl.textContent = `💵 USD/GHC: ${data.USD.toFixed(2)}`;
            if (eurEl) eurEl.textContent = `💶 EUR/GHC: ${data.EUR.toFixed(2)}`;
            if (gbpEl) gbpEl.textContent = `💷 GBP/GHC: ${data.GBP.toFixed(2)}`;
        } catch (error) {
            console.error("ForexTicker: failed to fetch rates:", error);
        }
    };

    const init = () => {
        fetchRates();
        setInterval(fetchRates, REFRESH_INTERVAL_MS);
    };

    return { init };
})();

/* =========================================================
   Back To Top Button
   ========================================================= */

const BackToTop = (() => {
    let button;

    const updateVisibility = () => {
        const pos = document.documentElement.scrollTop;
        button.style.display = pos > 100 ? "block" : "none";
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const init = () => {
        button = document.getElementById("backToTop");
        if (!button) return;

        button.addEventListener("click", scrollToTop);
        window.addEventListener("scroll", updateVisibility);
        updateVisibility();
    };

    return { init };
})();

/* =========================================================
   Mobile Nav (Hamburger)
   ========================================================= */

const MobileNav = (() => {
    let hamburger, navLinks;

    const closeMenu = () => {
        hamburger.classList.remove("active");
        navLinks.classList.remove("show");
    };

    const init = () => {
        hamburger = document.querySelector(".hamburger");
        navLinks = document.querySelector(".nav-links");
        if (!hamburger || !navLinks) return;

        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active");
            navLinks.classList.toggle("show");
        });

        document.querySelectorAll(".nav-links a").forEach(link => {
            link.addEventListener("click", closeMenu);
        });

        document.addEventListener("click", (e) => {
            const clickedOutside = !navLinks.contains(e.target) && !hamburger.contains(e.target);
            if (clickedOutside && navLinks.classList.contains("show")) closeMenu();
        });

        window.addEventListener("scroll", () => {
            document.querySelector(".main-nav")?.classList.toggle("sticky", window.scrollY > 0);
        });
    };

    return { init };
})();

/* =========================================================
   Header Clock
   ========================================================= */

const HeaderClock = (() => {
    let el;

    const update = () => {
        const now = new Date();
        const dateString = now.toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "short",
            day: "numeric"
        });
        el.textContent = `${dateString} — ${now.toLocaleTimeString()}`;
    };

    const init = () => {
        el = document.getElementById("date-time");
        if (!el) return;

        update();
        setInterval(update, 1000);
    };

    return { init };
})();

/* =========================================================
   Social Icons
   ========================================================= */

const SocialIcons = (() => {
    const MOBILE_BREAKPOINT = 486;

    const LINKS = {
        web: {
            facebook: "https://facebook.com",
            twitter: "https://x.com/WrytixOfficial",
            instagram: "https://www.instagram.com/wrytixofficial/",
            youtube: "https://www.youtube.com/channel/UCig810dXawPE2YlVwwS6EOQ",
            tiktok: "https://www.tiktok.com/@wrytix",
            linkedin: "https://www.linkedin.com/company/wrytix/?viewAsMember=true"
        },
        mobile: {
            facebook: "fb://page/your-page-id",
            twitter: "twitter://user?screen_name=WrytixOfficial",
            instagram: "instagram://user?username=wrytixofficial",
            youtube: "youtube://channel/UCig810dXawPE2YlVwwS6EOQ",
            tiktok: "snssdk1128://user/profile/wrytix",
            linkedin: "linkedin://profile/company/wrytix"
        }
    };

    const currentLinks = () => (window.innerWidth <= MOBILE_BREAKPOINT ? LINKS.mobile : LINKS.web);

    const buildHtml = () =>
        Object.entries(currentLinks())
            .map(([platform, url]) =>
                `<a href="${url}" target="_blank" rel="noopener noreferrer" class="${platform}" aria-label="${platform}"></a>`
            )
            .join("");

    const inject = () => {
        document.querySelectorAll(".social-icons, .header-social-icons").forEach(container => {
            if (!container.querySelector("a")) {
                container.innerHTML = buildHtml();
            }
        });
    };

    const updateHrefsOnResize = () => {
        const links = currentLinks();
        document.querySelectorAll(".social-icons a, .header-social-icons a").forEach(link => {
            link.href = links[link.className];
        });
    };

    const init = () => {
        inject();

        let resizeTimer;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(updateHrefsOnResize, 100);
        });
    };

    return { init };
})();

/* =========================================================
   Copyright Year Updater
   ========================================================= */

const CopyrightUpdater = (() => {
    const updateYear = () => {
        const el = document.querySelector('p.copyright');
        if (!el) return;
        const year = new Date().getFullYear();
        el.innerHTML = `&copy; ${year} Wrytix. All rights reserved.`;
    };

    const init = () => {
        updateYear();
    };

    return { init };
})();

/* =========================================================
   ================ GLOBAL ADS LOADER =====================
   (Added here so every page can call it without duplication)
   ========================================================= */

// ----- Shared, deduplicated fetches -----
window.WrytixPosts = (() => {
    let promise = null;

    function getPosts() {
        if (!promise) {
            promise = fetch(`${API_BASE}/posts`)
                .then(res => {
                    if (!res.ok) throw new Error(`API: ${res.status}`);
                    return res.json();
                })
                .catch(err => {
                    promise = null; // allow retry on next call if it failed
                    throw err;
                });
        }
        return promise;
    }

    return { getPosts };
})();

window.WrytixAds = (() => {
    let promise = null;

    function getAds() {
        if (!promise) {
            promise = fetch(`${API_BASE}/ads`)
                .then(res => {
                    if (!res.ok) throw new Error(`API: ${res.status}`);
                    return res.json();
                })
                .catch(err => {
                    promise = null; // allow retry on next call if it failed
                    throw err;
                });
        }
        return promise;
    }

    return { getAds };
})();

// ----- Cloudinary URL transform helper -----
window.optimizeThumbnail = (url, width = 400) => {
    if (!url || !url.includes('/upload/')) return url;
    return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto/`);
};

// ----- Render ad slides into a slider container -----
window.renderAdSlides = (sliderId, ads) => {
    const slider = document.getElementById(sliderId);
    if (!slider) return;

    slider.innerHTML = '';
    if (ads.length === 0) {
        slider.innerHTML = '<p>No media to display.</p>';
        return;
    }

    ads.forEach(ad => {
        const slide = document.createElement('div');
        slide.className = 'media-item';
        let content = '';
        if (ad.type === 'image' && ad.file) {
            content = `<a href="${ad.link || '#'}" target="_blank"><img src="${ad.file}" alt="Media Image" loading="lazy"></a>`;
        } else if (ad.type === 'video' && ad.file) {
            content = `<video src="${ad.file}" controls></video>`;
        } else if (ad.type === 'html' && ad.html) {
            content = `<div class="custom-content">${ad.html}</div>`;
        } else if (ad.type === 'text' && ad.text) {
            content = `<div class="promo-text">${ad.text}</div>`;
        }
        slide.innerHTML = content;
        slider.appendChild(slide);
    });

    if (ads.length > 1) {
        window.enableVerticalSlider(slider, ads.length);
    }
};

// ----- Enable vertical sliding carousel -----
window.enableVerticalSlider = (slider, count, wrapperId = 'rotContainer') => {
    let index = 0;
    let paused = false;
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    wrapper.addEventListener('mouseenter', () => (paused = true));
    wrapper.addEventListener('mouseleave', () => (paused = false));

    setInterval(() => {
        if (paused) return;
        index = (index + 1) % count;
        slider.style.transform = `translateY(-${index * 600}px)`;
    }, 4000);
};

// ----- Main ads loader (caching + filtering) -----
window.loadSidebarAds = async ({
                                   sliderId,
                                   wrapperId = 'rotContainer',
                                   category,
                                   defaultCategory = 'homepage'
                               } = {}) => {
    // Determine category if not provided
    if (!category) {
        const articleCat = document.querySelector('article')?.dataset.category;
        category = articleCat || defaultCategory;
    }

    const cacheKey = `wrytix-ads-${category}`;
    const CACHE_TTL = 300000; // 5 minutes

    // Check localStorage cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try {
            const { ads, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) {
                window.renderAdSlides(sliderId, ads);
                return;
            }
        } catch {
            localStorage.removeItem(cacheKey);
        }
    }

    try {
        const allAds = await window.WrytixAds.getAds();
        const now = new Date();
        const filtered = allAds.filter(ad =>
            ad.category === category &&
            ad.active &&
            new Date(ad.startDate) <= now &&
            new Date(ad.endDate) >= now
        );

        localStorage.setItem(cacheKey, JSON.stringify({ ads: filtered, timestamp: Date.now() }));
        window.renderAdSlides(sliderId, filtered);
    } catch (err) {
        console.error('Failed to load ads:', err);
        const slider = document.getElementById(sliderId);
        if (slider) slider.innerHTML = '<p>⚠️ Failed to load media.</p>';
    }
};

/* =========================================================
   Init (runs on all pages)
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    SkeletonLoaders.init();
    ForexTicker.init();
    BackToTop.init();
    MobileNav.init();
    HeaderClock.init();
    SocialIcons.init();
    CopyrightUpdater.init();
});