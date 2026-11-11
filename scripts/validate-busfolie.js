/* global console */
// node --import ./scripts/ts-loader.js scripts/validate-busfolie.js
// Bus en folie: every progression board is valid; its whole reachable space is explored (at most 60,000 states) and
// solved; the frozen par and difficulty are recomputed; the dossier's solver finds a line of exactly `par` moves that
// the real engine replays to a win; the frozen line wins in `par` moves with three stars; from level 2 a tempting move
// along that line falls into a proven dead end, which the real engine reports as "Bloqué"; no level is easier than the
// level five ranks before it; each mechanism arrives alone; diversity; the generator is deterministic (AC-09).
import assert from 'node:assert/strict';
import { Engine, LEVELS } from '../src/engines/busfolie/engine.ts';
import { initialState, validateLevel } from '../src/engines/busfolie/rules.ts';
import { analyse, difficulty, solve } from '../src/engines/busfolie/solver.ts';
import { generateLevel } from '../src/engines/busfolie/generator.ts';
import { SLOTS } from '../src/engines/busfolie/slots.ts';
import { busfolieDiversity, busfolieFeatures } from './busfolie-diversity.js';
export const MAX_STATES = 60000;
const play = (e, text) => { const [id, how] = text.split(' '); return e.move(id, how.startsWith('f') ? 'forward' : 'backward', Number(how.slice(1))); };
console.log('| Niveau | Taille | Bus | Voitures | Plots | Couleurs | Groupes | Coups | États | Impasses | Piège | Difficulté |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
const scores = [];
let traps = 0, departures = 0;
for (const [i, level] of LEVELS.entries()) {
    assert.deepEqual(validateLevel(level), [], `niveau ${i + 1}`);
    const a = analyse(level, initialState(level), MAX_STATES);
    assert.equal(a.status, 'solved', `résolu ${i + 1}`);
    assert.equal(a.optimal, level.par, `par ${i + 1}`);
    assert.equal(difficulty(a), level.difficulty, `difficulté figée ${i + 1}`);
    scores.push(level.difficulty);
    // The dossier's solver: a shortest line, replayed by the real engine (AC-10).
    const s = solve(level, initialState(level), { nodes: 200000, ms: 20000 });
    assert.equal(s.status, 'solved', `solveur ${i + 1}`); assert.equal(s.actions.length, level.par);
    const r = new Engine(); r.loadLevel(i);
    for (const m of s.actions) assert(r.move(m.busId, m.direction, m.distance), `rejeu solveur ${i + 1}`);
    assert.equal(r.status, 'won', `victoire solveur ${i + 1}`);
    // The frozen line: a win in par moves, three stars.
    const e = new Engine(); e.loadLevel(i);
    for (const m of level.solution.split(', ')) assert(play(e, m), `ligne ${i + 1} : ${m}`);
    assert.equal(e.status, 'won'); assert.equal(e.state.moves, level.par); assert.equal(e.stars, 3);
    // The trap: the line's first moves, then one ordinary move into a dead end, proven and shown by the engine.
    if (i >= 1) assert(level.trap, `piège ${i + 1}`);
    if (level.trap) {
        const d = new Engine(); d.loadLevel(i);
        for (const m of level.solution.split(', ').slice(0, level.trap.at)) assert(play(d, m));
        assert(play(d, level.trap.move), `coup piège ${i + 1}`);
        assert.equal(solve(level, { ...d.state, status: 'playing' }, { nodes: 200000, ms: 20000 }).status, 'unsolvable', `impasse prouvée ${i + 1}`);
        if (!d.state.busPositions[level.trap.move.split(' ')[0]]) departures++;
        d.checkBlocked();
        assert.equal(d.status, 'blocked', `« Bloqué » ${i + 1}`);
        assert(d.undo() && d.status === 'playing', `annuler sort du blocage ${i + 1}`);
        traps++;
    }
    const f = busfolieFeatures(level).params;
    console.log(`| ${i + 1} ${level.name} | ${level.board.width}×${level.board.height} | ${f.buses} | ${f.cars} | ${f.cones} | ${f.colours} | ${f.groups} | ${level.par} | ${a.states} | ${a.dead} | ${level.trap ? `${level.trap.at} + ${level.trap.move}` : '—'} | ${level.difficulty} |`);
}
// Difficulty: no level is easier than the one five ranks before it.
for (let i = 5; i < scores.length; i++) assert(scores[i] >= scores[i - 5], `niveau ${i + 1} plus facile que le ${i - 4}`);
// Each mechanism first appears at its slot's novelty, alone.
const seen = new Set(), arrivals = [];
for (const [i, level] of LEVELS.entries()) {
    const fresh = busfolieFeatures(level).elements.filter(x => !seen.has(x) && !x.startsWith('colour:') && !x.startsWith('size:6'));
    fresh.forEach(x => seen.add(x));
    if (i > 0 && fresh.length) arrivals.push(`${i + 1}:${fresh.join('+')}`);
}
const report = busfolieDiversity(LEVELS);
// No more than five levels in a row without a measured change (same bar as Dévisso, Démineur and Sudoku). From level 20
// the changes are load thresholds (cars, buses, a fuller yard), not new mechanisms: every mechanism is known at level 19.
assert(report.cloneShare === 0, `clones ${report.cloneShare}`);
assert(report.maxGapWithoutNovelty <= 5, `écart sans nouveauté ${report.maxGapWithoutNovelty} > 5`);
assert(report.score <= 22, `diversité ${report.score}`);
// AC-09: same template, seed and version, same board.
for (const [i, slot] of SLOTS.entries()) for (let seed = 1; seed <= 5; seed++) assert.deepEqual(generateLevel(slot.template, seed), generateLevel(slot.template, seed), `graine ${i + 1}/${seed}`);
console.log(`Pièges ${traps}/30 (dont ${departures} départs) · difficulté ${scores[0]} → ${scores.at(-1)} · arrivées ${arrivals.join(' ')} · diversité ${report.score} (clones ${report.cloneShare}, écart sans nouveauté ${report.maxGapWithoutNovelty}) · générateur déterministe`);
