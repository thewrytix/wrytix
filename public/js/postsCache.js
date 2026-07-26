// Shared, deduplicated fetch for /posts — used by frontend.js and homepage.js
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