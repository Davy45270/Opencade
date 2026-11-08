import { expect, test } from 'vitest';
import { Engine, FIXED_MS } from '../src/engines/derapage/engine';
import { controller, rival, RIVAL_TOP_SPEED } from '../src/engines/derapage/ai';
import { nearest } from '../src/engines/derapage/track';
import { collisionCounts } from '../src/engines/derapage/physics';
import { required } from '../src/engines/derapage/access';

/**
 * Rival drivers measured on whole simulated races (player = the reference controller), against the
 * audit of 2026-11 (chapter 8): no convoy, no pile-up, no rival stuck, items kept for their moment,
 * and a pack that stays within reach of the player. Witness, the same four races before 2026-11-08:
 * 1 626 contact frames per race (now 144), rival lanes within 0.46 of each other (now 3.5 to 9.3),
 * items fired after 17 ms (one frame), rivals at 27.1 s per lap (now 21.0 s).
 */
interface RaceStats { queueS: number; passes: number; contacts: number; laneSpread: number; worstStillMs: number; lapS: number[]; firstBehindM: number; heldMs: number[] }
function race(level: number): RaceStats {
    const e = new Engine(level, 28), t = e.track, n = e.karts.length;
    for (const k of e.karts) collisionCounts.set(k, { kart: 0, rail: 0 });
    const lateral = Array.from({ length: n }, () => ({ sum: 0, count: 0 }));
    const travelled = Array<number>(n).fill(0), last = e.karts.map(k => nearest(t, k).along), best = Array<number>(n).fill(0), still = Array<number>(n).fill(0);
    const lapStart = Array<number>(n).fill(0), lapS: number[] = [], since = Array<number | null>(n).fill(null), heldMs: number[] = [];
    let worstStillMs = 0, passes = 0, queueMs = 0, firstBehindM: number | null = null;
    const sign = new Map<string, number>();
    while (e.status === 'playing' && e.frames < 60 * 240) {
        e.input(controller(required(e.karts[0]), t));
        const before = e.karts.map(k => ({ lap: k.lap, item: k.item }));
        e.step(FIXED_MS);
        for (const k of e.karts.slice(1)) {
            const b = required(before[k.id]);
            if (!b.item && k.item) since[k.id] = e.frames;
            const from = since[k.id] ?? null;
            if (b.item && !k.item && from !== null) { heldMs.push((e.frames - from) * FIXED_MS); since[k.id] = null; }
            if (k.lap > b.lap) { lapS.push((e.frames - required(lapStart[k.id])) * FIXED_MS / 1000); lapStart[k.id] = e.frames; }
            if (k.finishMs !== null) continue;
            const p = nearest(t, k), half = required(t.widths[p.index]) / 2;
            let d = p.along - required(last[k.id]); if (d > t.length / 2) d -= t.length; if (d < -t.length / 2) d += t.length;
            last[k.id] = p.along; travelled[k.id] = required(travelled[k.id]) + d;
            if (required(travelled[k.id]) > required(best[k.id]) + .05) { best[k.id] = travelled[k.id] ?? 0; still[k.id] = 0; }
            else { still[k.id] = required(still[k.id]) + FIXED_MS; worstStillMs = Math.max(worstStillMs, required(still[k.id])); }
            if (p.distance < half) { const l = required(lateral[k.id]); l.sum += (k.x - p.x) * p.nx + (k.y - p.y) * p.ny; l.count++; }
        }
        const k0 = required(e.karts[0]), p0 = nearest(t, k0);
        let d0 = p0.along - required(last[0]); if (d0 > t.length / 2) d0 -= t.length; if (d0 < -t.length / 2) d0 += t.length;
        last[0] = p0.along; travelled[0] = required(travelled[0]) + d0;
        // Gap to the player when the first kart finishes (later, finished karts stop counting distance).
        if (firstBehindM === null && e.karts.some(k => k.finishMs !== null))
            firstBehindM = Math.min(...e.karts.slice(1).map(k => required(travelled[0]) - required(travelled[k.id])));
        // Single file: a rival in the lane of another rival less than 10 units ahead of it.
        const place = e.karts.map(k => { const p = nearest(t, k); return { along: p.along, side: (k.x - p.x) * p.nx + (k.y - p.y) * p.ny, done: k.finishMs !== null }; });
        for (let i = 1; i < n; i++) for (let j = 1; j < n; j++) {
            const a = required(place[i]), b = required(place[j]);
            if (i === j || a.done || b.done) continue;
            const gap = ((b.along - a.along) % t.length + t.length) % t.length;
            if (gap > 0 && gap < 10 && Math.abs(b.side - a.side) < 2.8) queueMs += FIXED_MS;
        }
        // Overtakes between rivals still racing: the order of two rivals along the road changes.
        for (let i = 1; i < n; i++) for (let j = i + 1; j < n; j++) {
            if (e.karts[i]?.finishMs !== null || e.karts[j]?.finishMs !== null) continue;
            const now = Math.sign(required(travelled[i]) - required(travelled[j])), key = `${String(i)}-${String(j)}`, was = sign.get(key);
            if (now !== 0) { if (was !== undefined && was !== now) passes++; sign.set(key, now); }
        }
    }
    const means = lateral.slice(1).map(l => l.sum / Math.max(1, l.count));
    const contacts = e.karts.slice(1).reduce((s, k) => s + (collisionCounts.get(k)?.kart ?? 0), 0);
    return { queueS: queueMs / 1000, passes, contacts, laneSpread: Math.max(...means) - Math.min(...means), worstStillMs, lapS, firstBehindM: firstBehindM ?? Infinity, heldMs };
}
const levels = [0, 9, 18, 27];
const stats = levels.map(race);
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;

test('R-RIV-01 pas de file indienne ni d\'amas : contacts entre karts divisés, voies distinctes', () => {
    console.log(JSON.stringify(stats.map((s, i) => ({ level: levels[i], passes: s.passes, queueS: +s.queueS.toFixed(1), contacts: s.contacts, laneSpread: +s.laneSpread.toFixed(2), worstStillMs: Math.round(s.worstStillMs), lapS: +mean(s.lapS).toFixed(2), firstBehindM: Math.round(s.firstBehindM), heldMs: Math.round(mean(s.heldMs.length ? s.heldMs : [0])) }))));
    expect(mean(stats.map(s => s.contacts))).toBeLessThan(300);
    for (const s of stats) expect(s.laneSpread).toBeGreaterThan(1.5);
    // Time one rival spends within 10 units behind another in its lane, summed over pairs: 223 s per race
    // before, 60 s now, 82 s if rivals only held behind without moving to the free side.
    expect(mean(stats.map(s => s.queueS))).toBeLessThan(72);
});
test('R-RIV-02 aucun concurrent ne reste bloqué plus de 1,5 s', () => {
    for (const s of stats) expect(s.worstStillMs).toBeLessThanOrEqual(1500 + FIXED_MS);
});
test('R-RIV-03 rythme : tour des concurrents sous 23 s, peloton à portée du joueur', () => {
    expect(mean(stats.flatMap(s => s.lapS))).toBeLessThan(23);
    // The leading rival within 200 m of the player when the first kart finishes (negative: the rival leads).
    for (const s of stats) expect(s.firstBehindM).toBeLessThan(200);
});
test('R-RIV-04 les objets sont gardés pour le bon moment, jamais plus de 8 s', () => {
    const held = stats.flatMap(s => s.heldMs);
    expect(held.length).toBeGreaterThan(0);
    expect(mean(held)).toBeGreaterThan(250);
    expect(Math.max(...held)).toBeLessThanOrEqual(8000 + FIXED_MS);
});
test('R-RIV-05 un concurrent immobilisé est remis sur la route après 1,5 s', () => {
    const e = new Engine(0, 28), k = required(e.karts[2]);
    for (let i = 0; i < 30; i++) e.step(FIXED_MS);
    const x = k.x, y = k.y;
    let frames = 0;
    while (e.unsticks === 0 && frames < 200) { k.x = x; k.y = y; k.vx = 0; k.vy = 0; e.step(FIXED_MS); frames++; }
    expect(e.unsticks).toBe(1);
    // The step that ends the last real move already counts the first still frame.
    expect(frames).toBe(Math.ceil(1500 / FIXED_MS) - 1);
    const n = nearest(e.track, k);
    expect(n.distance).toBeLessThan(.01);
    expect(Math.hypot(k.vx, k.vy)).toBe(0);
});
test('R-RIV-06 rattrapage borné : loin derrière, un concurrent ne dépasse jamais 23 (le joueur : 24)', () => {
    const e = new Engine(5, 28), player = required(e.karts[0]);
    player.passed += 40;
    for (const k of e.karts.slice(1)) {
        const plan = rival(k, e.karts, e.track, 5, 0, FIXED_MS);
        expect(plan.speed).toBeLessThanOrEqual(RIVAL_TOP_SPEED);
    }
    expect(RIVAL_TOP_SPEED).toBeLessThan(24);
});
