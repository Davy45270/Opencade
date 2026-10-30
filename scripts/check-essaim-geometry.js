/* global console */
import './ts-loader.js';
import assert from 'node:assert/strict';
const { ENEMY_HULLS, PLAYER_ART_SIZE, PREVIOUS_PLAYER_ART_SIZE, decorTheme } = await import('../src/games/essaim/geometry.ts');
// Rasterize actual renderer contours. Colours and vertex counts cannot satisfy this check.
const footprints = Object.values(ENEMY_HULLS).map(points => {
    let footprint = '';
    for (let y = -30; y <= 30; y++) for (let x = -30; x <= 30; x++) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const a = points[i], b = points[j];
            if ((a[1] > y) !== (b[1] > y) && x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside = !inside;
        }
        footprint += inside ? '1' : '0';
    }
    return footprint;
});
assert.equal(footprints.length, 7); assert.equal(new Set(footprints).size, 7);
for (let i = 0; i < 7; i++) for (let j = i+1; j < 7; j++) {
    const difference = [...footprints[i]].filter((pixel,k)=>pixel!==footprints[j][k]).length;
    assert(difference >= 100, `silhouettes ${i}/${j} too similar: ${difference}`);
}
assert(PLAYER_ART_SIZE / PREVIOUS_PLAYER_ART_SIZE >= 1.4);
assert.deepEqual([6,8,14].map(decorTheme),['G01','G02','G03']);
assert.equal(new Set(Array.from({length:30},(_,i)=>decorTheme(i))).size,3);
console.log('Essaim: 7 distinct raster footprints, 84/58 scale, 3 catalogue themes: OK');
