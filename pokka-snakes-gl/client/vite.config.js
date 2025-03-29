import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: './',
    publicDir: 'public',
    server: {
        port: 3002,
        proxy: {
            '/socket.io': {
                target: 'ws://localhost:3000',
                ws: true
            }
        }
    },
    resolve: {
        dedupe: ['three'],
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    optimizeDeps: {
        include: ['three']
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        commonjsOptions: {
            include: [/three/]
        }
    },
    esbuild: {
        target: 'es2020'
    }
}); 