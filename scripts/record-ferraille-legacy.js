/* global console */
import './ts-loader.js';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const directory = mkdtempSync(join(tmpdir(), 'ferraille-dab7aed-'));
try {
    // Materialize the actual historical sources without changing the checkout.
    for (const name of ['engine', 'levels']) {
        let source = execFileSync('git', ['show', `dab7aed:src/engines/ferraille/${name}.ts`], { encoding: 'utf8' });
        source = source.replace("'../../content/level-catalogue'", "'./catalogue'");
        source = source.replace("'../shared/random'", "'./random'");
        writeFileSync(join(directory, `${name}.ts`), source);
    }
    writeFileSync(join(directory, 'random.ts'), execFileSync('git', ['show', 'dab7aed:src/engines/shared/random.ts'], { encoding: 'utf8' }));
    writeFileSync(join(directory, 'catalogue.ts'), execFileSync('git', ['show', 'dab7aed:src/content/level-catalogue.ts'], { encoding: 'utf8' }));
    const { Engine, DT } = await import(pathToFileURL(join(directory, 'engine.ts')).href);
    const engine = new Engine(); engine.loadLevel(23, 28);
    engine.input({ x: 1, fire: true }); engine.step(DT * 120);
    writeFileSync('tests/fixtures/ferraille-dab7aed.json', JSON.stringify({ revision: 'dab7aed', level: 23, seed: 28, state: engine.state }, null, 2) + '\n');
    console.log('Historical Ferraille state saved from dab7aed after 120 steps');
} finally { rmSync(directory, { recursive: true, force: true }); }
