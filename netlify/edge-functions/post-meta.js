// netlify/edge-functions/post-meta.js
//
// Problem this solves:
// view-post.html ships with placeholder meta tags ("Loading...", empty og:image).
// The real values are injected by view-post.js AFTER fetching the post from the
// API — but social/chat crawlers (Facebook, Twitter/X, WhatsApp, Slack, Discord,
// LinkedIn, Telegram) never execute JavaScript. They only ever see whatever HTML
// came back on the very first request. So every shared link previewed as
// "Loading..." with no image, regardless of the actual post.
//
// This Edge Function intercepts requests to /posts/view-post.html, fetches the
// post server-side (same API your client JS already calls), and rewrites the
// <head> meta tags in the HTML before it's sent to the browser/crawler.
// The static file itself, and view-post.js, are completely untouched — this
// only changes what's already in the <head> on arrival.

const API_BASE = "https://wrytix.onrender.com";

export default async (request, context) => {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");

    // Let Netlify serve the normal static file first
    const response = await context.next();

    // No slug (e.g. someone hit the page with no query) — nothing to inject
    if (!slug) return response;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return response;

    let html = await response.text();

    try {
        const apiRes = await fetch(`${API_BASE}/posts/${encodeURIComponent(slug)}`);
        if (!apiRes.ok) {
            // Post not found / API down — serve the original placeholder HTML,
            // don't break the page over a failed meta-tag lookup
            return new Response(html, response);
        }

        const post = await apiRes.json();

        const title = escapeHtml(post.title || "Wrytix");
        const rawDesc = post.excerpt || stripHtml(post.content || "").slice(0, 160);
        const description = escapeHtml(rawDesc.trim() + (rawDesc.length >= 160 ? "..." : ""));
        const image = post.thumbnail || "";
        const canonicalUrl = `${url.origin}${url.pathname}${url.search}`;

        html = html
            .replace(
                "<title>Loading...</title>",
                `<title>${title}</title>`
            )
            .replace(
                '<meta name="description" content="Loading post details..." />',
                `<meta name="description" content="${description}" />`
            )
            .replace(
                '<meta property="og:title" content="Loading..." />',
                `<meta property="og:title" content="${title}" />`
            )
            .replace(
                '<meta property="og:description" content="Loading post details..." />',
                `<meta property="og:description" content="${description}" />`
            )
            .replace(
                '<meta property="og:image" content="" />',
                `<meta property="og:image" content="${image}" />`
            )
            .replace(
                '<meta property="og:url" content="" />',
                `<meta property="og:url" content="${canonicalUrl}" />`
            )
            .replace(
                '<link rel="canonical" href="" />',
                `<link rel="canonical" href="${canonicalUrl}" />`
            )
            // Twitter title/description/image don't exist in the static HTML at
            // all (view-post.js only creates them client-side) — add them here
            .replace(
                '<meta name="twitter:card" content="summary_large_image" />',
                `<meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />`
            );

        return new Response(html, {
            status: response.status,
            headers: {
                ...Object.fromEntries(response.headers),
                // Short edge cache so we're not hitting the API on every single
                // crawler request, but posts still update reasonably fast
                "cache-control": "public, max-age=300, s-maxage=300",
            },
        });
    } catch (err) {
        console.error("post-meta edge function failed:", err);
        return new Response(html, response);
    }
};

export const config = {
    path: "/posts/view-post.html",
};

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function stripHtml(str) {
    return String(str).replace(/<[^>]*>/g, "");
}