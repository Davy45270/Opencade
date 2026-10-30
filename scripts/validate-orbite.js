/* global console, process, URL */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { availableParallelism } from 'node:os';
import { mutationModule } from './mutation-module.js';
import { statistics } from './orbite-statistics.js';
import { attempt, recordOrbite } from './record-orbite.js';
import { orbiteDiversity, verifyOrbiteDiversity } from './orbite-diversity.js';
const fresh = process.argv.includes('--record') ? recordOrbite() : null;
const { recordings } = await import('../tests/orbite-solutions.ts');
// O-FLEET (voie E): chapter fleet sizes, with its two mutations rejected.
const { orbiteFleet } = await import('../tests/variety-e.ts');
orbiteFleet();
for (const [name, before, after] of [['fleet never widens', 'const columns = level < 3 ? 5 : level < 19 || level === 21 ? 6 : 7;', 'const columns = 6;'],
    ['fleet never deepens', "return { rows: s.rest ? 2 : level < 9 ? 3 : 4, columns };", "return { rows: s.rest ? 2 : 3, columns };"],
    ['final transposed', 'level === 29 ? { rows: 4, columns: 5 }', 'level === 29 ? { rows: 5, columns: 4 }'],
    ['guardians transposed', ': { rows: 3, columns: 4 };', ': { rows: 4, columns: 3 };']]) {
    const { module } = await mutationModule('../src/engines/orbite/engine.ts', before, after);
    assert.throws(() => orbiteFleet(module.Engine), name);
}
const { Engine } = await import('../src/engines/orbite/engine.ts');
const { replay } = await import('./orbite-verified-replay.js');
const { behaviors } = await import('../tests/orbite-behavior.ts');
assert.equal(recordings.length, 60);
const campaigns = [];
for (const [i, r] of recordings.entries()) {
    if (!process.argv.includes('--checks-only')) {
        const generated = fresh?.[i] ?? attempt(Engine, r.level, r.seed);
        assert.deepEqual(generated, r, `Fresh campaign differs: ${r.level+1}/${r.seed}`);
    }
    campaigns.push({ level: r.level+1, seed: r.seed, frames: r.frames, witnesses: r.witnesses });
}
const cometAudit = statistics();
const diversity = orbiteDiversity(Engine, recordings); verifyOrbiteDiversity(diversity);
const file = 'src/engines/orbite/engine.ts', source = readFileSync(file, 'utf8'), mutations = [];
for (const [name, id, before, after] of [
    ['contacts resolved in reverse time', 'O-MEC-07', 'contacts.sort((a, b) => a.time - b.time || a.order - b.order);', 'contacts.sort((a, b) => b.time - a.time || a.order - b.order);'],
    ['final spacing omits a special probe kind', 'O-FINAL', 'const spacing = Math.min(4, Math.floor(rows * columns / Math.max(1, kinds.length)));', 'const spacing = 8;'],
    ['rotor always open', 'O-MEC-01', "p.kind === 'rotor' &&", 'false &&'],
    ['no split', 'O-MEC-02', "if (p.kind === 'split')", "if (p.kind === 'fragment')"],
    ['no asteroid deflection', 'O-MEC-03', 'shot.vx = shot.x < rock.x ? -110 : 110;', 'shot.vx = 0;'],
    ['gravity saturation x10', 'O-MEC-04', 'Math.max(-90, Math.min(90,', 'Math.max(-900, Math.min(900,'],
    ['fragments without vertical offset', 'O-MEC-02', 'y: p.y - 8, hp: 1, maxHp: 1', 'y: p.y, hp: 1, maxHp: 1'],
    ['satellite bonus ignores hp', 'O-MEC-07', 's.score += s.satellite.hp * 100 * (this.level + 1);', 's.score += 100 * (this.level + 1);'],
    ['boss phase two without aim', 'O-BOSS', 'boss.phase === 2 ? [-90, aimed, 90] : [-65, 0, 65]', 'boss.phase === 2 ? [-90, 0, 90] : [-65, 0, 65]'],
    ['boss phase two slow cadence', 'O-BOSS', 'boss.phase === 2 ? 72 : 120', 'boss.phase === 2 ? 120 : 120'],
    ['no gravity', 'O-MEC-04', '(well.x - shot.x) * 0.012', '(well.x - shot.x) * 0'],
    ['stealth always visible', 'O-MEC-05', "p.kind !== 'stealth'", 'true'],
    ['no healing', 'O-MEC-06', 'target.hp++;', 'target.hp += 0;'],
    ['ally invulnerable', 'O-MEC-07', 'satellite.hp--;', 'satellite.hp -= 0;'],
    ['no swarm curves', 'O-MEC-08', 'if (s.swarm)', 'if (false)'],
    ['no second boss phase', 'O-BOSS', 'boss.phase = 2;', 'boss.phase = 1;'],
    ['core always vulnerable', 'O-BOSS', 's.probes.length || !this.bossOpen()', 'false'],
]) {
    const { module } = await mutationModule('../' + file, before, after);
    const oracle = Object.entries(behaviors).find(([key]) => key.startsWith(id))[1];
    assert.throws(() => oracle(module.Engine), name);
    mutations.push({ name, oracle: id, file, line: source.slice(0, source.indexOf(before)).split('\n').length, rejected: true });
}
const campaignFile = 'src/engines/orbite/campaign.ts';
const finalKit = "['rotor', 'split', 'asteroid', 'gravity', 'stealth', 'repair', 'satellite', 'spiral']";
const { url: noRepairCampaign } = await mutationModule('../' + campaignFile, finalKit, finalKit.replace("'repair', ", ''));
const { module: noRepair } = await mutationModule('../' + file, 'export class Engine', 'export class Engine', { './campaign': noRepairCampaign });
behaviors['O-FINAL huit mécaniques réellement générées'](Engine);
assert.throws(() => behaviors['O-FINAL huit mécaniques réellement générées'](noRepair.Engine));
mutations.push({ name: 'final without declared repair', oracle: 'O-FINAL', file: campaignFile, rejected: true });
for (const [name, before, after, fixture] of [
    ['too few novelties accepted', 'd.noveltyCount < 7', 'd.noveltyCount < 1', { ...diversity, cloneShare: 0, noveltyCount: 6, noveltyLevels: [1, 5, 10, 15, 20, 25] }],
    ['long intermediate gap accepted', 'if (level - last > 5)', 'if (level - last > 50)', { ...diversity, cloneShare: 0, noveltyCount: 8, noveltyLevels: [1, 2, 3, 4, 5, 6, 12, 17, 22, 25] }],
]) {
    assert.throws(() => verifyOrbiteDiversity(fixture), name);
    const { module } = await mutationModule('./orbite-diversity.js', before, after, { './diversity-metrics.js': new URL('./diversity-metrics.js', import.meta.url).href });
    // The counterexample must distinguish the weakened rule from the real one.
    module.verifyOrbiteDiversity(fixture);
    mutations.push({ name, oracle: 'O-DIV-01', file: 'scripts/orbite-diversity.js', rejected: true });
}
const anchor = 'const d = difficulty(level);';
const { module: equal } = await mutationModule('../' + file, anchor, 'level = 0; const d = difficulty(level);');
const baseline = recordings.find(r => r.level === 0 && r.seed === 28);
replay(baseline, equal.Engine);
const repeated = Array.from({ length: 30 }, (_, level) => {
    assert.deepEqual(new equal.Engine(level, 28).snapshot(), new equal.Engine(0, 28).snapshot(), 'exact same generated state');
    return { ...baseline, level };
});
const flat = orbiteDiversity(equal.Engine, repeated);
assert.equal(flat.cloneShare, 1); assert.throws(() => verifyOrbiteDiversity(flat));
mutations.push({ name: 'all levels equal level one', oracle: 'O-DIV-01', file, line: source.slice(0, source.indexOf(anchor)).split('\n').length, rejected: true, cloneShare: flat.cloneShare });
const { cases } = await import('./node-test-assertions.js');
const imports = {
    vitest: new URL('./orbite-assertions.js', import.meta.url).href,
    './orbite-replay': new URL('./orbite-verified-replay.js', import.meta.url).href,
    '../scripts/orbite-diversity.js': new URL('./orbite-diversity.js', import.meta.url).href,
};
for (const file of ['orbite.test.ts', 'orbite-mechanics.test.ts', 'orbite-campaign.test.ts']) {
    await mutationModule('../tests/' + file, "from 'vitest'", "from 'vitest'", imports);
}
const { registerSceneChecks } = await import('./orbite-scene-checks.js');
await registerSceneChecks();
const { sceneChecks } = await import('./orbite-scene-checks.js');
for (const [name, before, after] of [
    ['stealth always drawn', 'if (!this.engine.visible(p)) continue;', 'if (p.hp <= 0) continue;'],
    ['misleading rotor fallback', "c.mechanics[0] ? names[c.mechanics[0]] : 'Défendre les quatre abris'", "c.mechanics[0] ? names[c.mechanics[0]] : names.rotor"],
]) {
    await assert.rejects(() => sceneChecks(before, after), name);
    mutations.push({ name, oracle: 'O-RENDER', file: 'src/games/orbite/scene.ts', rejected: true });
}
const testTimings = [];
for (const [name, run] of cases) {
    const started = performance.now(); await run(); const ms = performance.now() - started;
    assert.ok(ms < 2000, `${name}: ${ms} ms exceeds 2 seconds`); testTimings.push({ name, ms });
}
if (!process.argv.includes('--checks-only')) writeFileSync('docs/orbite-validation.json', JSON.stringify({
    pass: 66, cometAudit, runtimeFlags: process.execArgv, cpuCount: availableParallelism(),
    cpuAffinity: process.platform === 'linux' ? readFileSync('/proc/self/status', 'utf8').match(/^Cpus_allowed_list:\s*(.+)$/m)?.[1] : null, victories: campaigns.length, testTimings,
    diversity: { score: diversity.score, noveltyLevels: diversity.noveltyLevels, cloneShare: diversity.cloneShare },
    mutations, campaigns,
}, null, 2) + '\n');
console.log(`Orbite: ${campaigns.length} fresh victories, ${testTimings.length} short Node checks, ${mutations.length} rejected mutations; score ${diversity.score}, clones ${flat.cloneShare} for the degenerate campaign / ${diversity.cloneShare} for Orbite.`);
