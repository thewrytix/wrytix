import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                frontend: './js/frontend.js',
                featured: './js/featured.js',
                comments: './js/comments.js',
                about: './js/about.js',
                contact: './js/contact.js',
                foreign: './js/foreign.js',
                news: './js/news.js',
                sports: './js/sports.js',  // added missing .js
                lifestyle: './js/lifestyle.js',
                technology: './js/technology.js',
                business: './js/business.js',
                marquee: './js/marquee.js',
                viewPosts: './js/view-post.js',
                viewerLogin: './js/viewer-login.js',
                gtag: './js/gtag.js',
                football: './js/football.js',
                postShareIcons: './js/post-share-icons.js',
                homepageAd: './js/homepage-ad.js',
            },
            output: {
                entryFileNames: 'assets/[name].[hash].js',
                chunkFileNames: 'assets/[name].[hash].js',
                assetFileNames: 'assets/[name].[hash].[ext]',
            },
        },
    },
});
