const fs = require('fs').promises;
const path = require('path');
const { escapeHtml } = require('../utils/escapeHtml');
const { logger } = require('../config/logger');
class StaticPostGenerator {
    constructor() {
        this.postsDir = path.join(__dirname, '../static-posts');
        this.init();
    }

    async init() {
        try {
            await fs.access(this.postsDir);
        } catch (err) {
            await fs.mkdir(this.postsDir, { recursive: true });
            console.log('Created static posts directory:', this.postsDir);
        }
    }

    generateHTML(post) {
        let desc = post.excerpt || '';
        if (!desc) {
            desc = post.content.replace(/<[^>]*>/g, '').substring(0, 160).trim() + '...';
        }

        // Use your actual domain
        const baseUrl = 'https://wrytix.com';

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${escapeHtml(post.title)}</title>
    <meta name="description" content="${escapeHtml(desc)}" />
    
    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(post.title)}" />
    <meta property="og:description" content="${escapeHtml(desc)}" />
    <meta property="og:image" content="${post.thumbnail || ''}" />
    <meta property="og:url" content="${baseUrl}/posts/${post.slug}.html" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Wrytix" />
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(post.title)}" />
    <meta name="twitter:description" content="${escapeHtml(desc)}" />
    <meta name="twitter:image" content="${post.thumbnail || ''}" />
    
    
    
    <!-- Styles -->
    <link rel="stylesheet" href="../css/frontend.css"/>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
    <link rel="stylesheet" href="../css/view-post.css"/>
    <link rel="stylesheet" href="../css/footer.css" />
    <link rel="stylesheet" href="../css/header.css" />
    <link rel="canonical" href="${baseUrl}/posts/${post.slug}.html"/>

</head>
<body>
    <header>
        <!-- Your header content (same as your main site) -->
        <section class="top-header">
            <div class="top-left">
                <a href="../html/about.html">About Us</a>
                <a href="../html/contact.html">Contact Us</a>
                <div id="date-time"></div>
            </div>
            <div id="forex-rates" class="top-center">
                <span id="usd-rate">USD: --</span> |
                <span id="eur-rate">EUR: --</span> |
                <span id="gbp-rate">GBP: --</span>
            </div>
            <div class="top-right">
                <a href="https://facebook.com" target="_blank"><i class="fab fa-facebook-f"></i></a>
                <a href="https://twitter.com" target="_blank"><i class="fab fa-x-twitter"></i></a>
                <a href="https://instagram.com" target="_blank"><i class="fab fa-instagram"></i></a>
            </div>
        </section>
        <nav class="main-nav">
            <a href="../index.html" class="logo"><img src="../images/wrytix-logo.svg"> <span>Wrytix</span></a>
            <div class="nav-links">
                <a href="../index.html">Home</a>
                <a href="../html/news.html">News</a>
                <a href="../html/business.html">Business</a>
                <a href="../html/foreign.html">Foreign</a>
                <a href="../html/sports.html">Sports</a>
                <a href="../html/technology.html">Technology</a>
                <a href="../html/lifestyle.html">Lifestyle</a>
            </div>
            <div class="viewer">
                <a class="loginBtn"><span>Login / Sign Up</span><i class="fa-solid fa-user"></i></a>
            </div>
        </nav>
    </header>


    <main class="main-container">
        <div class="main-content">
            <section class="blog-posts">
                <article>
                    <nav class="breadcrumbs">
                        <a href="../index.html">Home</a>
                        <span>›</span>
                        <a href="../html/${post.category?.toLowerCase() || 'news'}.html">${post.category || 'News'}</a>
                        <span>›</span>
                        <span>${escapeHtml(post.title)}</span>
                    </nav>
                    
                    <h1>${escapeHtml(post.title)}</h1>
                    
                    ${post.thumbnail ? `<img src="${post.thumbnail}" alt="${escapeHtml(post.title)}" style="width:100%; max-height:400px; object-fit:cover; margin: 16px 0; border-radius: 8px;">` : ''}
                    
                    <p><strong>By <span>${post.author || 'Unknown'}</span> | <span>${post.schedule ? new Date(post.schedule).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : 'N/A'}</span></strong></p>
                    
                    <div>${post.content}</div>
                    
                    ${post.source ? `<div class="source">Source: ${post.source.startsWith('http') ? `<a href="${post.source}" target="_blank">${post.source}</a>` : escapeHtml(post.source)}</div>` : ''}
                    
                    <!-- Share buttons -->
                    <div class="share-post">
                        <div class="share-icons">
                            <a href="https://www.facebook.com/sharer/sharer.php?u=${baseUrl}/posts/${post.slug}.html" target="_blank"><i class="fab fa-facebook-f"></i></a>
                            <a href="https://twitter.com/intent/tweet?url=${baseUrl}/posts/${post.slug}.html&text=${encodeURIComponent(post.title)}" target="_blank"><i class="fab fa-x-twitter"></i></a>
                            <a href="https://www.linkedin.com/shareArticle?url=${baseUrl}/posts/${post.slug}.html" target="_blank"><i class="fab fa-linkedin-in"></i></a>
                            <a href="https://wa.me/?text=${encodeURIComponent(post.title + ' - ' + baseUrl + '/posts/' + post.slug + '.html')}" target="_blank"><i class="fab fa-whatsapp"></i></a>
                        </div>
                    </div>
                </article>
            </section>
        </div>
    </main>

    <footer>
        <!-- Your footer content -->
        <div class="footer-container">
            <div class="footer-column footer-logo-social">
                <a href="../index.html" class="footer-logo"><img src="../images/wrytix-logo.svg" alt=""/><span>Wrytix</span></a>
                <div class="social-icons">
                    <a href="#"><i class="fab fa-facebook-f"></i></a>
                    <a href="#"><i class="fab fa-x-twitter"></i></a>
                    <a href="#"><i class="fab fa-instagram"></i></a>
                    <a href="#"><i class="fab fa-youtube"></i></a>
                    <a href="#"><i class="fab fa-tiktok"></i></a>
                </div>
            </div>
            <div class="footer-column footer-quick-links">
                <h3>Quick Links</h3>
                <ul>
                    <li><a href="../html/news.html">News</a></li>
                    <li><a href="../html/business.html">Business</a></li>
                    <li><a href="../html/foreign.html">Foreign</a></li>
                    <li><a href="../html/sports.html">Sports</a></li>
                    <li><a href="../html/technology.html">Technology</a></li>
                    <li><a href="../html/lifestyle.html">Lifestyle</a></li>
                </ul>
            </div>
            <div class="footer-column footer-newsletter">
                <h3>Newsletter</h3>
                <p>Subscribe to get the latest updates right in your inbox.</p>
                <form class="newsletter-form">
                    <input type="email" placeholder="Your email address" required />
                    <button type="submit">Subscribe</button>
                </form>
            </div>
        </div>
        <p class="copyright">© 2025 Wrytix. All rights reserved.</p>
    </footer>

    <script src="../js/frontend.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
           logger.info('Static post loaded: ${post.title}');
            // Any post-specific JS can go here
        });
    </script>
</body>
</html>`;
    }


    async generateStaticPost(post) {
        try {
            const html = this.generateHTML(post);
            const filePath = path.join(this.postsDir, `${post.slug}.html`);
            await fs.writeFile(filePath, html);
          logger.info(`✅ Static post generated: ${post.slug}.html`);
            return filePath;
        } catch (error) {
            logger.error(`❌ Failed to generate static post ${post.slug}:`, error);
            throw error;
        }
    }

    async deleteStaticPost(slug) {
        try {
            const filePath = path.join(this.postsDir, `${slug}.html`);
            await fs.unlink(filePath);
            logger.info(`🗑️ Static post deleted: ${slug}.html`);
        } catch (error) {
            // File might not exist, which is fine
            if (error.code !== 'ENOENT') {
                logger.error(`❌ Failed to delete static post ${slug}:`, error);
            }
        }
    }

    async generateAllStaticPosts() {
        try {
            const { Post } = require('../models');
            const posts = await Post.find().lean();

            logger.info(`Generating static posts for ${posts.length} posts...`);

            for (const post of posts) {
                await this.generateStaticPost(post);
            }

            logger.info(`🎉 Generated ${posts.length} static posts`);
        } catch (error) {
            logger.error('Error generating all static posts:', error);
            throw error;
        }
    }
}

module.exports = new StaticPostGenerator();