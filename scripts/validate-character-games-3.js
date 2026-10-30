/* global console, performance, process */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { mutationModule } from './mutation-module.js';
const checks = await import('../tests/character-games-3-checks.ts');
const { rendered } = await import('../tests/character-games-checks.ts');
const { Engine: Maze } = await import('../src/engines/dedale/engine.ts');
const { Engine: Orbit } = await import('../src/engines/orbite/engine.ts');
const { Engine: Stack } = await import('../src/engines/empilo/engine.ts');
const { solutions } = await import('../tests/dedale-solutions.ts');
const { recordings } = await import('../tests/orbite-solutions.ts');
const { verifiedReplay, replay } = await import('./orbite-verified-replay.js');
// Pass 402: the Empilo strata changed; their witnesses live in their own fixture.
const fixtures = { ...JSON.parse(readFileSync('tests/fixtures/characters-campaigns-3.json', 'utf8')), ...JSON.parse(readFileSync('tests/fixtures/empilo-campaign.json', 'utf8')) };
globalThis.matchMedia = () => ({ matches: false });
const timings = [], mutations = [], records = { dedale: [], orbite: [], empilo: [] };
// `clockFree` is kept for callers; no check asserts wall-clock time any more, durations are only reported.
function run(name, check, clockFree = false) { void clockFree; const started = performance.now(); check(); const ms = performance.now() - started; timings.push({ name, ms: Math.round(ms) }); }
for (const [game, Engine] of [['dedale', Maze], ['orbite', Orbit], ['empilo', Stack]]) {
    run(`P-${game}-01`, rendered);
    run(`P-${game}-02/03`, checks[`${game}Effect`]);
    run(`P-${game}-05`, () => checks.balance(Engine));
    run(`P-${game}-03 partition`, () => { const a = new Engine(), b = new Engine(); assert(a.special()); assert(b.special()); if (game === 'orbite') { a.holdFire(true); b.holdFire(true); } a.advance(500); b.advance(150); b.advance(350); assert.deepEqual(a.snapshot(), b.snapshot()); });
}
run('P-orbite-02 sustained cadence', checks.orbiteCadence);
run('P-dedale-02 keys and nearest portal', checks.dedaleNavigation);
run('P-empilo-02 decisive reserve', checks.reserveOutcome);
for (const record of solutions) run(`P-dedale-04 L${record.level}`, () => {
    const modes = [];
    for (const special of [false, true]) {
        const e = new Maze(record.level - 1, record.seed); if (special) assert(e.special());
        for (const d of record.inputs) { e.input(d); e.advance(1000 / 6); }
        assert.equal(e.status, 'won'); assert.equal(e.state.lives, record.lives);
        modes.push({ score: e.state.score, moves: record.inputs.length, lives: e.state.lives });
    }
    assert.deepEqual(modes[0], modes[1]); records.dedale.push({ level: record.level, without: modes[0], with: modes[1] });
});
for (const record of recordings.filter(r => r.seed === 28)) {
    let ordinary;
    run(`P-orbite-04 L${record.level + 1} original hash`, () => { ordinary = verifiedReplay(record).final; });
    const proof = fixtures.orbite[record.level], e = new Orbit(proof.level, proof.seed); assert(e.special()); e.holdFire(true);
    run(`P-orbite-04 L${record.level + 1} burst`, () => {
        for (const [target, frames] of proof.commands) { e.moveTo(target); e.advance(frames * 1000 / 60); }
        assert.equal(e.status, 'won'); assert.equal(e.state.score, proof.score); assert.equal(e.state.ticks, proof.ticks);
    });
    records.orbite.push({ level: record.level + 1, without: { score: ordinary.score, ticks: ordinary.ticks }, with: { score: e.state.score, ticks: e.state.ticks } });
}
for (const record of fixtures.empilo) run(`P-empilo-04 L${record.level + 1}`, () => {
    const results = [];
    for (const [mode, proof] of record.modes.entries()) {
        const e = new Stack(record.level, record.seed);
        // 'wait' = 1.5 s of simulated gravity and countdown (timed strata, pass 402).
        for (const action of proof.inputs) { if (action === 'wait') e.step(1500); else assert(e.input(action)); }
        assert.equal(e.status, 'won'); assert.equal(e.state.score, proof.score); assert.equal(e.state.lines, proof.lines); assert.equal(e.state.gems, proof.gems);
        assert.equal(proof.inputs.includes('special'), mode === 1);
        results.push({ score: e.state.score, lines: e.state.lines, inputs: proof.inputs.length });
    }
    // Timed strata: both witnesses play under the real countdown, 1.5 s per piece.
    if (new Stack(record.level).state.timeLeft) for (const proof of record.modes) assert.equal(proof.inputs.filter(a => a === 'wait').length, proof.pieces, `P-empilo-04 L${record.level + 1} paced`);
    // Deterministic work bound instead of wall time: at most 2 000 recorded inputs per mode.
    for (const proof of record.modes) assert(proof.inputs.length <= 2000, `P-empilo-04 L${record.level + 1} input budget`);
    records.empilo.push({ level: record.level + 1, seed: record.seed, without: results[0], with: results[1] });
}, true);
for (const [game, before, after] of [
    ['dedale', 'this.lightPath = [initial.pos, ...legs.reverse().flat()];', 'this.lightPath = [];'],
    ['orbite', 'this.specialTicks = 90;', 'this.specialTicks = 0;'],
    ['orbite', 'this.specialTicks = 90;', 'this.specialTicks = 89;'],
    ['empilo', 'this.state.active = this.piece(incoming);', 'this.state.active = this.piece(outgoing);'],
    ...['dedale', 'orbite', 'empilo'].map(game => [game, 'this.specialUses === 0', 'this.specialUses < 0']),
]) {
    const file = `src/engines/${game}/engine.ts`, source = readFileSync(file, 'utf8');
    const { module } = await mutationModule('../' + file, before, after);
    run(`mutation ${game}: ${before}`, () => assert.throws(() => checks[`${game}Effect`](module.Engine)));
    mutations.push({ game, file, line: source.slice(0, source.indexOf(before)).split('\n').length, mutation: before, killed: true });
}
{
    const file = 'src/engines/orbite/engine.ts';
    const { module } = await mutationModule('../' + file,
        'Math.min(0, s.cooldown) + Math.ceil(180 / TICK) * TICK / 2', '90');
    run('mutation rounded burst cadence', () => assert.throws(() => checks.orbiteCadence(module.Engine)));
    mutations.push({ game: 'orbite', file, mutation: 'rounded burst cadence', killed: true });
}
{
    const record = recordings.find(r => r.level === 0 && r.seed === 28);
    const { module } = await mutationModule('../src/engines/orbite/engine.ts', ': 180; this.events.push', ': 1800; this.events.push');
    run('verified replay never reuses a proof for a mutant', () => {
        assert.equal(verifiedReplay(record).result.signature, record.signature);
        assert.throws(() => replay(record, module.Engine));
    });
}
{
    const file = 'src/characters/game.ts', source = readFileSync(file, 'utf8'), before = 'readonly id: CharacterId = selectedCharacter();';
    const { module } = await mutationModule('../' + file, before, "readonly id: CharacterId = 'panda';");
    run('mutation default identity', () => assert.throws(() => rendered(module.GameCharacter)));
    mutations.push({ game: 'all', file, line: source.slice(0, source.indexOf(before)).split('\n').length, mutation: 'always panda', killed: true });
}
assert.equal(records.dedale.length, 30); assert.equal(records.orbite.length, 30); assert.equal(records.empilo.length, 30);
if (!process.argv.includes('--checks-only')) writeFileSync('docs/characters-games-3-validation.json', JSON.stringify({ pass: 83, timings, mutations, records }, null, 2) + '\n');
console.log(`Pass 83: ${timings.length} checks, 180 victories, ${mutations.length} killed mutations`);
if (process.argv.includes('--timings')) console.log(JSON.stringify(timings));
