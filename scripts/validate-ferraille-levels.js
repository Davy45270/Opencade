/* global console, process, URL */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { mutationModule } from './mutation-module.js';
import { measureRepetition } from './ferraille-diversity.js';
const { moduleEffects, introductions, repetition, legacyState, experiences } = await import('../tests/ferraille-levels.ts');
const { diversity } = await import('../tests/ferraille-behavior.ts');
moduleEffects(); introductions(); legacyState(); repetition();
const { sceneChecks, replaySample } = await import('./ferraille-scene-checks.js');
const sample = replaySample();
assert.equal(new Set(sample.map(row => row.record.level)).size, 30);
assert.equal(new Set(sample.map(row => row.character)).size, 5);
assert.equal(new Set(sample.map(row => row.record.seed)).size, 3);
assert.equal(new Set(sample.map(row => row.record.special)).size, 2);
sceneChecks(undefined, true);
const historical = diversity(); assert(historical.score <= 11.2);
const records = JSON.parse(readFileSync('tests/fixtures/ferraille-levels-103.json', 'utf8'));
assert.equal(records.length, 180);
for (const seed of [28, 1, 2026]) for (let level = 0; level < 30; level++) for (const special of [false, true]) assert.equal(records.filter(r => r.seed === seed && r.level === level && r.special === special).length, 1);
// Both sequences come from the actual engine replay, including safe introductions,
// revisits after respawn and arena encounters. Unvisited generated objects are excluded.
const rows = experiences();
const gameplay = measureRepetition(rows); assert(gameplay.passed);
const mutations = [];
for (const [name, file, before, after, run] of [
    ['convoyeur sans effet', '../src/engines/ferraille/modules.ts', "shift('x', 0.4)", "shift('x', 0)", m => moduleEffects(m.stepModules, m.pistonClosed)],
    ['piston toujours ouvert', '../src/engines/ferraille/modules.ts', 'return ticks % 180 >= 100 && ticks % 180 < 145;', 'return ticks < 0;', m => moduleEffects(m.stepModules, m.pistonClosed)],
    ['deux séquences identiques', '../src/engines/ferraille/engine.ts', 'LEVELS[Math.max(0, Math.min(29, level))]', 'LEVELS[Math.max(0, Math.min(29, level === 1 ? 0 : level))]', m => repetition(m.Engine)],
]) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.equal(source.split(before).length, 2, name);
    const mutant = await mutationModule(file, before, after); let killed = false;
    try { run(mutant.module); } catch (error) { assert(error instanceof assert.AssertionError); killed = true; }
    assert(killed, name); mutations.push({ name, file: file.slice(3), line: source.slice(0, source.indexOf(before)).split('\n').length, killed });
}
{
    const file = 'scripts/ferraille-diversity.js', source = readFileSync(file, 'utf8');
    const before = 'if (previous.star === current.star)', after = 'if (false)';
    assert.equal(source.split(before).length, 2);
    const mutant = await import(`data:text/javascript,${encodeURIComponent(source.replace(before, after))}`); let killed = false;
    try { repetition(undefined, mutant.measureRepetition); } catch (error) { assert(error instanceof assert.AssertionError); killed = true; }
    assert(killed); mutations.push({ name: 'module vedette ignoré', file, line: source.slice(0, source.indexOf(before)).split('\n').length, killed });
}
for (const [name, file, before, after, run] of [
    ['distances d’actions constantes', '../scripts/ferraille-diversity.js', 'const actionSimilarity = sequenceSimilarity(levels[j].actions, current.actions);', 'const actionSimilarity = 1;', m => repetition(undefined, m.measureRepetition)],
    ['seuil de répétition à 90 %', '../scripts/ferraille-diversity.js', 'if (moduleSimilarity > 0.5)', 'if (moduleSimilarity > 0.9)', m => repetition(undefined, m.measureRepetition)],
    ['minimum de modules supprimé', '../scripts/ferraille-diversity.js', 'if (used.size < 14)', 'if (used.size < 1)', m => repetition(undefined, m.measureRepetition)],
    ['première rencontre ignorée', '../scripts/ferraille-diversity.js', 'if (current.modules[0] !== current.star)', 'if (false)', m => repetition(undefined, m.measureRepetition)],
    ['annonce supprimée', '../src/games/ferraille/scene.ts', 's.ticks < 120 && config', 's.ticks < 0 && config', m => sceneChecks(m.FerrailleScene, false, false)],
    ['checkpoints invisibles', '../src/games/ferraille/scene.ts', 'if (Math.abs(x - camera) < 260)', 'if (Math.abs(x - camera) < 0)', m => sceneChecks(m.FerrailleScene, false, false)],
    ['démonstrations invisibles', '../src/games/ferraille/scene.ts', 'if (m.x + m.w < camera || m.x > camera + 280) continue;', 'if (m.preview || m.x + m.w < camera || m.x > camera + 280) continue;', m => sceneChecks(m.FerrailleScene, false, false)],
]) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.equal(source.split(before).length, 2, name);
    const mutant = file.endsWith('.js')
        ? await import(`data:text/javascript,${encodeURIComponent(source.replace(before, after))}`)
        : (await mutationModule(file, before, after, { phaser: 'phaser' })).module;
    let killed = false;
    try { run(mutant); } catch (error) { assert(error instanceof assert.AssertionError); killed = true; }
    assert(killed, name); mutations.push({ name, file: file.slice(3), line: source.slice(0, source.indexOf(before)).split('\n').length, killed });
}
assert.equal(mutations.length, 11);
const replayMeasures = [];
for (const seed of [28, 1, 2026]) for (const special of [false, true]) {
    const run = records.filter(r => r.seed === seed && r.special === special).sort((a, b) => a.level - b.level);
    const result = measureRepetition(run.map(r => ({ star: rows[r.level].star, modules: r.modules, actions: r.actions })));
    assert(result.passed, result.errors.join('\n'));
    replayMeasures.push({ seed, special, used: result.used, maxModuleSimilarity: result.maxModuleSimilarity });
}

const baseline = JSON.parse(readFileSync('docs/ferraille-levels-baseline.json', 'utf8'));
baseline.head = 'dab7aed';
const report = { pass: 105, checks: ['F-niv-01', 'F-niv-02', 'F-niv-03', 'F-niv-04'], wins: 30, sampleSeed: 105, replaySample: replaySample().map(({ character, record }) => ({ character, level: record.level, seed: record.seed, special: record.special })), seeds: [28, 1, 2026], historical: { before: 11.2, after: historical.score }, beforeGameplay: baseline, beforePass103: { source: 'docs/ferraille-levels-validation.json (HEAD 1dfdc9f)', method: 'generated modules, recorded actions', used: 16, maxModuleSimilarity: .5, meanConsecutiveModuleDistance: .8057471264367819, meanConsecutiveActionDistance: .5319850360367603 }, replayMeasures, gameplay, observedEncounters: rows.map((row, i) => ({ level: i + 1, ...row, encountered: row.modules })), mutations, browserRun: false };
if (!process.argv.includes('--checks-only')) writeFileSync('tests/fixtures/ferraille-validation-105.json', JSON.stringify(report, null, 2) + '\n');
console.log(`F-niv-01…04: 16 modules, 30 sampled wins, ${gameplay.pairs.length} pairs; historical ${historical.score}; eleven mutations killed`);
