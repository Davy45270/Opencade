/* global console */
import './ts-loader.js';
const { checkArtPool, checkArtTextures } = await import('../tests/essaim-art-checks.ts');
checkArtPool(); checkArtTextures();
console.log('Essaim art: 2000 demo steps, pool <= 96 (saturated), reduced <= 4, stable particle identities; two textures generated once: OK');
