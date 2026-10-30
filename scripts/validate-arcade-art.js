/* global console, performance */
import './ts-loader.js';
const { vehicles, launchersAndBubbles, boundedTextures } = await import('../tests/arcade-art-checks.ts');
for (const [name, check] of [['vehicles', vehicles], ['launchers-bubbles', launchersAndBubbles], ['bounded-textures', boundedTextures]]) {
    const start = performance.now(); check(); const ms = performance.now() - start;
    console.log(`${name}: OK (${Math.ceil(ms)} ms)`);
}
