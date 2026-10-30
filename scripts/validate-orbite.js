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
const { Engine } = await import('../src/engines/orbite/engine.ts');
const { replay } = await import('../tests/orbite-replay.ts');
const { behaviors } = await import('../tests/orbite-behavior.ts');
assert.equal(recordings.length, 60);
const campaigns = [];
for (const [i, r] of recordings.entries()) {
    const generated = fresh?.[i] ?? attempt(Engine, r.level, r.seed);
    assert.deepEqual(generated, r, `Fresh campaign differs: ${r.level+1}/${r.seed}`);
    campaigns.push({ level: r.level+1, seed: r.seed, frames: r.frames, witnesses: r.witnesses });
}
const cometAudit = statistics();
const diversity = orbiteDiversity(Engine, recordings); verifyOrbiteDiversity(diversity);
const file = 'src/engines/orbite/engine.ts', source = readFileSync(file, 'utf8'), mutations = [];
for (const [name, id, before, after] of [
    ['rotor always open', 'O-MEC-01', "p.kind === 'rotor' &&", 'false &&'],
    ['no split', 'O-MEC-02', "if (p.kind === 'split')", "if (p.kind === 'fragment')"],
    ['no asteroid deflection', 'O-MEC-03', 'shot.vx = shot.x < rock.x ? -110 : 110;', 'shot.vx = 0;'],
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
    '../scripts/orbite-diversity.js': new URL('./orbite-diversity.js', import.meta.url).href,
};
for (const file of ['orbite.test.ts', 'orbite-mechanics.test.ts', 'orbite-campaign.test.ts']) {
    await mutationModule('../tests/' + file, "from 'vitest'", "from 'vitest'", imports);
}
const testTimings = [];
for (const [name, run] of cases) {
    const started = performance.now(); run(); const ms = performance.now() - started;
    assert.ok(ms < 2000, `${name}: ${ms} ms exceeds 2 seconds`); testTimings.push({ name, ms });
}
writeFileSync('docs/orbite-validation.json', JSON.stringify({
    pass: 64, cometAudit, cpuCount: availableParallelism(),
    cpuAffinity: process.platform === 'linux' ? readFileSync('/proc/self/status', 'utf8').match(/^Cpus_allowed_list:\s*(.+)$/m)?.[1] : null, victories: campaigns.length, testTimings,
    diversity: { score: diversity.score, noveltyLevels: diversity.noveltyLevels, cloneShare: diversity.cloneShare },
    mutations, campaigns,
}, null, 2) + '\n');
console.log(`Orbite: ${campaigns.length} fresh victories, ${testTimings.length} short Node checks, ${mutations.length} rejected mutations; score ${diversity.score}, clones ${flat.cloneShare} for the degenerate campaign / ${diversity.cloneShare} for Orbite.`);
