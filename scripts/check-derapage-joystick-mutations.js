/* global console, URL */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mutationModule } from './mutation-module.js';
const { recordings } = await import('../tests/derapage-recordings.ts');
const physicsFile = '../src/engines/derapage/physics.ts';
const storageFile = '../src/shell/storage.ts';
export const joystickMutations = [];
for (const [name, oracle, file, before, after] of [
    ['aide désactivée', 'Z36', physicsFile, 'input.assist ? assistedHeading(k, t, input.heading) : input.heading', 'input.heading'],
    ['rail collant', 'Z38', physicsFile, 'const speed = Math.max(8, Math.min(20, Math.hypot(k.vx, k.vy) * .7));', 'const speed = 0;'],
    ['direction relative en mode fixe', 'Z37', physicsFile, "input.mode === 'joystick' && input.heading !== undefined", "input.mode === 'relative' && input.heading !== undefined"],
    ['records par index', 'Z39', storageFile, 'legacyCircuits[Number(key)]?.name', 'circuitKey(Number(key))'],
]) {
    const mutant = await mutationModule(file, before, after);
    const overrides = {};
    if (file === physicsFile) {
        overrides['../src/engines/derapage/physics'] = mutant.url;
        const engine = await mutationModule('../src/engines/derapage/engine.ts', "from './physics'", "from './physics'", { './physics': mutant.url });
        overrides['../src/engines/derapage/engine'] = engine.url;
    } else overrides['../src/shell/storage'] = mutant.url;
    const { module: cases } = await mutationModule('../tests/derapage-joystick.ts', "from '../src/engines/derapage/engine'", "from '../src/engines/derapage/engine'", overrides);
    const check = (ok, message) => { assert.ok(ok, message); };
    if (oracle === 'Z36') assert.throws(() => cases.replayHuman(recordings.find(t => t.name === 'Le Rocher'), check), /trois tours|rejeu/, name);
    else assert.throws(() => cases.joystickCases.find(c => c.name.startsWith(oracle)).run(check), name);
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    const line = source.slice(0, source.indexOf(before)).split('\n').length;
    const record = { name, oracle, file: file.slice(3), line, rejected: true };
    joystickMutations.push(record);
    console.log(`Mutation ${name} : rejetée par ${oracle}, ${record.file}:${line}`);
}
