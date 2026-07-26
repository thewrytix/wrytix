// Shared, deduplicated fetch for /posts — used across all pages
window.WrytixPosts = (() => {
    let promise = null;

    function getPosts() {
        if (!promise) {
            promise = fetch('https://wrytix.onrender.com/posts')
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