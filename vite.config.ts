import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        // Generate a single bundle for easy embedding.
        rollupOptions: {
            output: {
                manualChunks: undefined,
                // Consistent file names for embedding.
                entryFileNames: 'assets/kaiten-integra.js',
                chunkFileNames: 'assets/kaiten-integra.js',
                assetFileNames: 'assets/kaiten-integra.[ext]',
            },
        },
        // Smaller bundle size.
        minify: 'terser',
        // Source maps for debugging.
        sourcemap: true,
    },
    // Dev server configuration.
    server: {
        port: 3000,
        open: true,
        proxy: {
            '/api': {
                target: 'https://yarops.kaiten.ru',
                changeOrigin: true,
                secure: true,
                rewrite: (path) => path,
            },
        },
    },
})

