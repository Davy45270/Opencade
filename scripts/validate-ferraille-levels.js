/* global console, process, URL */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { mutationModule } from './mutation-module.js';
import { measureRepetition } from './ferraille-diversity.js';
const { moduleEffects, introductions, repetition, legacyState, experiences } = await import('../tests/ferraille-levels.ts');
const { diversity, campaign } = await import('../tests/ferraille-behavior.ts');
moduleEffects(); introductions(); legacyState(); repetition();
const { sceneChecks, replaySample, visualChecks, artChecks, startingEnemyChecks } = await import('./ferraille-scene-checks.js');
const sample = replaySample();
assert.equal(new Set(sample.map(row => row.record.level)).size, 30);
assert.equal(new Set(sample.map(row => row.character)).size, 5);
assert.equal(new Set(sample.map(row => row.record.seed)).size, 3);
assert.equal(new Set(sample.map(row => row.record.special)).size, 2);
sceneChecks(undefined, true);
artChecks();
const visualMeasures = visualChecks();
console.log(visualMeasures);
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
// Independent failures prove that the visual thresholds inspect submitted drawing.
for (const [name, before, after] of [
    ['héros trop petit', 'yy(h.y + h.h) - 48 + stride, 128', 'yy(h.y + h.h) - 48 + stride, 57'],
    ['décor absent', 'scenery(g, this.engine.level, camera, s.ticks, reducedMotion, s.theme);', 'void 0;'],
    ['ennemis invisibles', 'enemyArt(g, e.kind, x, y);', 'void 0;'],
    ['allocation pendant draw', 'this.art?.begin();', 'this.art = new ActionPaint(this, 224); this.art.begin();'],
]) {
    const mutant = await mutationModule('../src/games/ferraille/scene.ts', before, after, { phaser: 'phaser' });
    let killed = false;
    try { visualChecks(mutant.module.FerrailleScene); } catch (error) { assert(error instanceof assert.AssertionError); killed = true; }
    assert(killed, name);
}

const visualMutations114 = [];
for (const [name, file, before, after, check] of [
    ['arme_renforcee_absente', 'actors-art', '    const dx =', '    if (ticks >= 0) return;\n    const dx =', m => artChecks(m)],
    ['flamme_tir_absente', 'actors-art', '    if (firing) {', '    if (firing && ticks < 0) {', m => artChecks(m)],
    ['flamme_horizontale', 'actors-art', '    if (firing) {', '    if (firing) { g.rotateCanvas(-angle);', m => artChecks(m)],
    ['arme_horizontale', 'actors-art', 'g.rotateCanvas(angle)', 'g.rotateCanvas(0)', m => artChecks(m)],
    ['course_textures_identiques', 'paint', 'Math.sin(frame * Math.PI / 2 + (p.x < 115 ? 0 : Math.PI)) * 8', 'Math.sin(0 + (p.x < 115 ? 0 : Math.PI)) * 8', m => visualChecks(undefined, true, m.FerraillePaint)],
    ['ennemi_hors_ecran', 'scene', 'const x = xx(e.x) - 10, y = yy(e.y) - 10;', 'const x = 10000, y = yy(e.y) - 10;', m => visualChecks(m.FerrailleScene)],
    ['course_tir_figee', 'scene', 'Boolean(h.vx && s.grounded)', 'Boolean(h.vx && s.grounded && !s.input.fire)', m => visualChecks(m.FerrailleScene)],
    ['visee_ignoree', 'scene', 'Math.atan2(aimY, aimX)', '0', m => visualChecks(m.FerrailleScene)],
    ['pont_intact_apres_rupture', 'modules-art', 'fall = m.value && i > 2 && i < 8 ? 38 + i % 3 * 17 : 0', 'fall = m.value && i > 2 && i < 8 ? 0 : 0', m => artChecks(undefined, m)],
    ['rouleaux_figes', 'modules-art', 'const a = t / 12;', 'const a = 0;', m => artChecks(undefined, m)],
    ['lave_invisible', 'modules-art', 'g.fillRect(x, yy(296 - m.value), w, (24 + m.value) * scale);', 'g.fillRect(x, yy(296 - m.value), w, 0);', m => artChecks(undefined, m)],
    ['robot_sans_identite', 'actors-art', "const robot = kind === 'armored' || kind === 'kamikaze', flying = kind === 'drone', turret = kind === 'turret';", "const robot = kind === 'armored' && kind.length === 0, flying = kind === 'drone', turret = kind === 'turret';", m => artChecks(m)],
]) {
    const mutant = await mutationModule(`../src/games/ferraille/${file}.ts`, before, after, { phaser: 'phaser' });
    assert.throws(() => check(mutant.module), assert.AssertionError, name);
    visualMutations114.push({ name, killed: true });
}

const replayMeasures = [];
for (const seed of [28, 1, 2026]) for (const special of [false, true]) {
    const run = records.filter(r => r.seed === seed && r.special === special).sort((a, b) => a.level - b.level);
    const result = measureRepetition(run.map(r => ({ star: rows[r.level].star, modules: r.modules, actions: r.actions })));
    assert(result.passed, result.errors.join('\n'));
    replayMeasures.push({ seed, special, used: result.used, maxModuleSimilarity: result.maxModuleSimilarity });
}

for (const seed of [28, 1, 2026]) campaign(undefined, seed);
console.log(`114: 900 character replays, three pilot campaigns, ${visualMutations114.length} visual mutations killed`);
const opening115 = startingEnemyChecks();
const openingMutations115 = [];
for (const [name, file, before, after, check] of [
    ['ennemi_initial_absent', 'engine', 'if (config.openingEnemy)', 'if (false && config.openingEnemy)', m => startingEnemyChecks(m.Engine)],
    ['gel_initial_retabli', 'engine', 'h.x < 256 && !e.opening', 'h.x < 256', m => startingEnemyChecks(m.Engine)],
    ['tous_ennemis_exemptes', 'engine', 'h.x < 256 && !e.opening', 'h.x < 0 && !e.opening', m => startingEnemyChecks(m.Engine)],
    ['tirs_hostiles_invisibles', 'scene', 'yy(p.y) + 3, 5', 'yy(p.y) + 3, 0', m => startingEnemyChecks(undefined, m.FerrailleScene)],
]) {
    const path = file === 'engine' ? '../src/engines/ferraille/engine.ts' : '../src/games/ferraille/scene.ts';
    const mutant = await mutationModule(path, before, after, { phaser: 'phaser' });
    assert.throws(() => check(mutant.module), assert.AssertionError, name);
    openingMutations115.push({ name, killed: true });
}
console.log(`115: ${opening115.length} opening encounters, four opening mutations killed`);

const baseline = JSON.parse(readFileSync('docs/ferraille-levels-baseline.json', 'utf8'));
baseline.head = 'dab7aed';
const report = { pass: 115, opening115, openingMutations115, visualPass114: visualMeasures, visualMutations114, checks: ['F-niv-01', 'F-niv-02', 'F-niv-03', 'F-niv-04'], wins: 900, sampleSeed: 105, replaySample: replaySample().map(({ character, record }) => ({ character, level: record.level, seed: record.seed, special: record.special })), seeds: [28, 1, 2026], historical: { before: 11.2, after: historical.score }, beforeGameplay: baseline, beforePass103: { source: 'docs/ferraille-levels-validation.json (HEAD 1dfdc9f)', method: 'generated modules, recorded actions', used: 16, maxModuleSimilarity: .5, meanConsecutiveModuleDistance: .8057471264367819, meanConsecutiveActionDistance: .5319850360367603 }, replayMeasures, gameplay, observedEncounters: rows.map((row, i) => ({ level: i + 1, ...row, encountered: row.modules })), mutations, browserRun: false };
if (!process.argv.includes('--checks-only')) writeFileSync('tests/fixtures/ferraille-validation-115.json', JSON.stringify(report, null, 2) + '\n');
console.log(`F-niv-01…04: 16 modules, 30 sampled wins, ${gameplay.pairs.length} pairs; historical ${historical.score}; eleven mutations killed`);

const { ferrailleRenderChecks } = await import('./validate-briqueterie-scene.js');
await ferrailleRenderChecks();
