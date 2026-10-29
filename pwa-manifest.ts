import type { ManifestOptions } from 'vite-plugin-pwa';

export const manifest: Partial<ManifestOptions> = {
    name: 'Opencade',
    short_name: 'Opencade',
    lang: 'fr',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#101827',
    background_color: '#101827',
    start_url: './',
    scope: './',
    icons: [
        { src: 'icons/opencade-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/opencade-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/opencade-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
};
