import { defineConfig } from 'vite';

export default defineConfig({
    resolve: {
        alias: {
            'three': 'three',
            'postprocessing': 'postprocessing'
        }
    },
    optimizeDeps: {
        include: ['three', 'postprocessing']
    },
    build: {
        commonjsOptions: {
            include: [/three/, /postprocessing/]
        }
    }
}); 