/* global console, URL, performance */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { selectCharacter } from '../src/characters/selection.ts';
import { ids } from '../src/characters/model.ts';
import { transpile } from './transpile.js';
import { Engine } from '../src/engines/gourmandises/engine.ts';
import { LEVELS, terrain } from '../src/engines/gourmandises/levels.ts';
import { Random } from '../src/engines/shared/random.ts';
import { oracles, regressionFingerprint, geometryChecks } from '../tests/gourmandises-oracles.ts';
import { measureLevel, checkBalance, median } from '../tests/gourmandises-campaign.ts';
import { presentationChecks, sceneListeners, toolBoxes } from './gourmandises-presentation-oracles.js';
import { graphicsReplayChecks } from './gourmandises-graphics-oracle.js';
import { sceneFeedback } from './gourmandises-scene-oracles.js';

/** Shared assertions: only the replayed level indices differ between CI and audit. */
export async function validateCampaign(indices, { audit = false } = {}) {
    const campaignStarted = performance.now();
    for (const [id, oracle] of Object.entries(oracles)) {
        const started = performance.now();
        oracle();
        assert.ok(performance.now() - started < 2000, `${id} : budget 2 s`);
        console.log(`${id} OK`);
    }
    assert.equal(regressionFingerprint(undefined, [8, 19, 37, 65, 101], 120), 1440552771, 'Snapshots et événements 1–120 inchangés');
    // Load the real scene constructor with only the rendering base replaced.
    // No canvas, rendering loop or browser is created.
    registerHooks({
        resolve(specifier, context, next) {
            if (specifier.endsWith('.css')) return { url: 'data:text/javascript,export default {}', shortCircuit: true };
            if (specifier === 'phaser') return {
                url: 'data:text/javascript,export default { Scene: class {} }', shortCircuit: true,
            };
            return next(specifier, context);
        },
    });
    function sceneCharacter(module) {
        for (const id of ids) {
            selectCharacter(id);
            const scene = new module.GourmandisesScene();
            assert.equal(scene.hero.id, id);
            assert.equal(scene.engine.state.character, id);
            scene.engine.swap(...scene.engine.validMoves()[0]);
            assert.equal(scene.engine.snapshot().character, id);
        }
        selectCharacter('panda');
    }
    const sceneModule = await import('../src/games/gourmandises/scene.ts');
    graphicsReplayChecks(sceneModule);
    toolBoxes();
    sceneCharacter(sceneModule);
    sceneFeedback(sceneModule);
    sceneListeners(sceneModule);
    presentationChecks(await import('../src/games/gourmandises/presentation.ts'));
    console.log('Entrées réelles 1/2/3/Échap, 180 géométries, décors, objectifs, outils et alerte des coups OK');
    const mutations = JSON.parse(readFileSync(new URL('./gourmandises-mutations.json', import.meta.url), 'utf8'));
    for (const mutation of mutations) {
        const sourceURL = new URL(`../${mutation.file}`, import.meta.url);
        const source = readFileSync(sourceURL, 'utf8');
        assert.equal(source.split(mutation.before).length, 2, `Ancre unique : ${mutation.name}`);
        const replacement = source.replace(mutation.before, mutation.after);
        if (mutation.oracle === 'toolBoxes') {
            assert.throws(() => toolBoxes(replacement), `Mutation survivante : ${mutation.name}`);
            console.log(`Mutation tuée : ${mutation.name}`);
            continue;
        }
        const changed = replacement
            .replace(/from '([^']+)'/g, (_, path) => {
                const url = path.startsWith('.') ? new URL(`${path}.ts`, sourceURL).href : path;
                return `from '${url}'`;
            });
        const module = await import(`data:text/javascript,${encodeURIComponent(transpile(changed))}`);
        const oracle = mutation.oracle === 'geometryChecks' ? geometryChecks
            : mutation.oracle === 'sceneCharacter' ? sceneCharacter
            : mutation.oracle === 'sceneFeedback' ? sceneFeedback
                : mutation.oracle === 'sceneListeners' ? sceneListeners
                    : mutation.oracle === 'presentationChecks' ? presentationChecks : oracles[mutation.oracle];
        assert.throws(() => oracle(module), `Mutation survivante : ${mutation.name}`);
        console.log(`Mutation tuée : ${mutation.name}`);
    }
    selectCharacter('panda');
    const rows = [];
    let permutations = 0;
    for (const index of indices) {
        const level = LEVELS[index];
        const result = measureLevel(index);
        checkBalance(result);
        const cells = terrain(level);
        rows.push({ ...result, size: `${level.width}×${level.height}`,
            objective: level.objectives[0].target,
            crates: cells.reduce((sum, c) => sum + c.crate, 0),
            ice: cells.reduce((sum, c) => sum + c.ice, 0), absent: cells.filter(c => !c.active).length });
        const endurance = new Engine('discovery');
        endurance.loadLevel(index, 8);
        endurance.state.objectives = endurance.state.objectives.map(o => ({ ...o, target: 100000000 }));
        const random = new Random(8 + index);
        for (let step = 0; step < (index < 120 ? 40 : 100); step++) {
            const moves = endurance.validMoves();
            assert.ok(moves.length > 0, `Coup garanti ${index + 1}/${step}`);
            assert.equal(endurance.matches().length, 0, `État stable ${index + 1}/${step}`);
            assert.ok(endurance.swap(...moves[Math.floor(random.next() * moves.length)]), 'Permutation jouée');
            permutations++;
        }
    }
    console.table(rows);
    const sample = (start, end) => rows.filter(r => r.level > start && r.level <= end);
    const losses = (start, end) => sample(start, end).reduce((sum, r) => sum + r.randomLosses, 0);
    const lossRate = (start, end) => losses(start, end) / (sample(start, end).length * 5);
    assert.ok(lossRate(0, 10) <= .2, 'Tutoriel : au moins 80 % de victoires aléatoires');
    assert.ok(lossRate(20, 40) >= .2, '21–40 : au moins 20 % de défaites aléatoires');
    assert.ok(lossRate(40, 60) >= .5, '41–60 : au moins 50 % de défaites aléatoires');
    const worlds = [0, 20, 40].map(start => median(sample(start, start + 20).map(r => r.median)));
    assert.ok(worlds[0] < worlds[1] && worlds[1] < worlds[2], 'Pression mesurée croissante entre mondes');
    const laterWorlds = [60, 80, 100].map(start => median(sample(start, start + 20).map(r => r.median)));
    for (const pressure of laterWorlds) assert.ok(pressure >= .55 && pressure <= .85, 'Mondes 4–6 : pression 55–85 %');
    assert.ok(laterWorlds[0] < laterWorlds[1] && laterWorlds[1] < laterWorlds[2], 'Pression croissante des mondes 4–6');
    assert.ok(lossRate(100, 120) >= .5, '101–120 : au moins 50 % de défaites aléatoires');
    const gardenWorlds = [120, 140, 160].map(start => median(sample(start, start + 20).map(r => r.median)));
    assert.ok(gardenWorlds[0] <= gardenWorlds[1] && gardenWorlds[1] <= gardenWorlds[2], 'Pression non décroissante des mondes 7–9');
    console.log(JSON.stringify({ levels: rows.map(row => row.level), seeds: [8, 19, 37, 65, 101], rows, worlds, laterWorlds, gardenWorlds,
        randomLosses: [losses(0, 10), losses(20, 40), losses(40, 60)], mutations: mutations.length }));
    console.log(`${rows.length * 5} victoires gloutonnes, ${permutations} permutations stables, ${mutations.length} mutations tuées en mémoire.`);

    const duration = performance.now() - campaignStarted;
    if (!audit) assert.ok(duration < 20000, `Validateur : ${duration.toFixed(0)} ms, plafond 20 s`);
    console.log(`${audit ? 'Audit' : 'Validateur'} Gourmandises : ${(duration / 1000).toFixed(2)} s`);
}
