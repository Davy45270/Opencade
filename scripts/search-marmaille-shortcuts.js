/* global console, process */
// Searches for a winning plan WITHOUT one offered role: parachute and climber given to every kid as it appears,
// then one work role to kid 0 or 1 at any tick, or two work roles to kid 0 at any pair of (odd) ticks.
// Any win is a shortcut that makes the removed role useless. Slow (minutes per level): run by hand, not in test:node.
// Usage: node scripts/search-marmaille-shortcuts.js [level numbers, e.g. 14,25,30]
import './ts-loader.js';
const { Engine, ROLES } = await import('../src/engines/marmaille/engine.ts');
const { LEVELS } = await import('../src/engines/marmaille/levels.ts');
const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
function play(level, attrs, plan) { // plan: [[tick, kid, role]]
    const e = new Engine(level);
    while (e.status === 'playing' && e.tick < 2000) {
        e.update();
        for (const k of e.kids) for (const a of attrs) if (!(a === 'float' ? k.float : k.climber)) e.assign(k.id, a);
        for (const [t, kid, r] of plan) if (t === e.tick) e.assign(kid, r);
    }
    return e;
}
let found = 0;
for (let level = 0; level < LEVELS.length; level++) {
    if (only && !only.includes(level + 1)) continue;
    const def = LEVELS[level], offered = ROLES.filter(r => (def.roles[r] ?? 0) > 0), T = def.seconds * 8;
    for (const removed of offered) {
        const rest = offered.filter(r => r !== removed), attrs = rest.filter(r => r === 'float' || r === 'climb'), work = rest.filter(r => r !== 'float' && r !== 'climb');
        const base = play(level, attrs, []); const end = Math.min(T, base.tick + 60);
        let win = null;
        if (base.status === 'won') win = 'no work role';
                for (const kid of [0, 1]) for (const r of work) for (let t = 1; t <= end && !win; t++) { const e = play(level, attrs, [[t, kid, r]]); if (e.status === 'won') win = JSON.stringify([[t, kid, r]]); }
        // Pairs: two roles to kid 0 (the same role twice only when the stock allows it), every other tick.
        for (const r1 of work) for (const r2 of work) {
            if (win) break; if (r1 === r2 && (def.roles[r1] ?? 0) < 2) continue;
            for (let t1 = 1; t1 <= end && !win; t1 += 2) for (let t2 = t1 + 2; t2 <= end && !win; t2 += 2) { const e = play(level, attrs, [[t1, 0, r1], [t2, 0, r2]]); if (e.status === 'won') win = JSON.stringify([[t1, 0, r1], [t2, 0, r2]]); }
        }
        if (win) { found += 1; console.log(`M${String(level + 1)} won WITHOUT ${removed}: ${win}`); }
    }
}
console.log(`shortcuts found: ${String(found)}`); if (found) process.exitCode = 1;
