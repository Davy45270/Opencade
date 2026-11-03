/* global console */
import './ts-loader.js';
const { measureAccuracy } = await import('../tests/artificiers-accuracy.ts');
// Full live search: eight seeds per map, stationary 100 HP, twelve attempts.
console.log(JSON.stringify(Array.from({ length: 30 }, (_, level) => measureAccuracy(level)), null, 2));
