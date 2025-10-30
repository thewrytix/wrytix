import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        outDir: 'dist',        // where production files go
        minify: 'terser',      // compress & obfuscate
        terserOptions: {
            compress: true,
            mangle: true,        // rename variables/functions
            format: {
                comments: false,   // remove comments
            },
        },
    },
});
