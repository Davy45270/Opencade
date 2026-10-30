/* global console, structuredClone */
// Pépites: every mine is won by its recorded route through ordinary turns (clock-free: turn budget only),
// and the live finger policy wins mines 1 and 3 at a human 150 ms latency.
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { Engine, MINES } = await import('../src/engines/pepites/engine.ts');
const { pepitesStep } = await import('../tests/e2e/pepites-policy.ts');
const { cases } = await import('../tests/pepites-cases.ts');
const routes = JSON.parse(readFileSync('tests/fixtures/pepites-campaign.json', 'utf8')).pepites;
for (const [name, run] of Object.entries(cases)) { run(); console.log('ok', name.slice(0, 50)); }
assert.equal(routes.length, MINES.length, 'une route par mine');
for (const [level, route] of routes.entries()) {
    const e = new Engine(level), max = Math.floor(MINES[level].seconds * 60 / MINES[level].turnFrames);
    for (const m of route) { if (m === 'prop') assert(e.special()); else if (m !== 'wait') e.input(m); e.turn(); }
    assert.equal(e.status, 'won', `mine ${level + 1}`); assert(route.length <= max, `mine ${level + 1} : ${route.length} tours > ${max}`);
    console.log(`mine ${level + 1} gagnée en ${route.length} tours (budget ${max}), ${e.state.nuggets}/${MINES[level].goal} pépites`);
}
// Finger policy with the real clock: decide from what was seen 150 ms ago, one tap per decision.
for (const level of [0, 2]) {
    const e = new Engine(level); let ms = 0;
    while (e.status === 'playing' && ms < 170000) {
        const seen = structuredClone(e.state); e.advance(150); ms += 150;
        const d = pepitesStep(level, seen); if (d) { e.input(d); e.hold(null); }
    }
    assert.equal(e.status, 'won', `doigt mine ${level + 1} (${e.reason})`);
    console.log(`doigt mine ${level + 1} : gagnée en ${(ms / 1000).toFixed(1)} s simulées`);
}
