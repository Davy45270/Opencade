/* global console, process */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { mutationModule } from './mutation-module.js';
const { Engine } = await import('../src/engines/ferraille/engine.ts');
const { behaviors, diversity, campaign, terrain } = await import('../tests/ferraille-behavior.ts');
const checks = [];
for (const [name, run] of Object.entries(behaviors)) {
    try { run(Engine); checks.push({ name, passed: true }); }
    catch (error) { checks.push({ name, passed: false, error: String(error) }); }
}
let diversityResult, pilot;
for (const [name, run] of [['F-DIV-01', () => diversityResult = diversity()], ['F-TERRAIN', terrain], ['F-PILOT', () => pilot = [460, 28].map(seed => ({ seed, levels: campaign(Engine, seed) }))]]) {
    try { run(); checks.push({ name, passed: true }); }
    catch (error) { checks.push({ name, passed: false, error: String(error) }); }
}
const source = readFileSync('src/engines/ferraille/engine.ts', 'utf8');
const mutations = [];
for (const [name, before, after, test] of [
    ['all levels equal level 1', 'this.state = generate(this.level, seed)', 'this.state = generate(0, seed)', diversity],
    ['stationary kamikaze', 'e.vx = e.clock < 950 ? (e.facing ?? -1) * 95 : 0;', 'e.vx = 0;', behaviors['F-ENEMY-02 kamikaze closes distance each step then commits to charge']],
    ['frontal armor removed', "if (enemy.kind === 'armored' && !(enemy.turned ?? 0) && Math.sign(shot.vx) !== (enemy.facing ?? -1)) return;", '', behaviors['F-ENEMY-04 armor rejects front, accepts rear and overturned']],
    ['ricochet disabled', 'shot.vx = wallX ? -vx : vx; shot.vy = wallY ? -vy : vy;', 'shot.life = 0;', behaviors['F-WEAPON-02 bounce reflects independently on floor and wall']],
    ['grenade area zero', 'Math.hypot(enemy.x - shot.x, enemy.y - shot.y) <= 64', 'Math.hypot(enemy.x - shot.x, enemy.y - shot.y) <= 0', behaviors['F-WEAPON-03 grenade parabola and bounded area']],
    ['distant boss repeats frozen threshold', 'const previousClock = boss.clock;', 'const previousClock = boss.clock - DT;', behaviors['F-BOSS-04 departure freezes cadence after attack and resumes once']],
    ['grenades bypass closed core', 'if (s.boss?.exposed && Math.hypot(s.boss.x - shot.x, s.boss.y - shot.y) <= 64)', 'if (s.boss && Math.hypot(s.boss.x - shot.x, s.boss.y - shot.y) <= 64)', behaviors['F-BOSS-05 grenades respect closed and exposed core']],
    ['guardian 15 bombs removed', "pattern === 'bombs' || (pattern === 'reactor' && boss.phase === 3)", "(pattern === 'bombs' && boss.hp < 0) || (pattern === 'reactor' && boss.phase === 3)", behaviors['F-BOSS-06 guardian 15 rains three bombs above player']],
    ['floor relief removed', "const height = config.structure === 'ascent' ? Math.min(4, Math.max(0, Math.floor((x - 20) / 8))) : Math.max(0, 4 - Math.floor(x / 8));", 'const height = 0;', terrain],
    ['cage blast radius removed', '<= 64) cage.hp = 0;', '<= 0) cage.hp = 0;', behaviors['F-STRUCT-02 grenade opens cage within radius only']],
    ['grenade radius shrunk to 48', 'Math.hypot(enemy.x - shot.x, enemy.y - shot.y) <= 64', 'Math.hypot(enemy.x - shot.x, enemy.y - shot.y) <= 48', behaviors['F-WEAPON-04 grenade boundary includes 64 excludes beyond']],
    ['grenade radius exceeds boundary', 'Math.hypot(enemy.x - shot.x, enemy.y - shot.y) <= 64', 'Math.hypot(enemy.x - shot.x, enemy.y - shot.y) <= 65', behaviors['F-WEAPON-04 grenade boundary includes 64 excludes beyond']],
    ['boss weakness ignored', 'if (boss.exposed) { boss.hp--;', '{ boss.hp--;', behaviors['F-BOSS-01 invulnerable telegraph and exposed core']],
]) {
    const mutant = await mutationModule('../src/engines/ferraille/engine.ts', before, after);
    let killed = false, error;
    try { test(mutant.module.Engine); } catch (e) { killed = true; error = String(e); }
    mutations.push({ name, file: 'src/engines/ferraille/engine.ts', line: source.slice(0, source.indexOf(before)).split('\n').length, killed, error });
}
const result = { checks, diversity: diversityResult && { score: diversityResult.score, noveltyCount: diversityResult.noveltyCount, noveltyLevels: diversityResult.noveltyLevels, cloneShare: diversityResult.cloneShare, maxGapWithoutNovelty: diversityResult.maxGapWithoutNovelty }, pilot, mutations };
writeFileSync('docs/ferraille-validation.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
assert.ok(checks.every(c => c.passed), 'Ferraille validation failed');
assert.ok(mutations.every(m => m.killed), 'Surviving mutation');
process.exitCode = 0;
