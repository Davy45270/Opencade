import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };
declare const process: { env: Record<string, string | undefined> };
import { manifest } from './pwa-manifest.ts';

const version = process.env.PWA_FIXTURE_VERSION ?? pkg.version;
const builtAt = new Date().toISOString();
export default defineConfig({
    define: { __APP_VERSION__: JSON.stringify(version), __BUILD_DATE__: JSON.stringify(builtAt) },
    base: './',
    plugins: [{ name: 'opencade-version', generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version, builtAt }) });
    } }, VitePWA({
        strategies: 'generateSW',
        registerType: 'prompt',
        injectRegister: false,
        manifest,
        workbox: {
            cacheId: 'opencade',
            clientsClaim: true,
            globIgnores: ['**/version.json'],
            globPatterns: ['**/*.{html,js,css,png,svg,ico,webmanifest}'],
            // Phaser is bundled locally; never omit it from the offline build.
            maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
            cleanupOutdatedCaches: true,
            runtimeCaching: [],
        },
    })],
});
