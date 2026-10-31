/* global console */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { mutationModule } from './mutation-module.js';
const { marmailleCases } = await import('../tests/marmaille-cases.ts');
for (const [name, run] of Object.entries(marmailleCases)) { run(); console.log(`${name}: ok`); }
// Each rule has a mutation the cases must reject.
for (const [name, before, after, id] of [
    ['walkers step over a blocker', 'if (this.solid(nx, k.y) && !this.wall(nx, k.y - 1, k)', 'if (!this.wall(nx, k.y - 1, k)', 'MA-04'],
    ['six-cell falls survived', 'if (k.fall > FALL_MAX && !k.float)', 'if (k.fall > FALL_MAX + 1 && !k.float)', 'MA-03'],
    ['parachute ignored', 'if (k.fall > FALL_MAX && !k.float)', 'if (k.fall > FALL_MAX)', 'MA-03'],
    ['builder never stops', 'if (k.steps >= BUILD_STEPS) k.state = \'walk\';', '', 'MA-05'],
    ['digging through rock', "const DIGGABLE = new Set<Tile>(['#']);", "const DIGGABLE = new Set<Tile>(['#', 'X']);", 'MA-06'],
    ['no climbing', 'if (k.climber && this.solid(nx, k.y) && !this.solid(k.x, k.y - 1))', 'if (false)', 'MA-07'],
    ['water harmless', "if (this.tile(k.x, k.y) === '~') { this.die(k); return true; }", '', 'MA-02'],
    ['everyone leaves at once', '(this.tick - 1) % this.def.rate === 0', 'true', 'MA-01'],
    ['score 99 per kid', 'this.saved * 100', 'this.saved * 99', 'MA-01'],
    ['time bonus rounded up', 'Math.floor(this.timeLeftMs / 1000)', 'Math.ceil(this.timeLeftMs / 1000)', 'MA-01'],
    ['time bonus when lost', "this.status === 'won' ? Math.floor", "this.status !== 'playing' ? Math.floor", 'MA-01'],
    ['blockers hold the level open', 'const finished = this.spawned === this.def.count && active === 0;', "const finished = this.spawned === this.def.count && active === 0 && !this.kids.some(k => k.state === 'block');", 'MA-01'],
    ['duplicate parachute consumes stock', 'if (k.float) return false;', 'if (k.float && this.roles.float < 0) return false;', 'MA-07'],
    ['duplicate climber consumes stock', 'if (k.climber) return false;', 'if (k.climber && this.roles.climb < 0) return false;', 'MA-07'],
    ['climber through a blocker', 'if (k.climber && this.solid(nx, k.y) && !this.solid(k.x, k.y - 1))', 'if (k.climber && !this.solid(k.x, k.y - 1))', 'MA-04'],
    ['blocker over the void', 'if (!this.solid(k.x, k.y + 1)) return false;', '', 'MA-04'],
    ['empty stock still usable', 'this.roles[role] <= 0', 'this.roles[role] < 0', 'MA-10'],
    ['same job handed twice', "if (k.state === role) return false;", "if (k.state === role && role === 'block') return false;", 'MA-10'],
    ['roles for saved or dead kids', " || k.state === 'saved' || k.state === 'dead'", '', 'MA-10'],
    ['roles after the end', "this.status !== 'playing' || !k", '!k', 'MA-10'],
    ['clock twice too fast', 'this.carry += ms;', 'this.carry += ms * 2;', 'MA-10'],
    ['free work roles', 'this.roles[role]--;', "if (role === 'float' || role === 'climb' || role === 'block') this.roles[role]--;", 'MA-10'],
    ['fatal fall saved by the door', 'if (k.fall <= FALL_MAX || k.float) this.arrive(k);', 'if (true) this.arrive(k);', 'MA-03'],
]) {
    const { module } = await mutationModule('../src/engines/marmaille/engine.ts', before, after);
    const run = Object.entries(marmailleCases).find(([n]) => n.startsWith(id))?.[1];
    assert.ok(run, id); assert.throws(() => run(module.Engine), name);
    console.log(`rejected mutation: ${name} (${id})`);
}
console.log('Marmaille: 10 rule cases, 30 recorded victories with literal end ticks and scores, 29 levels lost without roles, every offered role needed, 23 mutations rejected.');
