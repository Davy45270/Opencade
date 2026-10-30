import { mechanicCases } from './briqueterie-mechanics';
import { replay } from './briqueterie-replay';
import { solutions } from './briqueterie-solutions';
import { briqueterieDiversity } from '../scripts/briqueterie-diversity.js';
import { test, expect } from 'vitest';
import { Engine, STEP, contact, difficulty, type Ball, type Brick } from '../src/engines/briqueterie/engine';
const brick = (hp = 1, solid = false): Brick => ({ x: 100, y: 100, w: 32, h: 18, hp, solid });
function position(ball: Ball, bricks = [brick(3)]): Engine { const e = new Engine(); e.loadState({ ...e.state, ready: false, balls: [ball], bricks }); return e; }
test('K01 réflexion sur mur et plafond', () => {
    const e = position({ x: 7, y: 7, vx: -4, vy: -4 }); e.step(STEP);
    expect(e.state.balls[0]?.vx).toBe(4); expect(e.state.balls[0]?.vy).toBe(4);
    expect(e.state.balls[0]?.x).toBeCloseTo(9); expect(e.state.balls[0]?.y).toBeCloseTo(9);
});
test('K02 angle de raquette au centre et aux extrémités', () => {
    for (const offset of [-40, 0, 40]) {
        const e = position({ x: 180 + offset, y: 578, vx: 0, vy: 4 }); e.step(STEP);
        const b = e.state.balls[0]; expect(b?.vy).toBeLessThan(0);
        expect(b?.vx).toBeCloseTo(4 * Math.sin(offset / 46 * Math.PI / 3));
    }
});
test('K03 faces et coin arrondi de brique', () => {
    const top = position({ x: 116, y: 92, vx: 0, vy: 4 }); top.step(STEP); expect(top.state.balls[0]?.vy).toBe(-4);
    const side = position({ x: 92, y: 110, vx: 4, vy: 0 }); side.step(STEP); expect(side.state.balls[0]?.vx).toBe(-4);
    const corner = position({ x: 94, y: 94, vx: 4, vy: 4 }); corner.step(STEP);
    expect(corner.state.balls[0]?.vx).toBeCloseTo(-4); expect(corner.state.balls[0]?.vy).toBeCloseTo(-4);
    expect(contact({ x: 93, y: 93, vx: 1, vy: 0 }, brick(), 1)).toBeNull();
});
test('K04 balayage continu au plafond de vitesse et au-delà', () => {
    for (const speed of [difficulty(29).cap, 150]) {
        const e = position({ x: 116, y: 125, vx: 0, vy: -speed }); e.step(STEP);
        expect(e.state.bricks[0]?.hp).toBe(2); expect(e.state.balls[0]?.vy).toBeGreaterThan(0);
    }
});
test('K05 points de vie et score par impact puis destruction', () => {
    const e = position({ x: 116, y: 92, vx: 0, vy: 4 }, [brick(2)]); e.step(STEP);
    expect(e.state.bricks[0]?.hp).toBe(1); expect(e.state.score).toBe(10);
    e.state.balls = [{ x: 116, y: 92, vx: 0, vy: 4 }]; e.step(STEP);
    expect(e.state.bricks).toHaveLength(0); expect(e.state.score).toBe(40);
});
test('K06 indestructible rebondit et ne compte pas pour la victoire', () => {
    const e = position({ x: 116, y: 92, vx: 0, vy: 4 }, [brick(3, true)]); e.step(STEP);
    expect(e.state.bricks[0]?.hp).toBe(3); expect(e.state.score).toBe(0); expect(e.state.balls[0]?.vy).toBe(-4); expect(e.status).toBe('won');
});
test('K07 trois pertes, attente de relance et défaite', () => {
    const e = new Engine();
    for (let lives = 2; lives >= 0; lives--) {
        e.state.ready = false; e.state.balls = [{ x: 10, y: 645, vx: 0, vy: 4 }]; e.step(STEP);
        expect(e.state.lives).toBe(lives); expect(e.status).toBe(lives ? 'playing' : 'lost');
        if (lives) { expect(e.state.ready).toBe(true); e.launch(); expect(e.state.ready).toBe(false); }
    }
});
test('K08 victoire après dernier impact et non avant', () => {
    const e = position({ x: 116, y: 90, vx: 0, vy: 4 }, [brick()]); expect(e.status).toBe('playing'); e.step(STEP); expect(e.status).toBe('won'); expect(e.state.score).toBe(30);
});
test('K09 bonus élargir temporaire, multi ×3 et vie plafonnée', () => {
    const e = position({ x: 180, y: 400, vx: 0, vy: -4 });
    e.state.bonuses = [{ x: 180, y: 573, kind: 'wide' }, { x: 180, y: 573, kind: 'multi' }, { x: 180, y: 573, kind: 'life' }]; e.step(STEP);
    expect(e.state.width).toBe(128); expect(e.state.lives).toBe(4); expect(e.state.balls).toHaveLength(3);
    e.state.balls = [{ x: 10, y: 645, vx: 0, vy: 4 }, { x: 200, y: 400, vx: 0, vy: -4 }]; e.step(STEP); expect(e.state.lives).toBe(4); expect(e.state.balls).toHaveLength(1);
    e.state.balls = [{ x: 10, y: 645, vx: 0, vy: 4 }]; e.step(STEP); expect(e.state.lives).toBe(3);
    e.step(STEP * 600); expect(e.state.width).toBe(92);
    e.state.lives = 9; e.state.bonuses = [{ x: 180, y: 573, kind: 'life' }]; e.step(STEP); expect(e.state.lives).toBe(9);
});
test('K09 apparition : positions interdites, brique, saturation et déterminisme des chutes', () => {
    const e = new Engine();
    for (const [x, y] of [[9, 400], [351, 400], [180, 9], [180, 561], [27, 63]]) { e.state.bricks = [brick()]; if (y === 63) e.state.bricks = [{ ...brick(), x: 11, y: 54 }]; expect(e.spawnBonus(x ?? 0, y ?? 0, 'wide')).toBe(false); }
    for (const x of [40, 80, 120, 160]) expect(e.spawnBonus(x, 400, 'life')).toBe(true);
    expect(e.spawnBonus(200, 400, 'life')).toBe(false);
    e.state.bonuses = [{ x: 180, y: 400, kind: 'life' }]; expect(e.spawnBonus(185, 405, 'multi')).toBe(false);
    const runs = [new Engine(), new Engine()];
    for (const run of runs) { run.loadState({ ...run.state, bricks: [brick(), { ...brick(), x: 250 }], balls: [{ x: 116, y: 92, vx: 0, vy: 4 }], ready: false }); run.step(STEP); }
    expect(runs[0]?.snapshot()).toEqual(runs[1]?.snapshot());
});
test('K10 accélération tous les dix rebonds, plafond strict', () => {
    const e = new Engine();
    for (let i = 0; i < 300; i++) { e.state.ready = false; e.state.balls = [{ x: 7, y: 400, vx: -e.state.speed, vy: 0 }]; e.step(STEP); if (i === 8) expect(e.state.speed).toBe(4); if (i === 9) expect(e.state.speed).toBe(4.2); }
    expect(e.state.speed).toBe(difficulty(0).cap); expect(Math.hypot(e.state.balls[0]?.vx ?? 0, e.state.balls[0]?.vy ?? 0)).toBeCloseTo(7);
});
test('K11 trente silhouettes dessinées et respirations', () => {
    const signatures = new Set<string>();
    for (let i = 0; i < 30; i++) {
        const e = new Engine(i), d = difficulty(i);
        expect(e.state.bricks.filter(b => !b.solid || b.kind === 'locked')).toHaveLength(d.density);
        expect(e.state.bricks.filter(b => b.solid && b.kind !== 'locked')).toHaveLength(d.solids);
        expect(e.state.bricks.every(b => b.x >= 0 && b.x + b.w <= 360 && b.y + b.h < 400)).toBe(true);
        signatures.add(e.state.bricks.map(b => `${String(b.x)},${String(b.y)}`).join(';'));
    }
    expect(signatures.size).toBe(30);
    for (const i of [5, 10, 16, 22, 26]) expect(difficulty(i).width).toBe(108);
    expect(difficulty(29).speed).toBe(9); expect(() => difficulty(30)).toThrow();
});
test('K12 déterminisme, découpage fixe, graine témoin et snapshot isolé', () => {
    const a = new Engine(15, 123), b = new Engine(15, 123); a.move(90); b.move(90); a.launch(); b.launch();
    for (let i = 0; i < 100; i++) { a.step(STEP); b.step(STEP / 2); b.step(STEP / 2); }
    expect(a.snapshot()).toEqual(b.snapshot()); expect(new Engine(15, 124).snapshot()).not.toEqual(new Engine(15, 123).snapshot());
    const snapshot = a.snapshot(); snapshot.bricks.length = 0; expect(a.state.bricks.length).toBeGreaterThan(0);
    expect(() => { a.step(-1); }).toThrow();
});

for (const [name, run] of Object.entries(mechanicCases)) test(name, () => { run(); });
test('K-DIV-01 nouveautés observées, rythme et clones', () => {
    const result = briqueterieDiversity(Engine, solutions, replay);
    expect(result.noveltyCount).toBeGreaterThanOrEqual(7); expect(result.cloneShare).toBeLessThan(0.25);
    let last = 1;
    for (const level of result.noveltyLevels.filter(n => n <= 25)) { expect(level - last).toBeLessThanOrEqual(5); last = level; }
    expect(25 - last).toBeLessThanOrEqual(5);
});
// Each campaign is its own short replay test; no pilot search runs in this suite.
for (const seed of [28, 455]) test(`K-PILOT campagne enregistrée ${String(seed)}`, () => {
    const records = solutions.filter(r => r.seed === seed); expect(records).toHaveLength(30);
    for (const record of records) expect(replay(record).engine.status).toBe('won');
});
