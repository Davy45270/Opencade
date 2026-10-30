/* global URL, console */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
// Child processes replace reads in memory, including the scene source read by the
// platform doubles. Neither this runner nor its children write repository files.
const bootstrap = `
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const mutation = JSON.parse(fs.readFileSync(0, 'utf8'));
const read = fs.readFileSync;
let substitutions = 0;
fs.readFileSync = function(path, ...options) {
    const result = read.call(this, path, ...options);
    const filename = path instanceof URL ? fileURLToPath(path) : typeof path === 'string' ? resolve(path) : '';
    if (!mutation || filename !== resolve(mutation.file)) return result;
    const source = result.toString();
    if (source.split(mutation.before).length !== 2) throw new Error('Ancre non unique');
    substitutions++;
    const changed = source.replace(mutation.before, mutation.after);
    return typeof result === 'string' ? changed : Buffer.from(changed);
};
syncBuiltinESMExports();
await import('./scripts/ts-loader.js');
try {
    if (!mutation) await import('./scripts/validate-collier.js');
    else {
        const { engineCases } = await import('./tests/collier-cases.ts');
        const { sceneCases } = await import('./scripts/collier-scene-oracles.js');
        ({ ...engineCases, ...sceneCases })[mutation.oracle]();
    }
}
finally { if (mutation && substitutions === 0) throw new Error('Mutation jamais chargée'); }
`;
const mutations = JSON.parse(readFileSync(new URL('./collier-mutations.json', import.meta.url), 'utf8'));
for (const mutation of mutations) {
    const source = readFileSync(new URL(`../${mutation.file}`, import.meta.url), 'utf8');
    assert.equal(source.split(mutation.before).length, 2, `${mutation.name}: ancre unique`);
}
function run(mutation) {
    return spawnSync(process.execPath, ['--input-type=module', '-e', bootstrap], {
        cwd: new URL('../', import.meta.url),
        input: JSON.stringify(mutation),
        encoding: 'utf8',
        timeout: 180000
    });
}
const baseline = run(null);
assert.equal(baseline.status, 0, baseline.stderr + baseline.stdout);
console.log('Témoin sans mutation : PASS');
for (const line of baseline.stdout.split('\n'))
    if (/^C(?:19|20):|^Politique doigt/.test(line)) console.log(line);
const expected = {
    'canon-sur-la-tete': 'C24',
    'decor-identique': 'C25',
    'motif-supprime': 'C26',
    'echelle-supprimee': 'C27',
    'bombe-rayon': 'C10',
    'formes-clonees': 'C01',
    'acceleration-finale-supprimee': 'C12',
    'tap-reserve-supprime': 'C21',
    'glisser-ne-vise-plus': 'C21',
    'meneur-fixe': 'C22',
    'visee-exacte-supprimee': 'C22',
    'espace-ne-tire-plus': 'C21',
    'couleurs-periodiques': 'C19',
    'trace-anguleux': 'C20',
    'trace-hors-champ': 'C20',
    'tap-distance-reduite': 'C21',
    'appui-long-tire': 'C21',
    'tap-ignore-excursion-intermediaire': 'C21',
    'sortie-conserve-pointeur': 'C21',
    'annulation-conserve-pointeur': 'C21',
    'avertissement-danger-supprime': 'C12',
    'son-bonus-supprime': 'C09',
    'signal-life-supprime': 'C12',
};
for (const mutation of mutations) {
    const result = run({ ...mutation, oracle: expected[mutation.name] });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    // An assertion must kill the mutant: syntax/loading failures do not count.
    assert.match(result.stderr, /AssertionError/);
    assert.notEqual(result.status, 0, `${mutation.name}: survivante`);
    const oracle = result.stderr.match(/at (?:Object\.)?(C\d+) /)?.[1];
    assert.equal(oracle, expected[mutation.name], result.stderr + result.stdout);
    console.log(`${mutation.name}: tuée (${oracle})`);
}
console.log(`${mutations.length} mutations tuées en mémoire ; ancres uniques.`);
