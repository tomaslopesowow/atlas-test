import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// the api the dev server stands in front of, so the panel sees one origin as it does when served
const API = process.env.API_URL ?? 'http://localhost:3001';

export default defineConfig({
    // served by @repo/admin under /admin, so every asset is asked for there
    base: '/admin/',
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
        port: 3100,
        proxy: { '/admin/api': API },
    },
});
