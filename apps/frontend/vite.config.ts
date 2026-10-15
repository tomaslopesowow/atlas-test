import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// the api, which the dev server stands in front of, so the browser sees one origin
const API = process.env.API_URL ?? 'http://localhost:3001';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: API,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
            '/uploads': API,
        },
    },
});
