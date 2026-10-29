/* global console, performance */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { mutationModule } from './mutation-module.js';
const { Engine } = await import('../src/engines/bubble/engine.ts');
const { campaign } = await import('../tests/bubble-campaign.ts');
const { facingAttachment, clearSettlingPath } = await import('../tests/bubble-attachment.ts');
const { finishPenalty, airborneGrass } = await import('../tests/derapage-cases.ts');
const check = (ok, message) => assert.ok(ok, message);
async function reject(name, path, before, after, oracle) {
    const started = performance.now();
    const { module } = await mutationModule(path,before,after);
    assert.throws(() => oracle(module), `Surviving mutation: ${name}`);
    console.log(`${name}: rejected (${(performance.now()-started).toFixed(1)} ms)`);
}
const started=performance.now();campaign();
assert.ok(performance.now()-started<5000);
console.log(`B-LVL-04: ${(performance.now()-started).toFixed(1)} ms`);
for (const [name, run] of [
    ['B-HEX-18', () => facingAttachment()],
    ['B-HEX-19', () => clearSettlingPath()],
    ['Z30 final penalty', () => finishPenalty(undefined,check)],
    ['Z34 grass take-off', () => airborneGrass(undefined,check)],
]) {
    const started=performance.now(); run();
    console.log(`${name}: ${(performance.now()-started).toFixed(2)} ms`);
}
await reject('B-HEX facing sockets','../src/engines/bubble/engine.ts',
    'if (struck && ((p.x - struck.x) * direction.x + (p.y - struck.y) * direction.y > 1e-9 || p.y < struck.y - 1e-9)) return false;',
    '', m=>facingAttachment(m.Engine));
await reject('B-HEX settling path','../src/engines/bubble/engine.ts',
    'return geometry.cells.every(({cell:other,p:q}) => {',
    'return true; return geometry.cells.every(({cell:other,p:q}) => {',m=>clearSettlingPath(m.Engine));
await reject('Z30 finish penalty','../src/engines/derapage/race.ts',
    'k.finishMs = time + (k.penaltyMs ?? 0);','k.finishMs = time;', m=>finishPenalty(m.checkpoint,check));
await reject('Z34 airborne grass','../src/engines/derapage/physics.ts',
    '&& k.jumpMs <= 0','',m=>airborneGrass(m.physics,check));
const levels=await mutationModule('../src/engines/bubble/levels.ts',
    'if (row === 0 || masks[index]) {','if (row === 0 || (index === 9 ? true : masks[index])) {');
const engine=await mutationModule('../src/engines/bubble/engine.ts',
    "import { generateLevel, levelAt } from './levels';", "import { generateLevel, levelAt } from './levels';", {'./levels':levels.url});
assert.throws(()=>campaign(engine.module.Engine),/L10/);
console.log('B-LVL-04: modified level 10 rejected by replay');
// The original class still passes after isolated mutant imports.
campaign(Engine);
const { exactNearest } = await import('../tests/derapage-nearest.ts');
exactNearest();
console.log('Z15 nearest: exhaustive reference, teleports, ties and edited points passed');
