// Games served by their own site: /Opencade/<site>/, own manifest, scope, service worker and icons.
// Read by vite.config.ts (OPENCADE_SITE=<site>), scripts/build-sites.js and scripts/e2e-impact.js.
// Each entry: game id of the registry, manifest names, theme colour. Icons: src/games/<game>/icons/{192,512,maskable-512}.png.
export const SITES = {};
/** Site of a game id, or undefined while the game is still played inside the catalogue. */
export function siteOf(game) {
    return Object.keys(SITES).find(site => SITES[site].game === game);
}
