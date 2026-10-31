/* global console, performance */
import './ts-loader.js';
const { vehicles, launchersAndBubbles, boundedTextures, vehicleSignature, vehicleSignaturesDistinct, ordinaryScenery } = await import('../tests/arcade-art-checks.ts');
for (const [name, check] of [['vehicles', vehicles], ['launchers-bubbles', launchersAndBubbles], ['bounded-textures', boundedTextures]]) {
    const start = performance.now(); check(); const ms = performance.now() - start;
    console.log(`${name}: OK (${Math.ceil(ms)} ms)`);
}

for (const id of ['panda','pandaroux','dragon','singe','licorne']) { vehicleSignature(id); console.log(`vehicle signature ${id}: OK`); }
vehicleSignaturesDistinct(); ordinaryScenery();
