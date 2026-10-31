/* global console, URL */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';
const mutations = [
    ['Panneau sur le terrain', 'src/games/artificiers/art.ts', 'g.fillRoundedRect(10, 531, 340, 98, 12);', 'g.fillRoundedRect(10, 480, 340, 149, 12);', 'hudGeometry'],
    ['Vies toujours pleines', 'src/games/artificiers/art.ts', 'g.fillRect(u.x - 15, u.y - 34, u.hp * .3, 4);', 'g.fillRect(u.x - 15, u.y - 34, 30, 4);', 'hudGeometry'],
    ['Puissance toujours pleine', 'src/games/artificiers/art.ts', '205 * (e.power - 65) / 180', '205', 'hudGeometry'],
    ['Visée invisible', 'src/games/artificiers/art.ts', 'preview.points.slice(0, 10)', 'preview.points.slice(0, 0)', 'hudGeometry'],
    ['Corde avant déplacement seulement', 'src/engines/artificiers/engine.ts', 'if (this.moveLeft < 12) return false;', 'if (this.moveLeft < 48) return false;', 'movementAndRope'],
    ['Mauvaise équipe gagnante', 'src/engines/artificiers/engine.ts', "if (!alive[0]) { this.status = 'lost'; this.winner = 1; }", "if (!alive[0]) { this.status = 'lost'; this.winner = 0; }", 'sceneChecks'],
    ['W baisse la puissance', 'src/games/artificiers/scene.ts', "if (k.code === 'KeyW') this.engine.aim(this.engine.angle, this.engine.power + 8);", "if (k.code === 'KeyW') this.engine.aim(this.engine.angle, this.engine.power - 8);", 'sceneChecks'],
    ['Démolition à 81 %', 'src/engines/artificiers/engine.ts', 'this.terrain.structureCount() <= this.initialStructure * .2', 'this.terrain.structureCount() <= this.initialStructure * .19', 'structureThreshold'],
];
const worker = `
import './scripts/ts-loader.js';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { transpile } from './scripts/transpile.js';
const m = JSON.parse(process.env.ARTIFICIERS_MUTATION);
const target = new URL(m.file, import.meta.url);
const source = readFileSync(target, 'utf8').replace(m.old, m.replacement);
if (!m.file.endsWith('/scene.ts')) registerHooks({ load(url, context, next) {
    return url === target.href ? { format: 'module', source: transpile(source), shortCircuit: true } : next(url, context);
} });
try {
    if (m.check === 'sceneChecks') {
        const { sceneChecks } = await import('./scripts/artificiers-scene-checks.js');
        const { bounded } = await import('./tests/artificiers-budget.ts');
        bounded(() => sceneChecks(m.file.endsWith('/scene.ts') ? source : undefined));
    } else {
        const { cases } = await import('./tests/artificiers-cases.ts');
        const { bounded } = await import('./tests/artificiers-budget.ts');
        bounded(cases[m.check]);
    }
} catch (error) {
    if (error.code === 'ERR_ASSERTION') { console.log(error.message); process.exit(10); }
    throw error;
}
`;
/** Source edits live only in child loaders; no repository file is changed. */
export function auditMutations() {
    const results = [];
    for (const [name, file, old, replacement, check] of mutations) {
        const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
        assert.equal(source.split(old).length - 1, 1, `Ancrage unique : ${name}`);
        const child = spawnSync(process.execPath, ['--input-type=module', '--eval', worker], {
            cwd: new URL('../', import.meta.url), env: { ...process.env, ARTIFICIERS_MUTATION: JSON.stringify({ file, old, replacement, check }) }, encoding: 'utf8',
            // Process safety net only: a timeout is an audit error, never a killed mutant.
            timeout: 60000,
        });
        assert.equal(child.status, 10, `${name}: mutation survivante ou erreur du harnais\n${child.stdout}\n${child.stderr}`);
        results.push({ mutation: name, test: check, result: 'tuée' });
    }
    console.table(results); return results;
}
if (process.argv[1] && new URL(process.argv[1], 'file:').href === import.meta.url) auditMutations();
