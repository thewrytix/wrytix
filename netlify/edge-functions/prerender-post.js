export default async (request, context) => {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");
    if (!slug) return context.next();

    const res = await fetch(`https://wrytix.onrender.com/posts/${slug}`);
    if (!res.ok) return context.next();

    const post = await res.json();
    const description =
        post.content.replace(/<[^>]+>/g, "").slice(0, 160) ||
        "Wrytix - News and Business Updates";
    const image = post.thumbnail || "https://wry-tix.com/default-thumb.jpg";
    const title = post.title || "Wrytix Post";

    const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="https://wry-tix.com/posts/view-post.html?slug=${slug}">
    <meta name="twitter:card" content="summary_large_image">
  </head>
  <body>
    <main id="app"></main>
    <script type="module" src="/posts/view-post.js"></script>
  </body>
  </html>`;

    return new Response(html, { headers: { "Content-Type": "text/html" } });
};
