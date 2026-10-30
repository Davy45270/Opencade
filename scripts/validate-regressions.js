/* global console, performance */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { mutationModule } from './mutation-module.js';
const { Engine } = await import('../src/engines/bubble/engine.ts');
const { campaign } = await import('../tests/bubble-campaign.ts');
const { grazingAttachment, bounceUpperSocket } = await import('../tests/bubble-attachment.ts');
const { impactCell, wallBounces, detachedGroupsFall } = await import('../tests/bubble-snap.ts');
const { settleGlide } = await import('../tests/bubble-settle.ts');
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
    ['B-HEX-18', () => grazingAttachment()],
    ['B-HEX-19', () => bounceUpperSocket()],
    ['B-SNAP-01', () => impactCell()],
    ['B-SNAP-02', () => wallBounces()],
    ['B-SNAP-03', () => detachedGroupsFall()],
    ['B-SNAP-05', () => settleGlide()],
    ['Z30 final penalty', () => finishPenalty(undefined,check)],
    ['Z34 grass take-off', () => airborneGrass(undefined,check)],
]) {
    const started=performance.now(); run();
    console.log(`${name}: ${(performance.now()-started).toFixed(2)} ms`);
}
await reject('B-SNAP biased below impact','../src/engines/bubble/engine.ts',
    'const d = distance(center(cell, drops), at);','const d = distance(center(cell, drops), { x: at.x, y: at.y + RADIUS });',
    m=>{ grazingAttachment(m.Engine); bounceUpperSocket(m.Engine); });
await reject('B-SNAP narrow row window','../src/engines/bubble/engine.ts',
    'row <= Math.min(ROWS - 1, approx + 2)','row <= Math.min(ROWS - 1, approx - 1)', m=>impactCell(m.Engine));
await reject('B-SNAP wall bounce drift','../src/engines/bubble/engine.ts',
    'direction = { x: -direction.x, y: direction.y };','direction = { x: -direction.x * 0.98, y: direction.y };', m=>wallBounces(m.Engine));
await reject('B-SNAP fall only next to the pop','../src/engines/bubble/engine.ts',
    'const fallen = popped.length ? this.grid.filter(c => !anchored.has(key(c))) : [];',
    'const fallen = popped.length ? this.grid.filter(c => !anchored.has(key(c)) && popped.some(p => neighbors(p).some(n => key(n) === key(c)))) : [];',
    m=>detachedGroupsFall(m.Engine));
await reject('B-SNAP glide cut at half time','../src/games/bubble/settle.ts',
    'if (key !== this.key || this.age >= SETTLE_MS) return null;','if (key !== this.key || this.age >= SETTLE_MS / 2) return null;', m=>settleGlide(m.Settle, m.settleTarget));
await reject('B-SNAP glide instantaneous','../src/games/bubble/settle.ts',
    'const t = this.age / SETTLE_MS;','const t = 1;', m=>settleGlide(m.Settle, m.settleTarget));
await reject('B-SNAP glide runs while paused','../src/games/bubble/settle.ts',
    'if (!frozen && this.age < SETTLE_MS)','if (this.age < SETTLE_MS)', m=>settleGlide(m.Settle, m.settleTarget));
await reject('B-SNAP glide x jumps','../src/games/bubble/settle.ts',
    'x: this.from.x + (this.to.x - this.from.x) * t','x: this.to.x', m=>settleGlide(m.Settle, m.settleTarget));
await reject('B-SNAP popped glide follows descent','../src/games/bubble/settle.ts',
    'return center(attached, popped ? dropsBefore : dropsAfter);','return center(attached, dropsAfter);', m=>settleGlide(m.Settle, m.settleTarget));
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
