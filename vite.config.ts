import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { manifest } from './pwa-manifest.ts';

export default defineConfig({
    base: './',
    plugins: [VitePWA({
        strategies: 'generateSW',
        registerType: 'prompt',
        injectRegister: false,
        manifest,
        workbox: {
            globPatterns: ['**/*.{html,js,css,png,svg,ico,webmanifest}'],
            // Phaser is bundled locally; never omit it from the offline build.
            maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
            cleanupOutdatedCaches: true,
            runtimeCaching: [],
        },
    })],
});
