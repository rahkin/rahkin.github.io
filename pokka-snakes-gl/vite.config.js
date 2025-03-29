import { defineConfig } from 'vite';
import { resolve } from 'path';

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
    resolve: {
        alias: {
            'three': resolve(__dirname, 'node_modules/three'),
            '@': resolve(__dirname, 'client/src')
        }
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            }
        }
    }
});