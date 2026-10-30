/* global console, process */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { mutationModule } from './mutation-module.js';
const { Engine } = await import('../src/engines/essaim/engine.ts');
const { behaviors, diversity, campaign, escortBenchmark } = await import('../tests/essaim-behavior.ts');
const checks = [];
const check = (name, run) => { try { const result = run(); checks.push({ name, passed: true }); return result; } catch (error) { checks.push({ name, passed: false, error: String(error) }); } };
for (const [name, run] of Object.entries(behaviors)) check(name, () => run(Engine));
const diversityResult = check('E-DIV-01', diversity);
const pilot = [458,28].map(seed => ({ seed, levels: check(`E-PILOT ${seed}`, () => campaign(Engine,seed)) }));
const source = readFileSync('src/engines/essaim/engine.ts','utf8'), mutations = [];
for (const [name,before,after,test] of [
    ['overheat disabled', 'if (s.heat >= 100) s.overheated = true;', 'if (s.heat >= 100) s.overheated = false;', behaviors['E-WPN-01 overheat blocks until cooled']],
    ['zero bounces', 'bounces: 2', 'bounces: 0', behaviors['E-WPN-02 two side reflections']],
    ['no drone interception', "p.owner === 'enemy' && this.has('drones')", "p.owner === 'player' && this.has('drones')", behaviors['E-WPN-03 drones intercept swept projectile']],
    ['wave factor one', 'SLOW_FACTOR = 0.35', 'SLOW_FACTOR = 1', behaviors['E-WPN-04 wave slows enemy and projectile by 0.35']],
    ['no magnetic return', "p.owner = 'player'; p.reflected = true;", "p.owner = 'enemy'; p.reflected = true;", behaviors['E-WPN-05 magnet returns a shot that kills']],
    ['charge has no effect', 'Math.min(1, s.charge / 1500)', '0', behaviors['E-WPN-06 hold and release changes size and piercing']],
    ['all levels equal level one', 'this.level = level;', 'this.level = 0;', diversity],
]) {
    const mutant = await mutationModule('../src/engines/essaim/engine.ts', before, after);
    let killed = false, error;
    try { test(mutant.module.Engine); } catch (e) { killed = true; error = String(e); }
    mutations.push({ name, file:'src/engines/essaim/engine.ts', line:source.slice(0,source.indexOf(before)).split('\n').length, killed, error });
}
const escort = check('E-WPN-07 measured speed', () => escortBenchmark(Engine));
const result = { checks, escort, diversity:diversityResult, pilot, mutations };
writeFileSync('docs/essaim-validation.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
assert.ok(checks.every(c => c.passed),'Essaim validation failed');
assert.ok(mutations.every(m => m.killed),'Surviving mutation');
process.exitCode = 0;
