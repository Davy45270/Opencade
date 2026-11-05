import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';
import pkg from './package.json' with { type: 'json' };
import { manifestFor } from './pwa-manifest.ts';
import { SITES } from './scripts/sites.js';
declare const process: { env: Record<string, string | undefined> };

// One configuration for the catalogue (no OPENCADE_SITE) and for each single-game site (OPENCADE_SITE=<site>, see scripts/sites.js).
const siteName = process.env.OPENCADE_SITE;
const site = siteName ? SITES[siteName] : undefined;
if (siteName && !site) throw new Error(`OPENCADE_SITE inconnu : ${siteName}`);
const version = process.env.PWA_FIXTURE_VERSION ?? pkg.version;
const builtAt = new Date().toISOString();
const path = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url));
const sites = Object.keys(SITES);
/** A site page is the catalogue's index.html with its own title, touch icon and entry module. */
const sitePage = (name: string, title: string): Plugin => ({ name: 'opencade-site-page', transformIndexHtml: { order: 'pre', handler: html => html
    .replace('<title>Opencade</title>', `<title>${title}</title>`)
    .replace('href="./icons/opencade-192.png"', `href="./icons/${name}-192.png"`)
    .replace('src="/src/main.ts"', 'src="/src/site.ts"') } });
export default defineConfig({
    define: { __APP_VERSION__: JSON.stringify(version), __BUILD_DATE__: JSON.stringify(builtAt) },
    base: './',
    ...(site && siteName ? {
        publicDir: path(`./src/games/${site.game}/site`),
        resolve: { alias: { '@site-game': path(`./src/games/${site.game}/definition.ts`) } },
        build: { outDir: `dist/${siteName}`, emptyOutDir: true },
    } : {}),
    plugins: [...(site && siteName ? [sitePage(siteName, site.name)] : []), { name: 'opencade-version', generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version, builtAt }) });
    } }, VitePWA({
        strategies: 'generateSW',
        registerType: 'prompt',
        injectRegister: false,
        manifest: manifestFor(site && siteName ? { id: siteName, ...site } : undefined),
        workbox: {
            // A site's caches must not start with "opencade-": the catalogue's forced update deletes those.
            cacheId: siteName ? `opencade.${siteName}` : 'opencade',
            clientsClaim: true,
            // The catalogue worker leaves each site to its own worker: no precache of dist/<site>/, no index.html fallback there.
            globIgnores: ['**/version.json', ...(siteName ? [] : sites.map(name => `${name}/**`))],
            ...(siteName ? {} : { navigateFallbackDenylist: sites.map(name => new RegExp(`/${name}/`)) }),
            globPatterns: ['**/*.{html,js,css,png,svg,ico,webmanifest}'],
            // Phaser is bundled locally; never omit it from the offline build.
            maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
            cleanupOutdatedCaches: true,
            runtimeCaching: [],
        },
    })],
});
