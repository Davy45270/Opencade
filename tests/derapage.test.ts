import { required } from '../src/engines/derapage/access';
import { test, expect } from 'vitest';
import { Engine } from '../src/engines/derapage/engine';
import { physics, collide, type Kart } from '../src/engines/derapage/physics';
import { createTrack, validateTrack, difficulty, at, nearest, distance } from '../src/engines/derapage/track';
import { checkpoint, ranking, Cup } from '../src/engines/derapage/race';
import { controller, aiInput, aiSpeed } from '../src/engines/derapage/ai';
import { drawItem, useItem, updateItems, type Puddle } from '../src/engines/derapage/items';
import { Random } from '../src/engines/shared/random';
const neutral = { steer: 0, drift: false, bonus: false };
function kart(): Kart { return { id: 0, x: 0, y: 0, vx: 0, vy: 0, angle: 0, lap: 0, gate: 1, passed: 0, driftMs: 0, boostMs: 0, jumpMs: 0, slipMs: 0, shield: false, item: null, finishMs: null, hits: 0 }; }
function flat() { const t = createTrack(0); t.widths.fill(10000); t.walls.fill(false); return t; }
test('Z01 accélération automatique, plafond 24, frottement et pas fixe', () => {
    const k = kart(), t = flat();
    physics(k, neutral, t, 1 / 60, .75);
    expect(k.vx).toBeCloseTo(.2);
    expect(k.x).toBeCloseTo(1 / 300);
    for (let i = 0; i < 1200; i++)
        physics(k, neutral, t, 1 / 60, .75);
    expect(k.vx).toBe(24);
    k.vy = 10;
    physics(k, neutral, t, 1 / 60, .75);
    expect(k.vy).toBeLessThan(10);
    const e = new Engine();
    e.step(8);
    expect(e.frames).toBe(0);
    e.step(9);
    expect(e.frames).toBe(1);
});
test('Z02 braquage proportionnel, adhérence latérale', () => {
    const a = { ...kart(), vx: 20 }, b = { ...a };
    physics(a, { ...neutral, steer: .5 }, flat(), 1 / 60, .75);
    physics(b, { ...neutral, steer: 1 }, flat(), 1 / 60, .75);
    expect(a.angle).toBeCloseTo(.02);
    expect(b.angle).toBeCloseTo(.04);
    const c = { ...kart(), vx: 20, vy: 10 };
    physics(c, neutral, flat(), 1 / 60, .75);
    expect(c.vy).toBeCloseTo(10 * Math.exp(-1 / 6));
});
test('Z03 seuil 9, charge 600/1400 ms et paliers 700/1400 ms', () => {
    const t = flat();
    const slow = { ...kart(), vx: 8 };
    physics(slow, { ...neutral, steer: 1, drift: true }, t, 1 / 60, .75);
    expect(slow.driftMs).toBe(0);
    for (const [charge, expected] of [[599, 0], [600, 700], [1399, 700], [1400, 1400]]) {
        const k = { ...kart(), vx: 20, driftMs: required(charge) };
        physics(k, neutral, t, 1 / 60, .75);
        expect(k.boostMs).toBeCloseTo(Math.max(0, required(expected) - 1000 / 60));
    }
    const k = { ...kart(), vx: 20, vy: 10 };
    physics(k, { ...neutral, steer: 1, drift: true }, t, 1 / 60, .75);
    expect(k.angle).toBeCloseTo(.0488);
    expect(k.driftMs).toBeCloseTo(1000 / 60);
});
test('Z04 herbe ralentit, ressort ignore herbe, mur renvoie', () => {
    const t = createTrack(0);
    t.walls.fill(false);
    const a = { ...kart(), vx: 24 }, b = { ...a, jumpMs: 1000 };
    physics(a, neutral, t, 1 / 60, .5);
    physics(b, neutral, t, 1 / 60, .5);
    expect(a.vx).toBe(12);
    expect(b.vx).toBe(24);
    const p = required(t.points[0]), n = nearest(t, p);
    t.walls.fill(true);
    const k = { ...kart(), x: p.x - n.nx * 18, y: p.y - n.ny * 18, angle: Math.atan2(-n.ny, -n.nx), vx: -n.nx * 20, vy: -n.ny * 20 };
    physics(k, neutral, t, 1 / 60, .75);
    expect(k.hits).toBe(1);
    expect(k.vx * -n.nx + k.vy * -n.ny).toBeLessThan(0);
});
test('Z05 séparation des cercles et échange impulsion, bulle absorbe', () => {
    const a = { ...kart(), vx: 10 }, b = { ...kart(), id: 1, x: 1, vx: -10 };
    collide(a, b);
    expect(distance(a, b)).toBeCloseTo(2.4);
    expect(a.vx).toBeLessThan(0);
    expect(b.vx).toBeGreaterThan(0);
    const c = { ...kart(), vx: 10, shield: true }, d = { ...kart(), id: 1, x: 1 };
    collide(c, d);
    expect(c.shield).toBe(false);
    expect(c.hits).toBe(0);
    expect(c.vx).toBe(10);
});
function cross(k: Kart, gate: number) {
    const t = createTrack(0), i = required(t.gates[gate]), p = required(t.points[i]), a = required(t.points[(i + 95) % 96]), b = required(t.points[(i + 1) % 96]), len = distance(a, b), dx = (b.x - a.x) / len, dy = (b.y - a.y) / len;
    k.x = p.x + dx;
    k.y = p.y + dy;
    checkpoint(k, { x: p.x - dx, y: p.y - dy }, t, 1234);
}
test('Z06 douze points ordonnés, trois tours et temps de fin', () => {
    const k = kart();
    for (let lap = 0; lap < 3; lap++) {
        for (let g = 1; g < 12; g++)
            cross(k, g);
        expect(k.lap).toBe(lap);
        cross(k, 0);
    }
    expect(k.passed).toBe(36);
    expect(k.lap).toBe(3);
    expect(k.finishMs).toBe(1234);
});
test('Z07 sauter une porte, demi-tour et couper dans herbe ne valide pas', () => {
    const k = kart();
    cross(k, 2);
    cross(k, 0);
    expect(k.passed).toBe(0);
    expect(k.lap).toBe(0);
    cross(k, 1);
    cross(k, 3);
    cross(k, 0);
    expect(k.passed).toBe(1);
    expect(k.gate).toBe(2);
    const t = createTrack(0), p = required(t.points[16]);
    k.x = p.x + 40;
    k.y = p.y + 40;
    checkpoint(k, { x: p.x - 40, y: p.y - 40 }, t, 0);
    expect(k.gate).toBe(2);
});
test('Z08 ordre par progression puis distance, points 10/8/6/5/4/3 et podium', () => {
    const t = createTrack(0), a = kart(), b = { ...kart(), id: 1, passed: 1 };
    expect(ranking([a, b], t)).toEqual([1, 0]);
    b.passed = 0;
    Object.assign(b, t.points[8]);
    expect(ranking([a, b], t)).toEqual([1, 0]);
    for (let place = 0; place < 6; place++) {
        const e = new Engine();
        required(e.karts[0]).finishMs = 2000;
        for (let i = 1; i <= place; i++)
            required(e.karts[i]).finishMs = i * 100;
        e.step(1000 / 60);
        expect(e.score).toBe([10, 8, 6, 5, 4, 3][place]);
        expect(e.status).toBe(place < 3 ? 'won' : 'lost');
        const frozen = e.snapshot();
        e.step(1000);
        expect(e.snapshot()).toEqual(frozen);
    }
});
test('Z09 coupe exactement quatre courses et cumul', () => {
    const c = new Cup();
    for (let i = 0; i < 4; i++)
        c.record([2, 0, 1, 3, 4, 5]);
    expect(c.scores).toEqual([32, 24, 40, 20, 16, 12]);
    expect(c.standings()).toEqual([2, 0, 1, 3, 4, 5]);
    expect(() => { c.record([0, 1, 2, 3, 4, 5]); }).toThrow();
});
test('Z10 effets originaux, tirage pondéré reproductible et retour des caisses à 5000 ms', () => {
    const k = kart(), puddles: Puddle[] = [];
    k.item = 'turbo';
    useItem(k, puddles);
    expect(k.boostMs).toBe(1800);
    k.item = 'ressort';
    useItem(k, puddles);
    expect(k.jumpMs).toBe(1600);
    k.item = 'bulle';
    useItem(k, puddles);
    expect(k.shield).toBe(true);
    k.item = 'flaque';
    useItem(k, puddles);
    expect(puddles[0]).toEqual({ x: -4, y: 0, owner: 0, remaining: 6000 });
    expect(k.item).toBeNull();
    const rival = { ...kart(), id: 1, x: -4 };
    updateItems([rival], [], puddles, [1], new Random(28), 10);
    expect(rival.slipMs).toBe(1100);
    const count = (place: number) => { const r = new Random(28); return Array.from({ length: 5000 }, () => drawItem(r, place)).filter(i => i === 'turbo').length; };
    expect(count(5)).toBeGreaterThan(count(0) * 2);
    const first = new Random(28), replay = new Random(28);
    expect(Array.from({ length: 40 }, () => drawItem(first, 3))).toEqual(Array.from({ length: 40 }, () => drawItem(replay, 3)));
    const crates = [{ x: 0, y: 0, cooldown: 0 }], r = new Random(28);
    updateItems([k], crates, [], [0], r, 0);
    expect(required(crates[0]).cooldown).toBe(5000);
    k.item = null;
    updateItems([k], crates, [], [0], r, 4999);
    expect(k.item).toBeNull();
    updateItems([k], crates, [], [0], r, 1);
    expect(k.item).not.toBeNull();
});
function pilot(level: number, ai = false) {
    const e = new Engine(level), k = required(e.karts[0]), r = new Random(28);
    let error = 0, frame = 0;
    for (; frame < 18000 && k.lap < 3; frame++) {
        const old = { x: k.x, y: k.y };
        physics(k, ai ? aiInput(k, e.track, level, r.next() * 2 - 1) : controller(k, e.track), e.track, 1 / 60, difficulty(level).grassGrip, ai ? aiSpeed(k, e.track, level) : 24);
        checkpoint(k, old, e.track, frame * 1000 / 60);
        error += nearest({ ...e.track, points: e.track.racingLine }, k).distance;
    }
    return { laps: k.lap, seconds: frame / 60, error: error / frame };
}
test('Z11 IA : erreurs et temps mesurés entre niveaux extrêmes, cinq rivaux', () => {
    expect(new Engine().karts.slice(1)).toHaveLength(5);
    const easy = pilot(0, true), hard = pilot(29, true);
    expect(easy.laps).toBe(3);
    expect(hard.laps).toBe(3);
    expect(hard.error).toBeLessThan(easy.error / 2);
    expect(hard.seconds).toBeLessThan(easy.seconds * .85);
});
test('Z12 trente circuits fermés, portes ordonnées, largeur au moins 12 et sans croisement', () => {
    for (let i = 0; i < 30; i++)
        for (const seed of [28, 1, 999]) {
            const t = createTrack(i, seed);
            expect(validateTrack(t)).toBe(true);
            expect(Math.min(...t.widths)).toBeGreaterThanOrEqual(12);
            expect(t.gates).toEqual([0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88]);
            expect(at(t, 0)).toEqual(at(t, t.length));
            // Independent polar geometry proof: every edge stays in its own
            // angular sector (< π), hence nonadjacent edges cannot intersect.
            let winding = 0;
            for (let j = 0; j < 96; j++) {
                const a = required(t.points[j]), b = required(t.points[(j + 1) % 96]);
                const delta = Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y);
                expect(delta).toBeGreaterThan(0); expect(delta).toBeLessThan(.1); winding += delta;
                expect(Math.hypot(a.x, a.y)).toBeGreaterThan(50);
                expect(distance(a, b)).toBeLessThan(8);
            }
            expect(winding).toBeCloseTo(2 * Math.PI, 10);
        }
});
test('Z13 pilote simulé trois tours sur chacun des trente circuits en moins de 90 s', () => {
    for (let i = 0; i < 30; i++) {
        const p = pilot(i);
        expect(p.laps, String(i)).toBe(3);
        expect(p.seconds).toBeLessThan(90);
    }
}, 30000);
test('Z14 tous paramètres monotones et extrêmes stricts', () => {
    const signs = { width: -1, aiSpeed: 1, error: -1, brakeDelay: -1, bend: 1, wallFraction: 1, grassGrip: -1 } as const;
    expect(difficulty(0)).toEqual({ width: 20, aiSpeed: 15, error: .18, brakeDelay: .45, bend: .015, wallFraction: .12, grassGrip: .75 });
    for (const key of Object.keys(signs) as (keyof typeof signs)[]) {
        for (let i = 1; i < 30; i++)
            expect((difficulty(i)[key] - difficulty(i - 1)[key]) * signs[key]).toBeGreaterThanOrEqual(0);
        expect((difficulty(29)[key] - difficulty(0)[key]) * signs[key]).toBeGreaterThan(0);
    }
});
test('Z15 rejeu complet horodaté et cadences regroupées, copies et temps invalides', () => {
    const a = new Engine(), b = new Engine();
    for (let frame = 0; frame < 6000 && a.status === 'playing'; frame++) {
        const input = controller(required(a.karts[0]), a.track);
        a.input(input);
        b.input(input);
        a.step(1000 / 60);
        b.step(1000 / 120);
        b.step(1000 / 120);
        expect(b.snapshot()).toEqual(a.snapshot());
    }
    expect(required(a.karts[0]).lap).toBe(3);
    expect(a.status).toBe('won');
    expect(JSON.parse(JSON.stringify(a.snapshot()))).toEqual(a.snapshot());
    const copy = a.snapshot();
    required(copy.karts[0]).x = 999;
    expect(required(a.karts[0]).x).not.toBe(999);
    for (const ms of [-1, NaN, Infinity])
        expect(() => { a.step(ms); }).toThrow(RangeError);
}, 30000);
test('Z16 contrat monde sérialisable sans notion de vue', () => {
    const s = new Engine().snapshot();
    expect(Object.keys(s).sort()).toEqual(['controls', 'crates', 'cup', 'frames', 'karts', 'level', 'order', 'puddles', 'random', 'remainder', 'score', 'seed', 'status', 'time', 'track']);
    expect(JSON.stringify(s)).not.toMatch(/camera|screen|viewport|pixel|canvas/i);
    expect(Object.getOwnPropertyNames(Engine.prototype).sort()).toEqual(['constructor', 'input', 'loadLevel', 'snapshot', 'step']);
});

test('Z09 rejouer une course ne double pas les points de coupe', () => {
    const e = new Engine();
    required(e.karts[0]).finishMs = 100; e.step(1000 / 60);
    e.loadLevel(1); required(e.karts[0]).finishMs = 100; e.step(1000 / 60);
    expect(e.cup.scores[0]).toBe(20); e.loadLevel(1);
    expect(e.cup.races).toBe(1); expect(e.cup.scores[0]).toBe(10);
    required(e.karts[0]).finishMs = 100; e.step(1000 / 60); expect(e.cup.scores[0]).toBe(20);
});

test('Z07 une porte franchie en sens inverse ne compte pas', () => {
    const t = createTrack(0), k = kart(), i = 8;
    const p = required(t.points[i]), a = required(t.points[i - 1]), b = required(t.points[i + 1]);
    const dx = (b.x - a.x) / distance(a, b), dy = (b.y - a.y) / distance(a, b);
    Object.assign(k, { x: p.x - dx, y: p.y - dy });
    checkpoint(k, { x: p.x + dx, y: p.y + dy }, t, 100);
    expect(k.passed).toBe(0); expect(k.gate).toBe(1);
});

test('Z08 dernier franchissement exige le braquage réel, sans modifier les règles', () => {
    for (const steer of [0, 1]) {
        const e = new Engine(), k = required(e.karts[0]), p = at(e.track, e.track.length - 3), q = at(e.track, 0);
        Object.assign(k, p, { angle: Math.atan2(q.y - p.y, q.x - p.x) - 1.45, lap: 2, gate: 0, passed: 35 });
        e.input({ steer, drift: false, bonus: false }); e.step(1500);
        expect(e.status).toBe(steer === 1 ? 'won' : 'playing');
        expect(k.lap).toBe(steer === 1 ? 3 : 2);
    }
});
