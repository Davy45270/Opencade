import { test, expect } from 'vitest';
import { Engine, STEP, LIMITS, difficulty, generate, windAt, polygon, pilot, landingScore, required } from '../src/engines/alunir/engine';
const idle = { thrust: false, left: false, right: false };
function contact(vx = 0, vy = 1.2, angle = 0, outside = false) {
    const e = new Engine(), p = required(e.terrain.pads[0]);
    const extent = Math.max(...polygon(0, 0, angle).map(v => v.y));
    const first = required(e.terrain.points[0]), second = required(e.terrain.points[1]);
    const ground = first.y + (second.y - first.y) * 12 / second.x;
    e.loadState({ x: outside ? 12 : p.x + p.width / 2, y: (outside ? ground - 8 : p.y - extent) - 0.1, vx, vy: vy - difficulty(0).gravity, angle });
    return e;
}
test('U01 gravité, intégration semi-implicite et reliquat fixe', () => {
    const e = new Engine(), y = e.state.y, g = difficulty(0).gravity;
    e.step(STEP / 2); expect(e.state.y).toBe(y); e.step(STEP / 2);
    expect(e.state.vy).toBeCloseTo(g, 12); expect(e.state.y).toBeCloseTo(y + g, 12);
    e.step(STEP); expect(e.state.y).toBeCloseTo(y + 3 * g, 12);
});
test('U02 poussée orientée et consommation exacte y compris réservoir partiel', () => {
    const e = new Engine(); e.loadState({ angle: Math.PI / 2, fuel: 0.5 }); e.input({ ...idle, thrust: true }); e.step(STEP);
    expect(e.state.vx).toBeCloseTo(0.0275); expect(e.state.vy).toBeCloseTo(difficulty(0).gravity); expect(e.state.fuel).toBe(0);
    const up = new Engine(); up.input({ ...idle, thrust: true }); up.step(STEP);
    expect(up.state.vy).toBeCloseTo(difficulty(0).gravity - 0.055); expect(up.state.fuel).toBe(949);
});
test('U03 rotation fixe, directions opposées et annulation', () => {
    const e = new Engine(); e.input({ ...idle, right: true }); e.step(STEP * 4); expect(e.state.angle).toBeCloseTo(0.1);
    e.input({ ...idle, left: true }); e.step(STEP * 4); expect(e.state.angle).toBeCloseTo(0);
    e.input({ ...idle, left: true, right: true }); e.step(STEP); expect(e.state.angle).toBeCloseTo(0);
});
test('U04 vent constant puis rafales bornées, à graine et intégrées', () => {
    expect(windAt(0, 1, 90)).toBe(0); expect(windAt(13, 1, 0)).toBe(windAt(13, 999, 900));
    expect(windAt(14, 1, 0)).not.toBe(windAt(14, 1, 90));
    expect(windAt(29, 1, 0)).not.toBe(windAt(29, 2, 0));
    for (let t = 0; t < 1000; t++) expect(Math.abs(windAt(29, 45, t) - difficulty(29).wind)).toBeLessThanOrEqual(difficulty(29).gust);
    const e = new Engine(); e.loadLevel(29, 45); e.step(STEP); expect(e.state.vx).toBe(windAt(29, 45, 0));
});
test('U05 collision continue du polygone, grande vitesse et bord de plateforme', () => {
    const e = new Engine(), p = required(e.terrain.pads[0]); e.loadState({ x: p.x + p.width / 2, vy: 1000 }); e.step(STEP);
    expect(e.status).toBe('lost'); expect(e.state.y).toBeCloseTo(p.y - 8);
    const edge = contact(); edge.loadState({ x: p.x - 2 }); edge.step(STEP); expect(edge.status).toBe('lost');
});
test('U06 seuils exacts inclusifs, deux signes et polygone incliné', () => {
    for (const sign of [-1, 1]) {
        const e = contact(sign * LIMITS.vx, LIMITS.vy, sign * LIMITS.angle); e.step(STEP); expect(e.status).toBe('won');
    }
});
test('U07 vitesse, angle, terrain et murs fatals', () => {
    for (const e of [contact(0.60001), contact(0, 1.20001), contact(0, 1, LIMITS.angle + 0.00001), contact(0, 1, 0, true)]) {
        e.step(STEP); expect(e.status).toBe('lost'); expect(e.state.score).toBe(0);
    }
    for (const state of [{ x: 8, vx: -100 }, { x: 352, vx: 100 }, { y: 11, vy: -100 }]) {
        const e = new Engine(); e.loadState(state); e.step(STEP); expect(e.status).toBe('lost');
    }
});
test('U08 réservoir vide : poussée inerte, chute libre avant contact', () => {
    const a = new Engine(), b = new Engine(); a.loadState({ fuel: 0 }); b.loadState({ fuel: 0 });
    a.input({ ...idle, thrust: true }); a.step(STEP * 20); b.step(STEP * 20);
    expect(a.status).toBe('playing'); expect(a.state).toEqual(b.state);
    a.step(60000); expect(a.status).toBe('lost');
});
test('U09 carburant, précision, temps, multiplicateur et score réel', () => {
    const p = { x: 100, y: 500, width: 80, multiplier: 3 };
    expect(landingScore(50, 140, p, 600)).toBe(1050);
    expect(landingScore(50, 100, p, 600)).toBe(750);
    expect(landingScore(50, 140, p, 3000)).toBe(450);
    const e = contact(); e.step(STEP); expect(e.state.score).toBe(landingScore(e.state.fuel, e.state.x, required(e.terrain.pads[0]), 1));
    const frozen = e.snapshot(); e.step(1000); expect(e.snapshot()).toEqual(frozen);
});
test('U10 politique proportionnelle : chacun des trente niveaux complets', () => {
    for (const seed of [28, 1, 2026]) for (let level = 0; level < 30; level++) {
        const e = new Engine(); e.loadLevel(level, seed);
        for (let t = 0; t < 2500 && e.status === 'playing'; t++) { e.input(pilot(e)); e.step(STEP); }
        expect(e.status, `graine ${String(seed)}, niveau ${String(level + 1)}`).toBe('won');
    }
});
test('U11 chaque paramètre monotone et strict aux extrêmes, génération mesurable', () => {
    const signs = { width: -1, relief: 1, wind: 1, gust: 1, gravity: 1, fuel: -1, offset: 1 } as const;
    for (const key of Object.keys(signs) as (keyof typeof signs)[]) {
        for (let l = 1; l < 30; l++) expect((difficulty(l)[key] - difficulty(l - 1)[key]) * signs[key], key).toBeGreaterThanOrEqual(0);
        expect((difficulty(29)[key] - difficulty(0)[key]) * signs[key], key).toBeGreaterThan(0);
    }
    expect(difficulty(0).width).toBe(90); expect(difficulty(29).width).toBe(28);
    for (let l = 0; l < 30; l++) for (const seed of [1, 28, 2026]) {
        const terrain = generate(l, seed), p = required(terrain.pads[0]);
        expect(p.width).toBe(difficulty(l).width);
        const e = new Engine(); e.loadLevel(l, seed);
        expect(Math.abs(e.state.x - p.x - p.width / 2)).toBeCloseTo(difficulty(l).offset, 10);
        expect(e.state.x).toBeGreaterThan(7); expect(e.state.x).toBeLessThan(353);
        const repeat = new Engine(); repeat.loadLevel(l, seed); expect(repeat.state).toEqual(e.state);
        expect(terrain.points.some((v, i) => v.x === p.x && terrain.points[i + 1]?.x === p.x + p.width && v.y === terrain.points[i + 1]?.y)).toBe(true);
        expect(terrain.points.every((v, i) => i === 0 || v.x > required(terrain.points[i - 1]).x)).toBe(true);
    }
});
test('U12 déterminisme, regroupement, sérialisation et graine témoin', () => {
    const a = new Engine(), b = new Engine(); a.loadLevel(29, 28); b.loadLevel(29, 28);
    for (let i = 0; i < 100; i++) {
        const input = { thrust: i % 3 === 0, left: i % 11 === 0, right: i % 7 === 0 };
        a.input(input); b.input(input); a.step(STEP * 2); b.step(STEP); b.step(STEP);
        expect(a.snapshot()).toEqual(b.snapshot());
    }
    expect(JSON.parse(JSON.stringify(a.snapshot()))).toEqual(a.snapshot());
    expect(generate(29, 28)).not.toEqual(generate(29, 29));
    const whole = contact(), split = contact(); whole.step(STEP * 10);
    for (let i = 0; i < 10; i++) split.step(STEP);
    expect(whole.snapshot()).toEqual(split.snapshot());
    for (const ms of [-1, NaN, Infinity]) expect(() => { a.step(ms); }).toThrow(RangeError);
});
