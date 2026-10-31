import { circuitKey } from '../src/engines/derapage/circuits';
import { readSave, recordCircuitLap, type StoragePort } from '../src/shell/storage';
import { required } from '../src/engines/derapage/access';
import { test, expect } from 'vitest';
import { Engine } from '../src/engines/derapage/engine';
import { analogSteer, physics, collide, type Kart } from '../src/engines/derapage/physics';
import { createTrack, validateTrack, difficulty, at, nearest, distance, gateLine, shapeSignature, signatureDistance } from '../src/engines/derapage/track';
import { checkpoint, ranking, Cup } from '../src/engines/derapage/race';
import { controller, aiInput, aiSpeed } from '../src/engines/derapage/ai';
import { drawItem, useItem, updateItems, type Puddle } from '../src/engines/derapage/items';
import { Random } from '../src/engines/shared/random';
const neutral = { steer: 0, drift: false, bonus: false };
function kart(): Kart { return { id: 0, x: 0, y: 0, vx: 0, vy: 0, angle: 0, lap: 0, gate: 1, passed: 0, driftMs: 0, boostMs: 0, jumpMs: 0, slipMs: 0, shield: false, item: null, finishMs: null, hits: 0 }; }
function flat() { const t = createTrack(0); t.trees = []; t.boosts = []; t.widths.fill(10000); t.walls.fill(false); return t; }
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
    t.walls.fill(false); t.trees = []; t.circuit = { ...t.circuit, theme: { ...t.circuit.theme, urban: false } };
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
    const t = createTrack(0), i = required(t.gates[k.gate]), p = required(t.points[i]);
    const line = gateLine(t, k.gate), width = required(t.widths[i]);
    const nx = (line.a.x - line.b.x) / width, ny = (line.a.y - line.b.y) / width;
    const cut = { x: p.x + nx * (width / 2 + 5), y: p.y + ny * (width / 2 + 5) };
    const previous = { x: cut.x - ny, y: cut.y + nx };
    Object.assign(k, { x: cut.x + ny, y: cut.y - nx });
    for (const point of [previous, cut, k]) {
        const n = nearest(t, point);
        expect(n.distance).toBeGreaterThan(required(t.widths[n.index]) / 2);
    }
    checkpoint(k, previous, t, 0);
    expect(k.gate).toBe(2);
    expect(k.passed).toBe(1);
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
    let error = 0, frame = 0, grass = 0;
    for (; frame < 18000 && k.lap < 3; frame++) {
        const old = { x: k.x, y: k.y };
        physics(k, ai ? aiInput(k, e.track, level, r.next() * 2 - 1) : controller(k, e.track), e.track, 1 / 60, difficulty(level).grassGrip, ai ? aiSpeed(k, e.track, level) : 24);
        checkpoint(k, old, e.track, frame * 1000 / 60);
        const n = nearest(e.track, k);
        if (n.distance > required(e.track.widths[n.index]) / 2) grass++;
        error += nearest({ ...e.track, points: e.track.racingLine }, k).distance;
    }
    return { grass: grass / frame, laps: k.lap, seconds: frame / 60, error: error / frame };
}
test('Z11 IA : erreurs et temps entre Le Rocher et le dernier niveau, cinq rivaux', () => {
    expect(new Engine().karts.slice(1)).toHaveLength(5);
    const easy = pilot(4, true), hard = pilot(29, true);
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

        }
});
for (let level = 0; level < 30; level++) test(`Z13 pilote : trois tours en moins de 90 s, circuit ${String(level + 1)}`, () => {
    const p = pilot(level);
    expect(p.laps, String(level)).toBe(3);
    expect(p.seconds).toBeLessThan(90);
}, 15000);
test('Z14 tous paramètres monotones et extrêmes stricts', () => {
    const signs = { width: -1, aiSpeed: 1, error: -1, brakeDelay: -1, bend: 1, wallFraction: 1, grassGrip: -1 } as const;
    expect(difficulty(0)).toEqual({ width: 20, aiSpeed: 15, error: .18, brakeDelay: .45, bend: .015, wallFraction: .12, grassGrip: .45 });
    for (const key of Object.keys(signs) as (keyof typeof signs)[]) {
        for (let i = 1; i < 30; i++)
            expect((difficulty(i)[key] - difficulty(i - 1)[key]) * signs[key]).toBeGreaterThanOrEqual(0);
        expect((difficulty(29)[key] - difficulty(0)[key]) * signs[key]).toBeGreaterThan(0);
    }
});
import { sameReplayStep, checkReplayComparison } from './derapage-replay';
import { completeReplay } from './derapage-complete-replay';
// Union of the former complete Z15/Z28 assertions; no duplicate Node replay.
test('Z15 Z28 rejeu complet, horodatage et contrats des snapshots', completeReplay, 15000);
test('Z16 contrat monde sérialisable sans notion de vue', () => {
    const s = new Engine().snapshot();
    expect(Object.keys(s).sort()).toEqual(['controls', 'crates', 'cup', 'frames', 'karts', 'level', 'order', 'puddles', 'random', 'remainder', 'score', 'seed', 'status', 'time', 'timing', 'track']);
    expect(JSON.stringify(s)).not.toMatch(/camera|screen|viewport|pixel|canvas/i);
    // advance is simulation time; special is the kart's per-lap Élan, both in world space.
    expect(Object.getOwnPropertyNames(Engine.prototype).sort()).toEqual(['advance', 'constructor', 'input', 'loadLevel', 'snapshot', 'special', 'step']);
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


// Constructed straight road: measurements do not depend on the generator.
function straight() {
    const t = createTrack(0);
    t.circuit = { ...t.circuit, theme: { ...t.circuit.theme, urban: false } };
    t.points = Array.from({ length: 96 }, (_, i) => ({ x: i * 100, y: 0 }));
    t.widths.fill(20); t.walls.fill(false); t.boosts = []; t.trees = [];
    return t;
}
test('Z17 Z18 plafond herbe et perte de 30 % en une seconde', () => {
    const t = straight(), road = { ...kart(), x: 100 }, grass = { ...kart(), x: 100, y: 30 };
    for (let i = 0; i < 600; i++) {
        physics(road, neutral, t, 1 / 60, .45);
        physics(grass, neutral, t, 1 / 60, .45);
    }
    expect(Math.hypot(grass.vx, grass.vy)).toBeLessThanOrEqual(.50 * Math.hypot(road.vx, road.vy));
    Object.assign(grass, { vx: 24, vy: 0 });
    for (let i = 0; i < 60; i++) physics(grass, neutral, t, 1 / 60, .45);
    expect(Math.hypot(grass.vx, grass.vy)).toBeLessThanOrEqual(24 * .70);
});
test('Z19 bande : 32 pendant 900 ms puis retour au plafond 24', () => {
    const t = straight(), k = { ...kart(), x: 100, vx: 24 };
    t.boosts = [{ x: 100, y: 0, radius: 2.5, index: 1 }];
    physics(k, neutral, t, 1 / 60, .45);
    expect(k.vx).toBe(32); expect(k.boostMs).toBeCloseTo(900 - 1000 / 60);
    for (let i = 1; i < 54; i++) { physics(k, neutral, t, 1 / 60, .45); expect(k.vx).toBeGreaterThan(24); }
    physics(k, neutral, t, 1 / 60, .45); physics(k, neutral, t, 1 / 60, .45);
    expect(k.vx).toBe(24);
});
test('Z20 Z21 génération stable, bandes progressives et arbres hors piste', () => {
    for (const seed of [1, 28, 999]) {
        let previous = 0;
        for (let level = 0; level < 30; level++) {
            const t = createTrack(level, seed);
            expect(t).toEqual(createTrack(level, seed));
            expect(t.boosts.length).toBeGreaterThanOrEqual(previous);
            if (level >= 2) expect(t.boosts.length).toBeGreaterThanOrEqual(1);
            previous = t.boosts.length;
            for (const b of t.boosts) {
                const a = required(t.points[(b.index + 95) % 96]), c = required(t.points[(b.index + 1) % 96]);
                const ux = b.x - a.x, uy = b.y - a.y, vx = c.x - b.x, vy = c.y - b.y;
                expect(Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy))).toBeLessThanOrEqual(.09);
                expect(nearest(t, b).distance).toBe(0);
            }
            expect(t.trees.length).toBeGreaterThan(0);
            for (const tree of t.trees) {
                const n = nearest(t, tree);
                expect(n.distance).toBeGreaterThanOrEqual(required(t.widths[n.index]) / 2 + 2 * tree.radius);
                expect(nearest({ ...t, points: t.racingLine }, tree).distance).toBeGreaterThan(tree.radius + 1.2);
            }
        }
    }
});
test('Z22 choc cercle balayé, rebond et aucune traversée à 24 ou 32', () => {
    for (const speed of [24, 32]) for (const dt of [1 / 60, .5]) {
        const t = straight(), k = { ...kart(), x: 100, vx: speed, boostMs: speed === 32 ? 1000 : 0 };
        t.trees = [{ x: 100 + speed * dt / 2, y: 0, radius: .1 }];
        physics(k, neutral, t, dt, .45);
        expect(k.x).toBeLessThan(required(t.trees[0]).x);
        expect(distance(k, required(t.trees[0]))).toBeGreaterThanOrEqual(1.3);
        expect(k.vx).toBeLessThan(0); expect(Math.hypot(k.vx, k.vy)).toBeLessThan(speed);
        expect(k.treeHits).toBe(1);
    }
});
test('Z23 zone morte, saturation et rejeu analogique pas à pas', () => {
    for (const x of [-6, 0, 6]) expect(analogSteer(x)).toBe(0);
    expect(analogSteer(23)).toBe(.5); expect(analogSteer(-23)).toBe(-.5);
    expect(analogSteer(40)).toBe(1); expect(analogSteer(-40)).toBe(-1);
    const a = new Engine(14), b = new Engine(14);
    for (let i = 0; i < 300; i++) {
        const input = { ...neutral, steer: Math.sin(i / 30) * .37 };
        a.input(input); b.input(input); a.step(1000 / 60); b.step(1000 / 120); b.step(1000 / 120);
        expect(a.snapshot()).toEqual(b.snapshot());
    }
}, 15000);
for (let level = 0; level < 30; level++) test(`Z24 IA : au plus 5 % hors piste, circuit ${String(level + 1)}`, () => {
    const p = pilot(level, true); expect(p.laps).toBe(3); expect(p.grass).toBeLessThanOrEqual(.05);
}, 15000);

test('Z26 signatures géométriques distinctes et invariantes', () => {
    const tracks = Array.from({ length: 30 }, (_, i) => createTrack(i));
    const signatures = tracks.map(shapeSignature);
    for (let i = 0; i < 30; i++) for (let j = i+1; j < 30; j++)
        expect(signatureDistance(required(signatures[i]), required(signatures[j]))).toBeGreaterThan(.15);
    for (const t of tracks) {
        const transformed = { ...t, points: t.points.map(p => ({ x: -p.y*1.3, y: p.x*1.3 })), racingLine: t.racingLine.map(p => ({ x: -p.y*1.3, y: p.x*1.3 })), distances: t.distances.map(d => d*1.3), length: t.length*1.3 };
        expect(signatureDistance(shapeSignature(t),shapeSignature(transformed))).toBeLessThan(1e-6);
        const turns=shapeSignature(t).turns, rotated=shapeSignature(transformed).turns;
        expect(rotated.length).toBe(turns.length);
        turns.forEach((angle,i)=>{ expect(Math.abs(angle-required(rotated[i]))).toBeLessThan(1e-6); });
    }
});
test('Z27 arrivée exactement sur la porte zéro et largeur locale', () => {
    for (let i = 0; i < 30; i++) {
        const t = createTrack(i), line = gateLine(t,0), p = required(t.points[0]);
        expect(distance(t.finishLine.a,line.a)).toBeLessThan(1e-6);
        expect(distance(t.finishLine.b,line.b)).toBeLessThan(1e-6);
        expect(Math.abs(distance(t.finishLine.a,t.finishLine.b)-required(t.widths[0]))).toBeLessThan(1e-6);
        expect(Math.abs((line.a.x+line.b.x)/2-p.x)).toBeLessThan(1e-6);
        expect(Math.abs((line.a.y+line.b.y)/2-p.y)).toBeLessThan(1e-6);
        const k = kart(); k.gate=0;
        const before = required(t.points[95]), after = required(t.points[1]), len = distance(before,after);
        const dx = (after.x-before.x)/len, dy = (after.y-before.y)/len;
        const half=required(t.widths[0])/2;
        expect(distance(t.finishLine.a,{ x:p.x-dy*half,y:p.y+dx*half })).toBeLessThan(1e-6);
        expect(distance(t.finishLine.b,{ x:p.x+dy*half,y:p.y-dx*half })).toBeLessThan(1e-6);
        Object.assign(k,{ x:p.x+dx*.01,y:p.y+dy*.01 });
        checkpoint(k,{ x:p.x-dx*.01,y:p.y-dy*.01 },t,100);
        expect(k.lap).toBe(1);
    }
});

test('Z28 temps construits : nombre de pas entre franchissements et minimum', () => {
    const e = new Engine(), k = required(e.karts[0]);
    const t = e.track, p = required(t.points[0]), a = required(t.points[95]), b = required(t.points[1]);
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    for (const frame of [120, 300, 390]) {
        e.frames = frame - 1;
        Object.assign(k, { x: p.x - Math.cos(angle) * .1, y: p.y - Math.sin(angle) * .1, angle, vx: Math.cos(angle) * 24, vy: Math.sin(angle) * 24, gate: 0 });
        e.input(neutral); e.step(1000 / 60);
        expect(e.frames).toBe(frame);
    }
    expect(e.lapTimesMs).toEqual([120, 180, 90].map(n => n * (1000 / 60)));
    expect(e.bestLapMs).toBe(90 * (1000 / 60));
    expect(e.lastLapDeltaMs).toBe(90 * (1000 / 60) - 120 * (1000 / 60));
    const frozen = e.snapshot().timing; e.step(5000);
    expect(e.snapshot().timing).toEqual(frozen);
    e.loadLevel(1); expect(e.snapshot().timing.lapTimesMs).toEqual([]);
});

test('Z29 records stricts par circuit, ancienne sauvegarde et stockage défaillant', () => {
    const data = new Map<string, string>();
    let writes = 0;
    const storage: StoragePort = { getItem: key => data.get(key) ?? null, setItem: (key, value) => { writes++; data.set(key, value); } };
    data.set('arcade-lab:derapage:v1', JSON.stringify({ unlocked: 7, best: 42 }));
    const save = readSave(storage, 'derapage', 30);
    expect(save).toEqual({ unlocked: 7, best: 42 });
    expect(recordCircuitLap(storage, save, 0, 2000)).toBe(true);
    expect(recordCircuitLap(storage, save, 0, 2000)).toBe(false);
    expect(recordCircuitLap(storage, save, 0, 3000)).toBe(false);
    expect(writes).toBe(1);
    expect(recordCircuitLap(storage, save, 1, 4000)).toBe(true);
    expect(recordCircuitLap(storage, save, 0, 1500)).toBe(true);
    expect(readSave(storage, 'derapage', 30)).toEqual({ unlocked: 7, best: 42, circuitRecords: { [circuitKey(0)]: 1500, [circuitKey(1)]: 4000 } });
    const broken: StoragePort = { getItem: () => { throw new Error('read'); }, setItem: () => { throw new Error('write'); } };
    const fallback = readSave(broken, 'derapage', 30);
    expect(fallback).toEqual({ unlocked: 1, best: 0 });
    expect(() => recordCircuitLap(broken, fallback, 2, 1234)).not.toThrow();
    expect(fallback.circuitRecords).toEqual({ [circuitKey(2)]: 1234 });
});

// Shared scenarios also run through the permitted Node validator.
import { mechanics } from './derapage-cases';
for (const scenario of mechanics) test(scenario.name, () => { scenario.run((ok, message) => { expect(ok, message).toBe(true); }); }, 15000);

test('Z15 slalom et BMX : échantillon, campagnes complètes dans test:node', () => {
    for (const level of [28,29]) {
        const a = new Engine(level), b = new Engine(level);
        for (let frame=0;frame<60;frame++) {
            const input = controller(required(a.karts[0]),a.track);
            a.input(input); b.input(input); a.step(1000/60); b.step(1000/120); b.step(1000/120);
            expect(sameReplayStep(a, b, frame, frame === 59)).toBe(true);
        }
    }
}, 15000);

import { exactNearest } from './derapage-nearest';
test('Z15 nearest exact : téléportations, égalités et pistes éditées', exactNearest, 15000);

import { joystickCases } from './derapage-joystick';
// Complete Z36 tapes, with exhaustive nearest verification, belong to test:node.
// Negative Z36 metadata cases use the Node replay witness instead of replaying here.
for (const scenario of joystickCases.filter(c => !c.name.startsWith('Z36 rejeu :'))) test(scenario.name, () => {
    scenario.run((ok, message) => { expect(ok, message).toBe(true); });
}, 15000); // safety net only: joystick cases are bounded by their own frame counts

test('Z15 comparaison compacte : dérive dynamique et snapshots complets', () => {
    checkReplayComparison((ok, message) => { expect(ok, message).toBe(true); });
}, 15000);
