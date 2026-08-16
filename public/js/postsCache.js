// js/shared-utils.js
// API_BASE is defined globally in config.js – must be loaded before this script.

// Shared, deduplicated fetch for /posts — used across all pages
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

// Cloudinary URL transform helper — resizes + compresses on the fly
window.optimizeThumbnail = (url, width = 400) => {
    if (!url || !url.includes('/upload/')) return url; // not a Cloudinary URL, leave as-is
    return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto/`);
};

// Shared, deduplicated fetch for /ads — used across all pages
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