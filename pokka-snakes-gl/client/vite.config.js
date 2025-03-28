import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    server: {
        port: 5173,
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
        commonjsOptions: {
            include: [/three/]
        }
    }
}); 