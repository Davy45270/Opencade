/* global console, process */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const { recordEssaim } = await import('./record-essaim.js');
if (process.argv.includes('--record')) recordEssaim();
import { mutationModule } from './mutation-module.js';
const { recordings } = await import('../tests/essaim-recordings.ts');
const { replay } = await import('../tests/essaim-replay.ts');
const { Engine } = await import('../src/engines/essaim/engine.ts');
const { behaviors: focusedBehaviors, escortBenchmark } = await import('../tests/essaim-behavior.ts');
const { diversity, campaign, generatedWitnesses } = await import('./essaim-campaigns.js');
const behaviors = { ...focusedBehaviors, 'E-GEN-03 diversity witnesses come from simulated behavior': generatedWitnesses };
const { weaponBenchmark, weaponScenarios } = await import('../tests/essaim-weapons.ts');
const checks = [];
const check = (name, run) => { try { const result = run(); checks.push({ name, passed: true }); return result; } catch (error) { checks.push({ name, passed: false, error: String(error) }); } };
for (const [name, run] of Object.entries(behaviors)) check(name, () => run(Engine));
for (const record of recordings) check(`E-REPLAY ${record.level+1}/${record.seed}`, () => replay(record));
const diversityResult = check('E-DIV-01', diversity);
const pilot = [458,28].map(seed => ({ seed, levels: check(`E-PILOT ${seed}`, () => campaign(Engine,seed)) }));
const source = readFileSync('src/engines/essaim/engine.ts','utf8'), mutations = [];
for (const [name,before,after,test] of [
    ['recorded inputs detect engine drift', 's.cooldown = 150;', 's.cooldown = 151;', E => replay(recordings.find(r => r.level === 1 && r.seed === 28), E)],
    ['overheat disabled', 'if (s.heat >= 100) s.overheated = true;', 'if (s.heat >= 100) s.overheated = false;', behaviors['E-WPN-01 overheat blocks until cooled']],
    ['zero bounces', 'bounces: 2', 'bounces: 0', behaviors['E-WPN-02 two side reflections']],
    ['no drone interception', "p.owner === 'enemy' && this.has('drones')", "p.owner === 'player' && this.has('drones')", behaviors['E-WPN-03 drones intercept swept projectile']],
    ['wave factor one', 'SLOW_FACTOR = 0.35', 'SLOW_FACTOR = 1', behaviors['E-WPN-04 wave slows enemy and projectile by 0.35']],
    ['no magnetic return', "p.owner = 'player'; p.reflected = true;", "p.owner = 'enemy'; p.reflected = true;", behaviors['E-WPN-05 magnet returns a shot that kills']],
    ['charge has no effect', 'Math.min(1, s.charge / 1500)', '0', behaviors['E-WPN-06 hold and release changes size and piercing']],
    ['generated bosses removed', 'if (c.boss && s.wave === d.waves)', 'if (false && c.boss && s.wave === d.waves)', behaviors['E-GEN-01 all six bosses actually spawn on the last wave']],
    ['generated rescue removed', "if (c.formations.includes('rescue')) s.rescue", "if (false && c.formations.includes('rescue')) s.rescue", behaviors['E-GEN-02 pilot encounters generated rescue ship']],
    ['fast trajectory removed', "if (e.type === 'fast') {", "if (e.type === 'fast' && false) {", behaviors['E-GEN-04 fast ellipse and three-shot burst fan']],
    ['burst emission removed', "if (e.type === 'burst' && e.clock >= 2100", "if (e.type === 'burst' && e.clock >= 21000000", behaviors['E-GEN-04 fast ellipse and three-shot burst fan']],
    ['guidance removed', "if (p.owner === 'enemy' && p.seeking && p.y < 300)", "if (p.owner === 'enemy' && p.seeking && p.y < 0)", behaviors['E-GEN-05 guidance follows moved player then freezes at y300']],
    ['guidance never stops', "if (p.owner === 'enemy' && p.seeking && p.y < 300)", "if (p.owner === 'enemy' && p.seeking)", behaviors['E-GEN-05 guidance follows moved player then freezes at y300']],
    ['normal fire suppressed during charge', "if (this.has('beam')) return false;", "if (this.has('beam') || this.has('charge')) return false;", behaviors['E-GEN-06 normal fire survives charging and short tap']],
    ['phase two cadence unchanged', 's.ticks % (boss.phase === 2 ? 45 : 75)', 's.ticks % (boss.phase === 2 ? 75 : 75)', behaviors['E-GEN-07 generated command phase two cadence and aim']],
    ['phase two aim removed', '[(s.cannon - boss.x) * 0.5]', '[0]', behaviors['E-GEN-07 generated command phase two cadence and aim']],
    ['rescue penalty removed', "s.rescue = null; this.damage(true); this.events.push('rescue-lost');", "s.rescue = null; this.events.push('rescue-lost');", behaviors['E-GEN-08 generated rescue damage loss and per-hp reward']],
    ['rescue penalty ignores invulnerability regression', 'this.damage(true);', 'this.damage();', behaviors['E-P2 rescue penalty ignores invulnerability including final life']],
    ['rescue reward removed', 's.score += s.rescue.hp * 50;', 's.score += 0;', behaviors['E-GEN-08 generated rescue damage loss and per-hp reward']],
    ['rescue reward fixed regardless of health', 's.score += s.rescue.hp * 50;', 's.score += 200;', behaviors['E-GEN-08 generated rescue damage loss and per-hp reward']],
    ['directional shield removed', "&& frontal) { this.events.push('armor');", ") { this.events.push('armor');", behaviors['E-SHIELD geometry independent of projectile flags and orientation']],
    ['all levels equal level one', 'this.level = level;', 'this.level = 0;', diversity],
]) {
    const mutant = await mutationModule('../src/engines/essaim/engine.ts', before, after);
    let killed = false, error;
    try { test(mutant.module.Engine); } catch (e) { killed = true; error = String(e); }
    mutations.push({ name, file:'src/engines/essaim/engine.ts', line:source.slice(0,source.indexOf(before)).split('\n').length, killed, error });
}
const escort = check('E-WPN-07 measured speed', () => escortBenchmark(Engine));
const weapons = Object.keys(weaponScenarios).map(kind => check(`E-WPN-07 report ${kind}`, () => weaponBenchmark(kind,Engine)));
const result = { checks, weapons, escort, diversity:diversityResult, pilot, mutations };
writeFileSync('docs/essaim-validation.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
assert.ok(checks.every(c => c.passed),'Essaim validation failed');
assert.ok(mutations.every(m => m.killed),'Surviving mutation');
process.exitCode = 0;
