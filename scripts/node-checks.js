// Explicit inventory of executable fast checks; see docs/node-tests.md for helpers/tools.
export const nodeChecks = [
    ['../tests/e2e/finger-stepped.node.ts'],
    // Start the longest replays first so neither worker leaves a long serial tail.
    ...['derapage', 'character-games-2', 'orbite', 'essaim', 'ferraille',
        'caisses', 'briqueterie', 'character-scenes-2', 'characters',
        'character-finger-4', 'character-games-4', 'character-games', 'character-scenes', 'character-games-3', 'character-scenes-3', 'character-finger-3', 'empilo', 'alunir', 'arcade-art', 'bubble',
        'character-snake-policy', 'finger', 'action-art', 'action-scenes', 'level-catalogue', 'dedale', 'pass76', 'regressions', 'serpentin', 'traverse', 'pepites']
        .map(name => [`validate-${name}.js`, '--checks-only']),
    ['validate-ferraille-levels.js', '--checks-only'],
    ['validate-collier.js'],
    ['validate-gourmandises.js'],
    ['check-derapage-3d.js'],
    ['check-derapage-cadence.js'],
    ['check-level-catalogue-kart.js'],
    ['validate-marmaille.js'],
    ['validate-bombercade.js'],
    ['check-essaim-art.js'],
    ['check-essaim-signature-art.js'],
    ['check-essaim-geometry.js'],
    ['validate-essaim-signature.js'],
    ['check-essaim-signature-mutations.js'],
    ['check-pwa-mutations.js'],
    ['test-dedale.js'],
    ['test-pwa.js'],
    ['measure-thumbnails.js'],
    // bubble-input-check and validate-derapage-historical are imported above.
    // Dérapage mutation audits are explicit offline commands.
    ['validate-artificiers.js'],
];
