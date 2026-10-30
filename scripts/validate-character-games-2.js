/* global console, performance, process */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mutationModule } from './mutation-module.js';
const checks = await import('../tests/character-games-2-checks.ts');
const { rendered } = await import('../tests/character-games-checks.ts');
const { Engine: Race } = await import('../src/engines/derapage/engine.ts');
const { Engine: Snake, difficulty } = await import('../src/engines/serpentin/engine.ts');
const { Engine: Bubble } = await import('../src/engines/bubble/engine.ts');
const { solutions } = await import('../tests/bubble-solutions.ts');
const { createThumbnail } = await import('../src/games/traverse/thumbnail.ts');
const fixtures = { ...JSON.parse(readFileSync('tests/fixtures/characters-campaigns-2.json', 'utf8')), ...JSON.parse(readFileSync('tests/fixtures/serpentin-campaign.json', 'utf8')) };
globalThis.matchMedia = () => ({ matches: false });
const timings = [], mutations = [], records = { derapage: [], bubble: [], serpentin: [] };
function run(name, check) { const start = performance.now(); check(); const ms = performance.now() - start; timings.push({ name, ms: Math.round(ms) }); if (process.argv.includes('--timings')) console.log(`${name}: ${ms.toFixed(1)} ms`); }
for (const game of ['derapage', 'bubble', 'serpentin']) {
    run(`P-${game}-01`, () => {
        rendered(); const source = readFileSync(`src/games/${game}/scene.ts`, 'utf8');
        assert.match(source, /private hero = new GameCharacter\(\)/); assert.match(source, game === 'serpentin' ? /this.hero.draw\(g,/ : /this.paint\?\.draw\(/); assert.match(source, /character: this.hero.snapshot\(\)/);
    });
    run(`P-${game}-02/03`, checks[`${game}Effect`]); run(`P-${game}-05`, checks.balance);
    run(`P-${game}-03 advance partition`, () => {
        const Engine = game === 'derapage' ? Race : game === 'bubble' ? Bubble : Snake;
        const a = new Engine(), b = new Engine(); assert(a.special()); assert(b.special());
        a.advance(800); b.advance(150); b.advance(650); assert.deepEqual(a.snapshot(), b.snapshot());
    });
}
for (let level = 0; level < 30; level++) {
    const raceResults = [];
    for (const [mode, proof] of fixtures.derapage[level].entries()) {
        // Ordinary races already have exact historical replays in validate-derapage.
        // CI keeps complete special races at 1/10/30 and bounded activation checks
        // on every other track. The 30 complete ordinary historical races remain
        // hashed at every step in validate-derapage. Full audit runs both modes.
        if (process.argv.includes('--checks-only') && mode === 0 && level !== 0 && level !== 29) continue;
        const e = new Race(level), active = new Set(proof.activations);
        const shortReplay = process.argv.includes('--checks-only') && ![0, 9, 29].includes(level);
        // Keep the full historical witness, with independently timed bounded batches.
        for (let first = 0; first < proof.inputs.length; first += 100) {
            run(`P-derapage-04 L${level + 1} mode ${mode} frames ${first}..${first + 99}`, () => {
                for (let frame = first; frame < Math.min(first + 100, proof.inputs.length); frame++) {
                    if (shortReplay && frame >= 100) break;
                    const [steer, bonus] = proof.inputs[frame];
                    if (active.has(frame)) assert(e.special()); e.input({ steer, bonus: Boolean(bonus), drift: false }); e.advance(1000 / 60);
                }
            });
            if (shortReplay) break;
        }
        run(`P-derapage-04 L${level + 1} mode ${mode} final state`, () => {
            if (shortReplay) {
                assert.equal(e.frames, 100); assert(e.special()); assert(!e.special());
                assert.equal(e.karts[0].specialMs, 800); e.step(800);
                assert.equal(e.karts[0].specialLap, 0); assert.equal(e.karts[0].specialMs, 0);
                assert(!e.special()); return;
            }
            assert.equal(e.status, 'won'); assert.equal(e.score, proof.score); assert.equal(e.time, proof.time); assert.equal(e.bestLapMs, proof.bestLapMs);
            raceResults.push({ score: e.score, raceMs: e.time, bestLapMs: e.bestLapMs, uses: proof.activations.length });
        });
    }
    records.derapage.push({ level: level + 1, without: raceResults[0], with: raceResults[1] });
    run(`P-bubble-04 L${level + 1} historical solution`, () => {
        const results = [];
        // Arm on an already matching shot: same effect/score, proof remains valid.
        for (const special of [false, true]) {
            const e = new Bubble(); e.loadLevel(level, 28); let used = false;
            for (const shot of solutions[level]) {
                if (shot.swap) assert(e.swap()); e.aim(shot.angle);
                if (special && !used && e.trace().struck?.color === e.next) { assert(e.special()); used = true; }
                assert(e.shoot()); e.advance(10000);
            }
            assert.equal(e.status, 'won'); assert.equal(e.specialUses, special ? 0 : 1);
            results.push({ shots: e.shots, score: e.score });
        }
        records.bubble.push({ level: level + 1, without: results[0], with: results[1] });
    });
    run(`P-serpentin-04 L${level + 1} recorded ordinary pilot`, () => {
        const results = [];
        for (const special of [false, true]) {
            const e = new Snake(level); if (special) assert(e.special());
            for (const d of fixtures.serpentin[level].inputs) {
                if (d) e.input(d); const ticks = Math.ceil((60 - e.snapshot().movement - 0.00000001) / difficulty(level).speed); e.advance(ticks * 1000 / 60);
            }
            assert.equal(e.status, 'won'); assert.equal(e.state.score, fixtures.serpentin[level].score); assert.equal(e.specialUses, special ? 0 : 1);
            results.push({ moves: fixtures.serpentin[level].inputs.length, score: e.state.score });
        }
        records.serpentin.push({ level: level + 1, without: results[0], with: results[1] });
    });
}
{
    const demo = createThumbnail(), palette = new Map();
    let previous = new Uint16Array(160 * 120), unchanged = 0;
    for (let batch = 0; batch < 4; batch++) run(`Traverse rendered pixels ${batch * 500}..${batch * 500 + 499}`, () => {
        for (let step = 0; step < 500; step++) {
            demo.step(); const pixels = new Uint16Array(160 * 120);
            let color = 0, arc = null;
            const paint = (left, top, width, height, circle = null) => {
                for (let y = Math.max(0, Math.floor(top)); y < Math.min(120, Math.ceil(top + height)); y++) {
                    for (let x = Math.max(0, Math.floor(left)); x < Math.min(160, Math.ceil(left + width)); x++) {
                        if (x + 0.5 < left || x + 0.5 >= left + width || y + 0.5 < top || y + 0.5 >= top + height) continue;
                        const dx = circle ? x + 0.5 - circle.x : 0, dy = circle ? y + 0.5 - circle.y : 0;
                        if (!circle || dx * dx + dy * dy <= circle.r * circle.r) pixels[y * 160 + x] = color;
                    }
                }
            };
            demo.draw({
                save() {}, restore() {}, beginPath() { arc = null; },
                set fillStyle(value) { if (!palette.has(value)) palette.set(value, palette.size + 1); color = palette.get(value); },
                fillRect: paint,
                arc(x, y, r) { arc = { x, y, r }; },
                fill() { if (arc) paint(arc.x - arc.r, arc.y - arc.r, arc.r * 2, arc.r * 2, arc); },
            });
            unchanged = pixels.every((value, index) => value === previous[index]) ? unchanged + 1 : 0;
            assert(unchanged < 36); previous = pixels;
        }
    });
}
for (const [game, before, after] of [
    ['derapage', 'k.specialMs = 800;', 'k.specialMs = 0;'],
    ['derapage', 'k.specialLap === k.lap', 'false'],
    ['bubble', 'trajectory.target.color = struck.color', 'trajectory.target.color = this.next'],
    ['bubble', 'this.specialUses === 0', 'this.specialUses < 0'],
    ['bubble', "struck.kind !== 'star')", "struck.kind !== 'star' && struck.kind !== 'bomb')"],
    ['serpentin', 'if (!this.specialArmed)', 'if (true)'],
    ['serpentin', 'this.specialUses === 0', 'this.specialUses < 0'],
]) {
    const file = `src/engines/${game}/engine.ts`, source = readFileSync(file, 'utf8');
    const { module } = await mutationModule('../' + file, before, after);
    run(`mutation ${game} ${before}`, () => assert.throws(() => checks[`${game}Effect`](module.Engine)));
    mutations.push({ file, line: source.slice(0, source.indexOf(before)).split('\n').length, mutation: before, killed: true });
}
{
    const file = 'src/characters/game.ts', source = readFileSync(file, 'utf8'), before = 'readonly id: CharacterId = selectedCharacter();';
    const { module } = await mutationModule('../' + file, before, "readonly id: CharacterId = 'panda';");
    run('mutation always default hero for three games', () => assert.throws(() => rendered(module.GameCharacter)));
    mutations.push({ file, line: source.slice(0, source.indexOf(before)).split('\n').length, mutation: 'always panda', killed: true });
}
console.log(JSON.stringify({ timings, mutations, records }, null, 2));
