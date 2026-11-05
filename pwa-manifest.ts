import type { ManifestOptions } from 'vite-plugin-pwa';
import type { Site } from './scripts/sites.js';

/** Catalogue manifest, or the manifest of one single-game site (its own name, scope and icons). */
export function manifestFor(site?: { id: string } & Site): Partial<ManifestOptions> {
    const icon = site ? `icons/${site.id}` : 'icons/opencade';
    return {
        ...(site ? { id: './' } : {}),
        name: site?.name ?? 'Opencade',
        short_name: site?.shortName ?? 'Opencade',
        ...(site ? { description: site.description } : {}),
        lang: 'fr',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: site?.themeColor ?? '#101827',
        background_color: '#101827',
        start_url: './',
        scope: './',
        icons: [
            { src: `${icon}-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: `${icon}-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: `${icon}-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    };
}
export const manifest = manifestFor();
