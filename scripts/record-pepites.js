/* global console, process, performance, structuredClone */
// Offline calibration of the thirty mines: one winning route per mine, recorded turn by turn
// from the live finger policy (tests/e2e/pepites-policy.ts). Fast checks replay it.
// Resumable: mines already in the fixture are kept; pass mine numbers to redo them.
import './ts-loader.js';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
const { Engine, MINES } = await import('../src/engines/pepites/engine.ts');
const { pepitesStep } = await import('../tests/e2e/pepites-policy.ts');
const path = 'tests/fixtures/pepites-campaign.json';
const redo = process.argv.slice(2).map(Number).filter(Boolean);
const routes = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')).pepites : [];
for (let level = 0; level < MINES.length; level++) {
    if (routes[level] && !redo.includes(level + 1)) continue;
    const start = performance.now(), max = Math.floor(MINES[level].seconds * 60 / MINES[level].turnFrames);
    const e = new Engine(level), route = [];
    while (e.status === 'playing' && route.length < max) { const d = pepitesStep(level, structuredClone(e.state)); route.push(d ?? 'wait'); if (d) e.input(d); e.turn(); }
    assert.equal(e.status, 'won', `mine ${level + 1}`); routes[level] = route;
    writeFileSync(path, JSON.stringify({ pepites: routes }) + '\n');
    console.log(level + 1, MINES[level].name, `${route.length}/${max} tours`, `${Math.round(performance.now() - start)} ms`);
}
