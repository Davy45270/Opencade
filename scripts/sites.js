// Games served by their own site: /Opencade/<site>/, own manifest, scope, service worker and icons.
// Read by vite.config.ts (OPENCADE_SITE=<site>), scripts/build-sites.js and scripts/e2e-impact.js.
// Each entry: game id of the registry, manifest names, theme colour. Icons: src/games/<game>/icons/{192,512,maskable-512}.png.
export const SITES = {
    pompiers: { game: 'petits-pompiers', name: 'Petits Pompiers', shortName: 'Pompiers', themeColor: '#2f86c4', description: 'Éteindre les feux et sauver les habitants, au doigt, à la souris ou au clavier.' },
};
/** Site of a game id, or undefined while the game is still played inside the catalogue. */
export function siteOf(game) {
    return Object.keys(SITES).find(site => SITES[site].game === game);
}
