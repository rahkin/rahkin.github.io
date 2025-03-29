import { defineConfig } from 'vite';

export default defineConfig({
    base: '/pokka-snakes-gl/',
    server: {
        port: 3000,
        proxy: {
            '/socket.io': {
                target: 'ws://localhost:3001',
                ws: true
            }
        }
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: true,
        rollupOptions: {
            input: {
                main: 'index.html'
            }
        }
    }
});