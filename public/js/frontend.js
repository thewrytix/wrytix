/**
 * frontend.js
 * Handles: loading skeletons, forex ticker, back-to-top button,
 * mobile nav (hamburger), header clock, social icon injection,
 * and copyright year updater.
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
            const response = await fetch("https://wrytix.onrender.com/api/forex");
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
   Init
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    SkeletonLoaders.init();
    ForexTicker.init();
    BackToTop.init();
    MobileNav.init();
    HeaderClock.init();
    SocialIcons.init();
    CopyrightUpdater.init();  // <-- now runs on every page
});