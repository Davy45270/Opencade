// Explicit inventory of executable fast checks; see docs/node-tests.md for helpers/tools.
export const nodeChecks = [
    // Start the longest replays first so neither worker leaves a long serial tail.
    ...['derapage', 'character-games-2', 'orbite', 'essaim', 'ferraille',
        'caisses', 'briqueterie', 'character-scenes-2', 'characters',
        'character-finger-4', 'character-games-4', 'character-games', 'character-scenes', 'character-games-3', 'character-scenes-3', 'character-finger-3', 'empilo', 'alunir', 'arcade-art', 'bubble',
        'character-snake-policy', 'finger', 'action-art', 'action-scenes', 'level-catalogue', 'dedale', 'pass76', 'regressions', 'serpentin', 'traverse']
        .map(name => [`validate-${name}.js`, '--checks-only']),
    ['validate-ferraille-levels.js', '--checks-only'],
    ['validate-collier.js'],
    ['check-essaim-art.js'],
    ['check-essaim-signature-art.js'],
    ['check-essaim-geometry.js'],
    ['validate-essaim-signature.js'],
    ['check-essaim-signature-mutations.js'],
    ['check-pwa-mutations.js'],
    ['test-dedale.js'],
    ['test-pwa.js'],
    ['measure-thumbnails.js'],
    // bubble-input-check, check-derapage-joystick-mutations and
    // validate-derapage-historical are already imported by the validators above.
];
