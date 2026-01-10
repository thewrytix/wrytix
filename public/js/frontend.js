document.addEventListener("DOMContentLoaded", () => {

    /* =================== FEATURED SECTION =================== */
    const featuredSection = document.querySelector(".featured-section");

    if (featuredSection) {
        // Large featured skeleton
        const largeSkeleton = document.createElement("div");
        largeSkeleton.className = "featured-large skeleton";
        largeSkeleton.innerHTML = `
            <div class="image-skeleton skeleton"></div>
            <div class="text-skeleton skeleton"></div>
        `;

        // Small featured grid skeleton
        const smallGridSkeleton = document.createElement("div");
        smallGridSkeleton.className = "featured-grid";
        for (let i = 0; i < 6; i++) { // show 3 skeleton posts
            const smallPost = document.createElement("div");
            smallPost.className = "small-post skeleton";
            smallPost.innerHTML = `
                <div class="image-skeleton skeleton"></div>
                <div class="text-skeleton skeleton"></div>
            `;
            smallGridSkeleton.appendChild(smallPost);
        }

        featuredSection.appendChild(largeSkeleton);
        featuredSection.appendChild(smallGridSkeleton);
    }

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

    /* =================== SIDEBAR LISTS =================== */
    const sidebarLists = document.querySelectorAll(".sidebar-section ul");

    sidebarLists.forEach(list => {
        for (let i = 0; i < 9; i++) { // 5 skeleton items
            const li = document.createElement("li");
            li.className = "skeleton";
            li.innerHTML = `<div class="text-skeleton skeleton"></div>`;
            list.appendChild(li);
        }
    });

    /* =================== FETCH API DATA =================== */
    async function loadAllData() {
        try {
            const response = await fetch('https://wrytix.onrender.com/posts');
            if (!response.ok) throw new Error(`API: ${response.status}`);
            const allPosts = await response.json(); // Raw array of posts

            // Cache for 5min
            localStorage.setItem('wrytix-posts', JSON.stringify({ data: allPosts, timestamp: Date.now() }));

            // Process once: featured, categories, sidebar
            processFeatured(allPosts); // Your existing featured logic
            processCategories(allPosts); // Merge blogData.renderAll logic
            processSidebar(allPosts); // Merge fetchPostsFromAPI + updateSidebarPosts

            // Remove all skeletons
            document.querySelectorAll('.skeleton').forEach(el => {
                el.style.opacity = '0';
                setTimeout(() => el.remove(), 300);
            });
        } catch (error) {
            console.error('Load failed:', error);
            // Enhanced fallback: Load from cache if available
            const cached = localStorage.getItem('wrytix-posts');
            if (cached) {
                const { data: allPosts, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < 300000) { // 5min TTL
                    processFeatured(allPosts); // etc.
                    return;
                }
            }
            // Show retry UI (your existing errorDiv)
            showRetryUI();
        }
    }

// Helper: Check cache first
    function getCachedPosts() {
        const cached = localStorage.getItem('wrytix-posts');
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < 300000) return data;
        }
        return null;
    }

});

(() => {
    async function fetchForexRates() {
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
            console.error("Error fetching forex rates from backend:", error);
        }
    }

    // Run once page loads
    document.addEventListener("DOMContentLoaded", fetchForexRates);

    // Refresh every 5 minutes
    setInterval(fetchForexRates, 300000);
})();



// Back to the top
let backtToTopValue = () => {
    let backToTopBtn = document.getElementById("backToTop");
    let pos = document.documentElement.scrollTop;

    if (pos > 100) {
        backToTopBtn.style.display = "block";
    } else {
        backToTopBtn.style.display = "none";
    }

    backToTopBtn.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    });


};

    window.onscroll = backtToTopValue;
    window.onload = backtToTopValue;


//Hamburger
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('show');
});

// Close menu when clicking a link on mobile
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('show');
    });
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !hamburger.contains(e.target) && navLinks.classList.contains('show')) {
        hamburger.classList.remove('active');
        navLinks.classList.remove('show');
    }
});

// Optional: Sticky on scroll
window.addEventListener("scroll", function () {
    const nav = document.querySelector(".main-nav");
    nav.classList.toggle("sticky", window.scrollY > 0);
});



// Top header date and time
const dateTimeEl = document.getElementById("date-time");

function updateTime() {
    const now = new Date();
    const dateOptions = {weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'};
    const dateString = now.toLocaleDateString(undefined, dateOptions);
    const timeString = now.toLocaleTimeString(); // e.g., 10:23:45 AM
    dateTimeEl.textContent = `${dateString} — ${timeString}`;
}

updateTime();
setInterval(updateTime, 1000); // Update every second for real-time clock




document.addEventListener("DOMContentLoaded", () => {
    const MOBILE_BREAKPOINT = 486;

    const SOCIAL_LINKS = {
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

    const buildSocialHtml = () => {
        const links = window.innerWidth <= MOBILE_BREAKPOINT ? SOCIAL_LINKS.mobile : SOCIAL_LINKS.web;
        return Object.entries(links)
            .map(([platform, url]) =>
                `<a href="${url}" target="_blank" rel="noopener noreferrer" class="${platform}" aria-label="${platform}"></a>`
            ).join('');
    };

    const injectSocialIcons = () => {
        document.querySelectorAll('.social-icons, .header-social-icons')
            .forEach(container => {
                if (!container.querySelector('a')) {
                    container.innerHTML = buildSocialHtml();
                }
            });
    };

    injectSocialIcons();

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            document.querySelectorAll('.social-icons a, .header-social-icons a')
                .forEach(link => {
                    const platform = link.className;
                    const links = window.innerWidth <= MOBILE_BREAKPOINT ? SOCIAL_LINKS.mobile : SOCIAL_LINKS.web;
                    link.href = links[platform];
                });
        }, 100);
    });
});


