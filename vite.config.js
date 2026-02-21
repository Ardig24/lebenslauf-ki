import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                landing: resolve(__dirname, 'landing.html'),
                app: resolve(__dirname, 'app.html'),
                dashboard: resolve(__dirname, 'dashboard.html'),
                settings: resolve(__dirname, 'settings.html'),
                privacy: resolve(__dirname, 'privacy.html'),
                terms: resolve(__dirname, 'terms.html'),
                imprint: resolve(__dirname, 'imprint.html'),
            },
        },
    },
    server: {
        port: 3000,
        open: '/landing.html',
    },
});
