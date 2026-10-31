import assert from 'node:assert/strict';
import type Phaser from 'phaser';
import { Engine, chooseShot, GRAVITY, FIXED_MS, WEAPONS, signature, type Weapon } from '../src/engines/artificiers/engine';
import { Terrain, WIDTH, HEIGHT } from '../src/engines/artificiers/terrain';
import { LEVELS, levelAt } from '../src/engines/artificiers/levels';
import { ids } from '../src/characters/model';
import { AimDriver } from '../src/games/artificiers/driver';
import { countedGraphics, drawDynamic, drawScenery, drawMunition, WORLD_SCALE, PANEL_TOP } from '../src/games/artificiers/art';
import { bounded, withinWork, WORK_LIMIT, charge } from './artificiers-budget';
import { Random } from '../src/engines/shared/random';
import { createDemo } from '../src/engines/artificiers/demo';
function close(a: number, b: number, tolerance = .00001): void { assert.ok(Math.abs(a - b) < tolerance, `${String(a)} / ${String(b)}`); }
function empty(): Engine { const e = new Engine(1, 220, 'duo'); e.terrain.mask.fill(0); e.terrain.material.fill(0); e.terrain.hardness.fill(0); return e; }
export function trajectory(): void {
    const e = empty(); e.wind = 0;
    const p = { x: 100, y: 150, vx: 100, vy: -100, age: 0, bounces: 0, weapon: 0 as const, owner: 0 };
    for (let i = 0; i < 10; i++) assert.equal(e.integrate(p), 'flying');
    close(p.x, 120); close(p.vx, 100); close(p.vy, -100 + GRAVITY * .2);
    close(p.y, 150 - 20 + GRAVITY * .02 ** 2 * 55);
    const q = { ...p }; e.wind = 40; e.integrate(q); e.wind = -40; e.integrate(p);
    assert.ok(q.x > p.x && q.vx > p.vx);
}
export function craters(): void {
    const t = new Terrain(levelAt(0)); t.mask.fill(0); t.material.fill(0); t.hardness.fill(0);
    t.rect(60, 300, 80, 80, 1); const before = t.mask.reduce((a, b) => a + b, 0);
    const removed = t.carve(100, 340, 20);
    assert.ok(removed > 280 && removed < 340); assert.equal(t.mask.reduce((a, b) => a + b, 0), before - removed);
    assert.ok(!t.solid(100, 340)); assert.ok(t.solid(60, 300));
    t.rect(90, 330, 20, 20, 2); assert.equal(t.carve(100, 340, 12), 0); assert.ok(t.solid(100, 340));
    assert.ok(t.carve(100, 340, 12) > 0); assert.ok(!t.solid(100, 340));
    t.set(100, 340, 3); t.carve(100, 340, 2); assert.ok(!t.solid(100, 340));
    assert.ok(t.dirty.at(-1)?.width && (t.dirty.at(-1)?.width ?? WIDTH) < WIDTH);
}
export function fallsAndWater(): void {
    const e = empty(); e.terrain.rect(0, 500, WIDTH, 100, 1);
    e.actor.x = 50; e.actor.y = 330; e.actor.fallY = 330; e.actor.vy = 0;
    const other = e.units[1]; assert.ok(other); other.x = 300; other.y = 492; other.fallY = 492;
    e.advance(2400); assert.ok(e.actor.hp < 50 && e.actor.hp > 0); close(e.actor.y, 493, 1.2);
    const f = new Engine(); f.actor.y = 605; f.advance(FIXED_MS); assert.equal(f.actor.hp, 0); assert.equal(f.status, 'lost');
}
export function blastPush(): void {
    const e = new Engine(); const a = e.actor, x = a.x, hp = a.hp;
    e.explode(a.x - 18, a.y, 0); assert.ok(a.hp < hp); assert.ok(a.vx > 0 && a.vy < 0);
    e.advance(200); assert.ok(a.x > x); assert.ok(e.destroyed > 0);
}
export function weapons(): void {
    assert.equal(WEAPONS.length, 6); assert.equal(new Set(WEAPONS.map(w => w.name)).size, 6);
    assert.equal(new Set(Object.values(signature)).size, 5);
    for (const hero of ids) {
        const e = new Engine(0, 220, 'solo', hero), w = signature[hero];
        assert.ok(e.selectWeapon(w)); const count = e.actor.ammo[w] ?? 0;
        assert.ok(e.shoot()); assert.equal(e.actor.ammo[w], count - 1); assert.ok(!e.shoot());
        assert.equal(e.projectile?.weapon, w);
    }
    const e = empty(); e.terrain.rect(0, 450, 360, 40, 1);
    const p = { x: 140, y: 445, vx: 30, vy: 100, age: 400, bounces: 0, weapon: 4 as const, owner: 0 };
    for (let i = 0; i < 5 && p.bounces === 0; i++) e.integrate(p);
    assert.equal(p.bounces, 1); assert.ok(p.vy < 0);
    const star = { x: 140, y: 300, vx: 40, vy: -20, age: 400, bounces: 0, weapon: 3 as const, owner: 0 }, stone = { ...star, weapon: 0 as const };
    e.wind = 0; e.integrate(star); e.integrate(stone); assert.ok(star.vx > stone.vx);
    const soil = new Engine(); soil.terrain.rect(90, 300, 30, 30, 2); soil.explode(104, 314, 2); assert.ok(!soil.terrain.solid(104, 314));
}
export function movementAndRope(): void {
    const e = new Engine(); const x = e.actor.x;
    for (let i = 0; i < 20; i++) e.move(1);
    assert.ok(e.actor.x > x && e.actor.x <= x + 48); assert.equal(e.moveLeft, 0); assert.ok(!e.move(1));
    const f = empty(); f.actor.x = 50; f.actor.y = 320; f.actor.fallY = 320;
    f.terrain.rect(82, 250, 60, 12, 3); f.aim(-.9, 100);
    assert.ok(f.move(1)); // Attaching remains legal after movement.
    assert.ok(f.grapple()); assert.ok(f.rope); const y = f.actor.y;
    f.advance(120); assert.ok(f.actor.y < y); assert.ok(f.jump()); assert.equal(f.rope, null); assert.ok(f.actor.vy < 0);
    const rope = empty(); rope.actor.x = 50; rope.actor.y = 320; rope.terrain.rect(82, 250, 60, 12, 3); rope.aim(-.9, 100);
    assert.ok(rope.grapple());
    for (let i = 0; i < 9; i++) assert.ok(rope.move(-1));
    assert.equal(rope.moveLeft, 0); assert.ok(rope.grapple()); assert.equal(rope.rope, null);
    assert.ok(!rope.grapple());
    const g = new Engine(); assert.ok(g.jump()); assert.ok(!g.jump()); g.advance(200); assert.ok(g.actor.y < g.actor.fallY + 1);
}
export function turnsAndDuo(): void {
    const e = new Engine(1, 220, 'duo'), oldWind = e.wind;
    assert.equal(e.units[0]?.hp, e.units[1]?.hp);
    e.advance(25000); assert.equal(e.turn, 1); assert.equal(e.actor.team, 1); assert.equal(e.timer, 25000); assert.notEqual(e.wind, oldWind);
    e.advance(2000); assert.equal(e.shots, 0); assert.ok(e.shoot());
    e.advance(9000); assert.ok(e.snapshot().turn >= 2 || e.status !== 'playing');
    const f = new Engine(0); f.advance(26000); assert.equal(f.turn, 2); assert.equal(f.shots, 0);
}
export function cratesAndSudden(): void {
    const e = new Engine(1, 220, 'duo'); e.turn = 2; e.endTurn(); assert.equal(e.crates.length, 1);
    const c = e.crates[0]; assert.ok(c); const cy = c.y; e.advance(100); assert.ok(c.y > cy);
    e.actor.hp = 40; e.crates = [{ x: e.actor.x, y: e.actor.y, kind: 'health' }]; e.advance(20); assert.equal(e.actor.hp, 70);
    const w = signature[e.actor.hero], n = e.actor.ammo[w] ?? 0;
    e.crates = [{ x: e.actor.x, y: e.actor.y, kind: 'ammo' }]; e.advance(20); assert.equal(e.actor.ammo[w], n + 2);
    e.turn = e.config.sudden - 1; e.endTurn(); assert.equal(e.water, 597);
    e.actor.y = 595; e.advance(20); assert.equal(e.actor.hp, 0);
}
export function serialization(): void {
    const a = new Engine(9); a.step(13); const shot = chooseShot(a); a.aim(shot.angle, shot.power); a.selectWeapon(shot.weapon); a.shoot(); a.step(347);
    const s = JSON.parse(JSON.stringify(a.snapshot())) as ReturnType<Engine['snapshot']>;
    const b = new Engine(); b.restore(s); assert.deepEqual(b.snapshot(), s);
    a.step(1873); for (const ms of [10, 200, 600, 1063]) b.step(ms);
    assert.deepEqual(a.snapshot(), b.snapshot()); assert.ok(b.remainder >= 0 && b.remainder < FIXED_MS);
    const before = a.snapshot(); a.step(-20); a.step(NaN); a.aim(NaN, Infinity); assert.deepEqual(a.snapshot(), before);
}
export function aiAccuracy(): void {
    const e = new Engine(0), before = e.snapshot();
    const hard = chooseShot(e, 2), easy = chooseShot(e, 0), middle = chooseShot(e, 1);
    assert.deepEqual(e.snapshot(), before); assert.deepEqual(chooseShot(e, 2), hard);
    const target = e.units[1]; assert.ok(target);
    const error = (shot: ReturnType<typeof chooseShot>) => { const p = e.trace(shot); return Math.hypot(p.x - target.x, p.y - target.y); };
    assert.ok(error(easy) > error(middle) && error(middle) > error(hard)); assert.ok(error(hard) < 12);
    for (let i = 0; i < 4 && e.status === 'playing'; i++) {
        const s = chooseShot(e); e.aim(s.angle, s.power); e.selectWeapon(s.weapon); assert.ok(e.shoot());
        for (let frame = 0; frame < 500 && e.playing && (e.phase !== 'aim' || e.actor.team !== 0); frame++) e.advance(100);
    }
    assert.equal(e.status, 'won');
}
export function aiWindOracle(): void {
    for (const wind of [-48, 48]) {
        const e = new Engine(1, 19, 'duo'); e.wind = wind;
        const before = e.snapshot(), target = e.units[1]; assert.ok(target);
        const score = (x: number, y: number, weapon: Weapon) => {
            const w = WEAPONS[weapon];
            return -Math.hypot(target.x - x, target.y - y) + e.units.reduce((sum, u) => {
                const distance = Math.hypot(u.x - x, u.y - y);
                return sum + (u.team === e.actor.team ? -2.4 : 2) * (distance < w.radius + 15 ? w.damage * Math.max(.15, 1 - distance / (w.radius + 15)) : 0);
            }, 0);
        };
        // Independent brute sweep: construct projectiles directly and run the real
        // integrator, without calling launch(), trace() or the AI search/scoring.
        const impactScore = (angle: number, power: number, weapon: Weapon) => {
            const p = { x: e.actor.x + Math.cos(angle) * 12, y: e.actor.y + Math.sin(angle) * 12 - 3,
                vx: Math.cos(angle) * power, vy: Math.sin(angle) * power, age: 0, bounces: 0, weapon, owner: e.actor.id };
            for (let frame = 0; frame < 400; frame++) {
                const result = e.integrate(p);
                if (result === 'impact') return score(p.x, p.y, weapon);
                if (result === 'outside') break;
            }
            return -Infinity;
        };
        let oracle = -Infinity;
        for (const weapon of [0, signature[e.actor.hero]] as Weapon[]) for (let degree = 8; degree <= 172; degree += 4)
            for (let power = 70; power <= 245; power += 10) oracle = Math.max(oracle, impactScore(-degree * Math.PI / 180, power, weapon));
        const shot = chooseShot(e, 2); close(impactScore(shot.angle, shot.power, shot.weapon), oracle);
        assert.ok(Number.isFinite(oracle)); assert.deepEqual(e.snapshot(), before);
        const still = new Engine(1, 19, 'duo'); still.wind = 0;
        const wrong = chooseShot(still, 2);
        assert.ok(impactScore(wrong.angle, wrong.power, wrong.weapon) < oracle, 'Oracle sensible au vent');
    }
}
export function diversityMetrics() {
    return LEVELS.map((l, i) => {
        const t = new Terrain(l); let area = 0, edges = 0, massX = 0, massY = 0;
        for (let y = 180; y < 606; y += 2) for (let x = 0; x < WIDTH; x += 2) if (t.solid(x, y)) {
            area++; massX += x; massY += y; if (!t.solid(x, y - 2)) edges++;
        }
        return { level: i + 1, area, edges, centroid: [massX / area, massY / area], distance: l.right - l.left, shape: l.shape, mission: l.mission, teams: l.teams, wind: l.wind };
    });
}
export function diversity(): void {
    assert.equal(LEVELS.length, 30); assert.equal(new Set(LEVELS.map(l => l.name)).size, 30);
    const metrics = diversityMetrics(), terrains = LEVELS.map(l => new Terrain(l));
    assert.equal(new Set(metrics.map(m => m.shape)).size, 6); assert.equal(new Set(metrics.map(m => m.mission)).size, 4);
    assert.ok(Math.max(...metrics.map(m => m.distance)) - Math.min(...metrics.map(m => m.distance)) >= 90);
    assert.ok(Math.max(...metrics.map(m => m.area)) / Math.min(...metrics.map(m => m.area)) > 1.5);
    for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) {
        const a = terrains[i], b = terrains[j], ma = metrics[i], mb = metrics[j]; assert.ok(a && b && ma && mb);
        charge('cells', a.mask.length);
        let diff = 0, union = 0;
        for (let k = 0; k < a.mask.length; k++) { const n = a.mask[k] ?? 0, m = b.mask[k] ?? 0; if (n !== m) diff++; if (n || m) union++; }
        const sameMechanic = ma.shape === mb.shape && ma.mission === mb.mission && ma.teams === mb.teams;
        assert.ok(diff / union >= .06 || Math.abs(ma.distance - mb.distance) >= 20 || !sameMechanic, `Cartes proches ${String(i + 1)}/${String(j + 1)}`);
        assert.ok(diff / union > .025, `Masques proches ${String(i + 1)}/${String(j + 1)}`);
    }
}
export function fingerWin(level: number): void {
    const e = new Engine(level), driver = new AimDriver(e), rng = new Random(73); let actions = 0;
    // 390 px viewport minus the two 16 px gutters: Phaser FIT is 358 / 360.
    // Vertical screen noise is inverted through the reserved-band projection too.
    const noise = () => (Math.floor(rng.next() * 25) - 12) / (358 / 360);
    while (e.playing && e.turn < 32 && actions < 25) {
        if (e.phase === 'aim' && e.actor.team === 0) {
            const s = chooseShot(e); e.selectWeapon(s.weapon);
            const a = e.actor, start = { x: a.x + noise(), y: a.y + noise() / WORLD_SCALE, id: 7 };
            const end = { x: a.x + Math.cos(s.angle) * s.power / 1.25 + noise(), y: a.y + Math.sin(s.angle) * s.power / 1.25 + noise() / WORLD_SCALE, id: 7 };
            e.advance(150); assert.ok(driver.down(start)); e.advance(150); driver.move(end); e.advance(150); assert.ok(driver.up(end)); actions++;
        }
        e.advance(100);
    }
    assert.ok(e.time < 1000000);
    assert.equal(e.status, 'won', `Doigt N${String(level + 1)}`); assert.ok(actions > 0);
}
export function inputSafety(): void {
    const e = new Engine(), d = new AimDriver(e), a = e.actor;
    assert.ok(!d.down({ x: 10, y: 10, id: 1 })); assert.ok(!d.up({ x: 180, y: 100, id: 1 }));
    assert.ok(d.down({ x: a.x, y: a.y, id: 1 })); assert.ok(!d.up({ x: 180, y: 100, id: 2 }));
    d.cancel(); assert.ok(!d.up({ x: 180, y: 100, id: 1 })); assert.equal(e.shots, 0);
    const blocked = new AimDriver(e, () => false); assert.ok(!blocked.down({ x: a.x, y: a.y, id: 0 }));
    const duo = new Engine(1, 220, 'duo'), held = new AimDriver(duo);
    assert.ok(held.down({ x: duo.actor.x, y: duo.actor.y, id: 3 }));
    duo.advance(25000); assert.ok(!held.up({ x: 180, y: 200, id: 3 })); assert.equal(duo.shots, 0);
}
export function graphicsBudget(): void {
    let before = 0, after = 0, actual = 0;
    const raw = new Proxy({}, { get: () => () => { actual++; charge('calls', 1); } }) as Phaser.GameObjects.Graphics;
    const budget = { calls: 0, limit: 500 }, g = countedGraphics(raw, budget);
    const check = (calls: number) => { assert.ok(calls <= budget.limit, `Graphics ${String(calls)}`); };
    for (let level = 0; level < 30; level++) {
        const e = new Engine(level);
        e.blasts = Array.from({ length: 4 }, (_, i) => ({ x: i * 70, y: 400, radius: 40, time: 0, weapon: i as Weapon }));
        e.crates = [{ x: 150, y: 300, kind: 'health' }]; e.rope = { x: 100, y: 250, length: 100 };
        for (const phase of ['aim', 'flight', 'settle'] as const) {
            e.phase = phase; e.projectile = phase === 'flight' ? e.launch() : null;
            budget.calls = 0; actual = 0; drawDynamic(g, e, false); assert.equal(budget.calls, actual); // Remove the five newly added transform/wind commands for the delivered baseline.
            before = Math.max(before, budget.calls - 5);
            budget.calls = 0; actual = 0; drawDynamic(g, e, false, true); assert.equal(budget.calls, actual); check(budget.calls); after = Math.max(after, budget.calls);
        }
    }
    assert.throws(() => { check(501); }); assert.ok(before > after);
    const overload = new Engine();
    overload.crates = Array.from({ length: 130 }, () => ({ x: 180, y: 300, kind: 'health' as const }));
    budget.calls = 0; actual = 0; drawDynamic(g, overload, false, true);
    assert.equal(budget.calls, actual); assert.throws(() => { check(budget.calls); });
    for (const world of [0, 1, 2]) drawScenery(g, world);
    assert.equal(WIDTH, 360); assert.equal(HEIGHT, 640);
    graphicsCosts.before = before; graphicsCosts.after = after;
}
export const graphicsCosts = { before: 0, after: 0 };
export function structureThreshold(): void {
    for (const level of LEVELS.map((l, i) => l.mission === 'structure' ? i : -1).filter(i => i >= 0)) {
        const e = new Engine(level);
        for (const u of e.units) if (u.team === 1) u.hp = 0;
        e.advance(20); assert.equal(e.status, 'playing'); assert.equal(e.terrain.structureCount(), e.initialStructure);
        // Exactly 100 real cells, so 79 % and 80 % have no rounding ambiguity.
        const r = e.terrain.structure; e.terrain.rect(r.x, r.y, r.width, r.height, 0);
        e.terrain.structure = { x: r.x, y: r.y, width: 20, height: 20 };
        e.terrain.rect(r.x, r.y, 20, 20, 3); e.initialStructure = e.terrain.structureCount(); assert.equal(e.initialStructure, 100);
        let removed = 0;
        for (let y = r.y; y < r.y + 20; y += 2) for (let x = r.x; x < r.x + 20; x += 2) {
            if (removed < 79) { e.terrain.set(x, y, 0); removed++; }
        }
        e.advance(20); assert.equal(e.terrain.structureCount(), 21); assert.equal(e.status, 'playing');
        e.terrain.set(r.x + 18, r.y + 18, 0); e.advance(20);
        assert.equal(e.terrain.structureCount(), 20); assert.equal(e.status, 'won'); assert.equal(e.winner, 0);
    }
}
export function hudGeometry(): void {
    type Call = { method: string; args: number[] };
    const calls: Call[] = [];
    const g = new Proxy({}, { get: (_, method) => (...args: number[]) => { charge('calls', 1); calls.push({ method: String(method), args }); } }) as Phaser.GameObjects.Graphics;
    const has = (method: string, args: number[]) => calls.some(c => c.method === method && c.args.length === args.length && c.args.every((n, i) => Math.abs(n - (args[i] ?? 0)) < .00001));
    const disjoint = (bottom: number, top: number) => { assert.ok(bottom < top, `Recouvrement ${String(bottom)}/${String(top)}`); };
    assert.throws(() => { disjoint(550, PANEL_TOP); });
    for (let level = 0; level < 30; level++) {
        const e = new Engine(level, 220, 'duo');
        // Initial positions, then a real fall caused by excavation under each body.
        for (let frame = 0; frame <= 100; frame++) {
            for (const u of e.units.filter(u => u.hp > 0)) {
                disjoint((u.y + 13) * WORLD_SCALE, PANEL_TOP);
                disjoint((u.y - 30) * WORLD_SCALE, PANEL_TOP);
            }
            if (!frame) for (const u of e.units) { e.terrain.carve(u.x, u.y + 14, 24); e.terrain.carve(u.x, u.y + 14, 24); }
            e.advance(20);
        }
        e.actor.hp = 37; e.power = 137; e.wind = level % 2 ? -31 : 23; calls.length = 0;
        drawDynamic(g, e, false, true);
        assert.ok(has('fillRoundedRect', [10, 531, 340, 98, 12]));
        assert.ok(has('fillRoundedRect', [22, 595, 205 * (137 - 65) / 180, 14, 6]));
        assert.ok(has('lineBetween', [280, 581, 280 + e.wind, 581]));
        const a = e.actor; assert.ok(has('fillRect', [a.x - 15, a.y - 34, 37 * .3, 4]));
        e.status = 'playing'; e.phase = 'aim'; calls.length = 0; drawDynamic(g, e, false, true);
        const points = e.trace({ angle: e.angle, power: e.power, weapon: e.weapon }, 65).points.slice(0, 10);
        assert.ok(points.length >= 2);
        for (const p of points) assert.ok(has('fillCircle', [p.x, p.y, 1.8]));
        assert.ok(has('scaleCanvas', [1, WORLD_SCALE])); assert.ok(has('restore', []));
    }
}
export function countedWork(): void {
    // Each independent limit has an explicit negative case; no wall clock oracle.
    for (const key of ['frames', 'cells', 'calls'] as const) assert.throws(() => { withinWork({ frames: 0, cells: 0, calls: 0, [key]: WORK_LIMIT[key] + 1 }); });
    const e = new Engine();
    assert.throws(() => bounded(() => { e.advance(20); }, { ...WORK_LIMIT, frames: 0 }));
    assert.throws(() => bounded(() => e.terrain.solid(20, 20), { ...WORK_LIMIT, cells: 0 }));
    assert.throws(() => bounded(() => e.integrate(e.launch()), { ...WORK_LIMIT, calls: 0 }));
}
export function weaponArt(): void {
    const signatures = new Set<string>();
    for (let weapon = 0; weapon < 6; weapon++) {
        const calls: string[] = [];
        const g = new Proxy({}, { get: (_target, method) => (...args: unknown[]) => { charge('calls', 1); calls.push(`${String(method)}:${JSON.stringify(args)}`); } }) as Phaser.GameObjects.Graphics;
        drawMunition(g, weapon, 100, 200); assert.ok(calls.length >= 2); signatures.add(calls.join(';'));
    }
    assert.equal(signatures.size, 6);
}
export function demo(): void {
    const d = createDemo(19); const before = d.engine.time; d.step(); assert.ok(d.engine.time > before);
    d.engine.status = 'won'; d.step(); assert.equal(d.restarts, 1); assert.equal(d.engine.status, 'playing');
}
export const cases = { trajectory, craters, fallsAndWater, blastPush, weapons, movementAndRope, turnsAndDuo, cratesAndSudden, serialization, aiAccuracy, diversity, inputSafety, graphicsBudget, weaponArt, demo, structureThreshold, hudGeometry, countedWork, aiWindOracle };
