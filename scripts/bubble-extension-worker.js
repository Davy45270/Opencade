// Calibration attempts of extension levels with overridden parameters (see bubble-extension-calibrate.js).
// Messages: { index, colors, rows, interval, shape, motif, full } → { won, shots, sequence, method }.
import './ts-loader.js';
import { parentPort } from 'node:worker_threads';
const { LEVELS, EXTENSION_START, generateLevel } = await import('../src/engines/bubble/levels.ts');
const { EXTENSION } = await import('../src/engines/bubble/extension.ts');
const { greedyLevel, solveLevel } = await import('./bubble-solver.ts');
parentPort.on('message', ({ index, colors, rows, interval, shape, motif, full }) => {
    const level = LEVELS[index], i = index - EXTENSION_START, row = EXTENSION[i];
    Object.assign(level, { colors, rows, interval });
    EXTENSION[i] = [row[0], colors, rows, interval, shape, motif];
    // A variant whose shape cuts off a listed mechanic is not a candidate.
    const kinds = new Set(generateLevel(index, level.seed).map(c => c.kind));
    if ((level.mechanics ?? []).some(m => !['rainbow', 'bumper'].includes(m) && !kinds.has(m))) { parentPort.postMessage({ won: false, invalid: true }); return; }
    const quick = greedyLevel(index, level.seed, 160);
    const result = quick.won || !full ? quick : solveLevel(index, level.seed, 160);
    parentPort.postMessage({ won: result.won, shots: result.shots, sequence: result.sequence, method: quick.won ? 'glouton' : 'faisceau' });
});
parentPort.postMessage({ ready: true });
