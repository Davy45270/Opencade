/* global console, performance, process */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transpile } from './transpile.js';
const lander = await import('../src/engines/alunir/engine.ts');
// Execute the unchanged U06/U07 bodies and their original contact helper, without Vitest.
const source = readFileSync('tests/alunir.test.ts', 'utf8');
const helper = source.slice(source.indexOf('function contact('), source.indexOf("test('U01"));
const bodies = source.slice(source.indexOf("test('U06"), source.indexOf("test('U08"));
const names = ['Engine', 'STEP', 'difficulty', 'polygon', 'required'];
new Function(...names, 'test', 'expect', transpile(helper + bodies))(...names.map(key => lander[key]), (_name, body) => body(), value => ({ toBe: expected => assert.equal(value, expected) }));
const { effects, balance, decisiveShield, thumbnailMotion, boundaries } = await import('../tests/character-games-4-checks.ts');
for (const [game, run] of Object.entries(effects)) { run(); balance(game); console.log(`P-${game}-02/03/05 passed`); }
decisiveShield(); boundaries(); const rasterStart = performance.now(); thumbnailMotion(); void rasterStart;
console.log('Alunir U06/U07 unchanged bodies passed; Traverse 2000 recorded drawings passed. P-01: validate-action-scenes; P-04: existing game validators.');
const fixtures = JSON.parse(readFileSync('tests/fixtures/characters-campaigns-4.json', 'utf8'));
const records = {}, mutations = [];
for (const game of ['ferraille', 'briqueterie', 'essaim']) {
    const { Engine } = await import(`../src/engines/${game}/engine.ts`);
    records[game] = [];
    assert.equal(fixtures[game].length, 60);
    for (const record of fixtures[game]) {
        const e = new Engine(); e.loadLevel(record.level, 28);
        let frames = 0, activations = 0;
        for (const [count, input, trigger] of record.commands) {
            for (let n = 0; n < count; n++) {
                if (game === 'ferraille') e.input(input);
                else if (game === 'briqueterie') { e.move(input); e.launch(); }
                else { if (input[0] !== null) e.moveTo(input[0]); e.holdFire(input[1]); }
                if (trigger && n === 0) { assert(e.special()); activations++; }
                e.step(1000 / 60); frames++;
            }
        }
        assert.equal(e.status, 'won'); assert.equal(frames, record.frames); assert.equal(e.state.score, record.score); assert.equal(e.state.lives, record.lives); assert.equal(activations, record.special ? 1 : 0);
        records[game].push({ level: record.level + 1, special: record.special, score: record.score, lives: record.lives, frames });
    }
}
const { mutationModule } = await import('./mutation-module.js');
for (const [game, before, after] of [
    ['ferraille', 'enemy.hp -= 3;', 'enemy.hp -= 0;'],
    ['ferraille', 'enemy.hp -= 3; s.score += 100;', 'enemy.hp -= 3; s.score += 0;'],
    ['ferraille', 'cage.hp = Math.max(0, cage.hp - 3);', 'cage.hp = Math.max(0, cage.hp - 0);'],
    ['ferraille', 's.score += Math.min(3, s.boss.hp) * 20;', 's.score += 0;'],
    ['ferraille', 's.specialCooldown = 600; s.specialTicks = 18;', 's.specialCooldown = 600; s.specialTicks = 1;'],
    ['briqueterie', 'this.portal(ball, hit.brick, hit);', 'void 0;'],
    ['briqueterie', "this.damage(hit.brick); this.events.push('pierce');", "this.damage(hit.brick); if (hit.brick.kind === 'regen') this.damage(hit.brick); this.events.push('pierce');"],
    ['essaim', 'if ((s.specialTicks ?? 0) > 0 || !forced && s.invulnerable > 1e-8) return;', 'if (!forced && ((s.specialTicks ?? 0) > 0 || s.invulnerable > 1e-8)) return;'],
    ['ferraille', '(s.specialCooldown ?? 0) > 0', 'false'],
    ['briqueterie', 'ball.pierce = 3;', 'ball.pierce = 0;'],
    ['briqueterie', "this.status !== 'playing' || s.specialUsed", "this.status !== 'playing'"],
    ['essaim', 's.specialTicks = 120;', 's.specialTicks = 0;'],
    ['essaim', "this.status !== 'playing' || s.specialUsed", "this.status !== 'playing'"],
]) {
    const file = `src/engines/${game}/engine.ts`, source = readFileSync(file, 'utf8');
    const mutant = await mutationModule(`../${file}`, before, after);
    let killed = false; try { effects[game](mutant.module.Engine); } catch { killed = true; }
    assert(killed, `${game}: ${before}`); mutations.push({ file, line: source.slice(0, source.indexOf(before)).split('\n').length, before, after, killed });
}
// The existing real-scene validator supplies the independent selected-hero oracle.
const painterFile = 'src/characters/action-phaser.ts', painter = readFileSync(painterFile, 'utf8');
const { spawnSync } = await import('node:child_process');
const defaultHero = spawnSync(process.execPath, ['--import', './scripts/ts-loader.js', 'scripts/validate-action-scenes.js', '--mutant-character'], { encoding: 'utf8', timeout: 30000 });
assert(defaultHero.status !== 0 && defaultHero.stderr.includes('AssertionError'), 'default hero mutant rejected by actual rendering');
mutations.push({ file: painterFile, line: painter.slice(0, painter.indexOf('readonly id: CharacterId = selectedCharacter();')).split('\n').length, before: 'selectedCharacter()', after: "'panda'", oracle: 'validate-action-scenes.js: actual hero texture for all five identities', killed: true });
for (const [file, before, after, flag] of [
    ...['ferraille', 'briqueterie', 'essaim'].map(game => [`src/games/${game}/scene.ts`, "if (e.code === 'KeyC' && !e.repeat) this.special();", "if (e.code === 'KeyC' && !e.repeat) void 0;", `--mutant-c=${game}`]),
    ['src/games/essaim/scene.ts', "s.specialUsed ? 'UTILISÉ' : 'PRÊT'", "s.specialUsed ? 'PRÊT' : 'PRÊT'", '--mutant-hud'],
    ['src/engines/ferraille/engine.ts', 's.specialCooldown = 600; s.specialTicks = 18;', 's.specialCooldown = 600; s.specialTicks = 1;', '--mutant-duration'],
]) {
    const result = spawnSync(process.execPath, ['--import', './scripts/ts-loader.js', 'scripts/validate-action-scenes.js', flag], { encoding: 'utf8', timeout: 30000 });
    assert(result.status !== 0 && result.stderr.includes('AssertionError'), `${flag} rejected by real keyboard/HUD/drawing oracle`);
    mutations.push({ file, before, after, oracle: 'validate-action-scenes.js: keyboard, HUD and visual lifetime', killed: true });
}
const { writeFileSync } = await import('node:fs');
writeFileSync('docs/characters-games-4-validation.json', JSON.stringify({ records, mutations, alunir: 'Unchanged U06/U07 bodies passed', traverse: '2000 raster drawings; fewer than 9 unchanged at 15Hz', e2e: 'written, not executed locally' }, null, 2) + '\n');
console.log(`180 winning recorded campaigns (30 levels × 2 modes × 3 games); ${mutations.length} mutations killed.`);
