import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        // Smaller bundle size.
        minify: 'terser',
        // Source maps for debugging.
        sourcemap: true,
    },
    // Dev server configuration.
    server: {
        port: 3000,
        open: true,
    },
})
