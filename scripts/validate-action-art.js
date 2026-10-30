/* global console, performance */
import './ts-loader.js';
const { drawings, atlas } = await import('../tests/action-art-checks.ts');
for (const [name, run] of [['drawings', drawings], ['atlas', atlas]]) {
    const start = performance.now(); run(); const ms = performance.now() - start;
    console.log(`${name}: OK (${ms.toFixed(1)} ms)`);
}
