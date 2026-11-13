/* global console, process */
// node --import ./scripts/ts-loader.js scripts/validate-busfolie-campaign.js [--receipt=<file>]
// Bus en folie, campaign 2 (levels 31-60): the committed generation receipt agrees with the frozen levels, and every
// claim it makes is measured again here. Levels 1-30 keep their hash; each level of the campaign has the receipt's
// board hash, seed and generator version; the generator rebuilds the start board of its seed (same hash); the
// node-bounded solver finds a line of `par` moves with the same node count as recorded (a verdict that does not depend
// on the machine) and the real engine replays it to a win; the exhaustive analysis gives the frozen par, difficulty
// and trap; the trap is a proven dead end that the engine reports as "Bloqué"; no level of 1-60 is easier than the one
// five ranks before; campaign 2 has no clone and no more than five levels in a row without novelty.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Engine, LEVELS } from '../src/engines/busfolie/engine.ts';
import { GENERATOR_VERSION, generateLevel } from '../src/engines/busfolie/generator.ts';
import { initialState, validateLevel } from '../src/engines/busfolie/rules.ts';
import { analyse, difficulty, solve } from '../src/engines/busfolie/solver.ts';
import { SLOTS } from '../src/engines/busfolie/slots.ts';
import { DATA } from '../src/engines/busfolie/data.ts';
import { TIPS } from '../src/engines/busfolie/levels.ts';
import { CAMPAIGN, FROZEN_BEFORE, boardHash, entryHash, frozenHash } from './game/busfolie.js';
import { MAX_STATES } from './search-busfolie.js';
import { busfolieDiversity } from './busfolie-diversity.js';

const file = process.argv.find(a => a.startsWith('--receipt='))?.slice(10) ?? 'src/engines/busfolie/campaigns/campaign-2.receipt.json';
const receipt = JSON.parse(readFileSync(file, 'utf8'));
const play = (e, text) => { const [id, how] = text.split(' '); return e.move(id, how.startsWith('f') ? 'forward' : 'backward', Number(how.slice(1))); };
assert.equal(receipt.receiptVersion, 1); assert.equal(receipt.gameId, 'busfolie'); assert.equal(receipt.campaignId, CAMPAIGN.id);
assert.equal(receipt.generatorVersion, GENERATOR_VERSION, 'version du générateur');
assert.equal(receipt.maxStates, MAX_STATES);
// Levels 1-30 unchanged: same hash as when the campaign was generated.
assert.equal(receipt.frozenBefore.levels, FROZEN_BEFORE); assert.equal(frozenHash(), receipt.frozenBefore.hash, 'niveaux 1-30 modifiés');
assert.equal(LEVELS.length, CAMPAIGN.last); assert.equal(SLOTS.length, CAMPAIGN.last); assert.equal(TIPS.length, CAMPAIGN.last);
assert.deepEqual(receipt.receipts.map(r => r.slot), Array.from({ length: CAMPAIGN.last - CAMPAIGN.first + 1 }, (_, k) => CAMPAIGN.first + k));
console.log('| Niveau | Graine | Coups | Nœuds | États | Difficulté | Cible | Piège | Empreinte |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
const hashes = new Set(DATA.slice(0, FROZEN_BEFORE).map(entryHash));
let nodes = 0;
for (const r of receipt.receipts) {
    const i = r.slot - 1, level = LEVELS[i], entry = DATA[i], tag = `niveau ${r.slot}`;
    assert.equal(r.status, 'selected', tag); assert.equal(r.solving.verdict, 'solved', tag);
    assert.equal(r.name, SLOTS[i].name, tag);
    assert.equal(entryHash(entry), r.levelHash, `${tag} : empreinte du plateau`); assert.equal(boardHash(level), r.levelHash, `${tag} : empreinte relue`);
    assert(!hashes.has(r.levelHash), `${tag} : doublon`); hashes.add(r.levelHash);
    assert.equal(entry.seed, r.provenance.seed, `${tag} : graine`); assert.equal(r.provenance.generatorVersion, GENERATOR_VERSION);
    assert.deepEqual(r.provenance.profile.template, SLOTS[i].template, `${tag} : gabarit`);
    // The generator rebuilds the start board of the search from the seed alone.
    const start = generateLevel(SLOTS[i].template, r.provenance.seed, `BUS-${String(r.slot).padStart(3, '0')}`);
    assert(start, `${tag} : graine sans plateau`); assert.equal(boardHash(start), r.provenance.search.startHash, `${tag} : plateau de départ de la graine`);
    assert.deepEqual(validateLevel(level), [], tag);
    // Node-bounded solver: same verdict, same line, same node count as on the machine that generated the receipt.
    const s = solve(level, initialState(level), r.solving.budget);
    assert.equal(s.status, 'solved', tag); assert.equal(s.exploredNodes, r.solving.used, `${tag} : nœuds explorés`);
    assert.deepEqual(s.actions.map(m => `${m.busId} ${m.direction === 'forward' ? 'f' : 'b'}${m.distance}`), r.solving.line, `${tag} : ligne du solveur`);
    nodes += s.exploredNodes;
    const e = new Engine(); e.loadLevel(i);
    for (const m of s.actions) assert(e.move(m.busId, m.direction, m.distance), `${tag} : rejeu`);
    assert.equal(e.status, 'won', `${tag} : victoire du rejeu`); assert.equal(e.state.moves, level.par);
    // Exhaustive analysis: the frozen measures.
    const a = analyse(level, initialState(level), MAX_STATES);
    assert.equal(a.status, 'solved', tag); assert.equal(a.optimal, level.par, `${tag} : par`); assert.equal(a.optimal, r.metrics.par);
    assert.equal(difficulty(a), level.difficulty, `${tag} : difficulté`); assert.equal(level.difficulty, r.metrics.difficulty);
    assert.equal(a.states, r.metrics.states, `${tag} : états`);
    assert.equal(level.solution, r.metrics.solution.join(', '), `${tag} : ligne figée`);
    const f = new Engine(); f.loadLevel(i);
    for (const m of level.solution.split(', ')) assert(play(f, m), `${tag} : ${m}`);
    assert.equal(f.status, 'won'); assert.equal(f.stars, 3);
    // The trap: a proven dead end, shown by the engine.
    assert(level.trap, `${tag} : piège`); assert.deepEqual(level.trap, r.metrics.trap);
    const d = new Engine(); d.loadLevel(i);
    for (const m of level.solution.split(', ').slice(0, level.trap.at)) assert(play(d, m));
    assert(play(d, level.trap.move), `${tag} : coup piège`);
    assert.equal(solve(level, { ...d.state, status: 'playing' }, { nodes: 200000 }).status, 'unsolvable', `${tag} : impasse prouvée`);
    d.checkBlocked(); assert.equal(d.status, 'blocked', `${tag} : « Bloqué »`);
    console.log(`| ${r.slot} ${level.name} | ${r.provenance.seed} | ${level.par} | ${s.exploredNodes} | ${a.states} | ${level.difficulty} | ${r.metrics.target} | ${level.trap.at} + ${level.trap.move} | ${r.levelHash.slice(0, 12)} |`);
}
const scores = LEVELS.map(l => l.difficulty);
for (let i = 5; i < scores.length; i++) assert(scores[i] >= scores[i - 5], `niveau ${i + 1} plus facile que le ${i - 4}`);
const indices = Array.from({ length: CAMPAIGN.last - CAMPAIGN.first + 1 }, (_, k) => CAMPAIGN.first - 1 + k), report = busfolieDiversity(LEVELS, indices);
assert(report.cloneShare === 0, `clones ${report.cloneShare}`);
assert(report.maxGapWithoutNovelty <= 5, `écart sans nouveauté ${report.maxGapWithoutNovelty} > 5`);
console.log(`Campagne 2 : ${receipt.receipts.length} niveaux vérifiés · difficulté ${scores[CAMPAIGN.first - 1]} → ${scores.at(-1)} · ${nodes} nœuds · nouveautés ${report.noveltyLevels.map(n => n + CAMPAIGN.first - 1).join(' ')} · diversité ${report.score} (clones ${report.cloneShare}, écart ${report.maxGapWithoutNovelty}) · niveaux 1-30 inchangés`);
