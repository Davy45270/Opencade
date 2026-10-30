import assert from 'node:assert/strict';
import { Engine, FIXED_MS, type Chain } from '../src/engines/collier/engine';
import { Path, levelAt, difficulty, type Bonus } from '../src/engines/collier/levels';
import { policy } from '../src/engines/collier/policy';
function near(a: number, b: number): void {
    assert.ok(Math.abs(a - b) < .000001, `${String(a)} ≠ ${String(b)}`);
}
function straight(): Engine {
    const e = new Engine();
    e.config.paths = [new Path([{ x: 30, y: 200 }, { x: 330, y: 200 }])];
    return e;
}
function bead(id: number, color: number, s: number, bonus?: Bonus) {
    return {
        id,
        color,
        s,
        ...(bonus ? { bonus } : {})
    };
}
function count(e: Engine): number {
    return e.chains[0]?.beads.length ?? 0;
}
function actualSpeed(e: Engine): number {
    const c = e.chains[0], p = e.config.paths[0];
    assert.ok(c && p);
    return e.speed(c, p);
}
function head(e: Engine): number {
    return e.chains[0]?.beads.at(-1)?.s ?? 0;
}
function tail(e: Engine): number {
    return e.chains[0]?.beads[0]?.s ?? 0;
}
export function C01(): void {
    const p = new Path([{ x: 20, y: 30 }, { x: 80, y: 30 }, { x: 80, y: 110 }]);
    assert.equal(p.length, 140);
    assert.deepEqual(p.pointAt(-10), { x: 20, y: 30 });
    assert.deepEqual(p.pointAt(140), { x: 80, y: 110 });
    assert.deepEqual(p.pointAt(400), { x: 80, y: 110 });
    assert.deepEqual(p.pointAt(100), { x: 80, y: 70 });
    function signature(path: Path): string {
        const landmarks = Array.from({ length: 33 }, (_, n) => path.pointAt(path.length * n / 32));
        const xs = landmarks.map(p => p.x);
        const ys = landmarks.map(p => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const width = Math.max(...xs) - minX || 1;
        const height = Math.max(...ys) - minY || 1;
        return JSON.stringify(landmarks.map(p => [
            Math.round((p.x - minX) / width * 100),
            Math.round((p.y - minY) / height * 100),
        ]));
    }
    const scaled = new Path(p.controls.map(q => ({ x: q.x * 2 + 10, y: q.y * 2 + 20 })));
    assert.equal(signature(p), signature(scaled));
    const forms = new Set<string>();
    for (let i = 0; i < 8; i++) {
        const path = levelAt(i).paths[0];
        assert.ok(path);
        near(path.length, 1050 - i * 5);
        // Compare complete source curves: cropping, scaling and translation cannot disguise clones.
        forms.add(signature(new Path(path.controls)));
        let length = 0;
        for (let n = 1; n < path.samples.length; n++) {
            const a = path.samples[n - 1], b = path.samples[n];
            if (a && b) {
                assert.ok(b.s - a.s <= 1.000001);
                length += Math.hypot(a.x - b.x, a.y - b.y);
            }
        }
        near(length, path.length);
    }
    assert.equal(forms.size, 8);
}
export function C02(): void {
    const e = straight();
    e.loadState([bead(1, 0, 100), bead(2, 1, 120), bead(3, 2, 140)]);
    e.step(1000);
    near(tail(e), 104);
    near(head(e), 144);
    near((e.chains[0]?.beads[1]?.s ?? 0) - tail(e), 20);
    e.loadState([bead(1, 0, 100), bead(2, 1, 160)]);
    e.step(1000);
    near(tail(e), 104);
    near(head(e), 160);
    const feed = new Engine();
    for (let n = 0; n < 240; n++) {
        feed.step(FIXED_MS);
        const chain = feed.chains[0];
        assert.ok(chain);
        for (let i = 1; i < chain.beads.length; i++)
            near((chain.beads[i]?.s ?? 0) - (chain.beads[i - 1]?.s ?? 0), 20);
    }
    assert.ok((feed.chains[0]?.emitted ?? 0) > 6);
    assert.ok((feed.chains[0]?.emitted ?? 0) <= 24);
    const beads = feed.chains[0]?.beads ?? [];
    for (let i = 1; i < beads.length; i++)
        near((beads[i]?.s ?? 0) - (beads[i - 1]?.s ?? 0), 20);
}
export function C03(): void {
    const e = straight();
    e.loadState([bead(1, 0, 100), bead(2, 1, 120)], 24, 2, 2);
    e.insert(0, 0, { x: 131, y: 200 }, 2);
    assert.deepEqual(e.chains[0]?.beads.map(b => [b.color, b.s]), [[0, 100], [2, 120], [1, 140]]);
    e.loadState([bead(1, 0, 100), bead(2, 1, 120)], 24, 2, 2);
    e.insert(0, 0, { x: 129, y: 200 }, 2);
    const chain = e.chains[0];
    assert.ok(chain);
    assert.deepEqual(chain.beads.map(b => [b.color, b.s]), [[2, 100], [0, 120], [1, 140]]);
}
export function C04(): void {
    const e = straight();
    e.loadState([bead(1, 0, 100)], 24, 0, 0);
    e.insert(0, 0, { x: 131, y: 200 }, 0);
    assert.equal(count(e), 2);
    assert.equal(e.score, 0);
    e.loadState([bead(1, 0, 100), bead(2, 0, 120), bead(3, 1, 200)], 24, 0, 1);
    e.insert(0, 1, { x: 151, y: 200 }, 0);
    assert.equal(count(e), 1);
    assert.equal(e.score, 30);
    assert.equal(e.bursts.length, 3);
}
export function C05(): void {
    const e = straight();
    e.loadState([bead(1, 0, 50), bead(2, 0, 150)]);
    e.step(100);
    assert.ok(head(e) < 141);
    near(tail(e), 50.4);
    e.loadState([bead(1, 0, 50), bead(2, 1, 150)]);
    e.step(100);
    near(head(e), 150);
    near(tail(e), 50.4);
    e.step(20000);
    near(head(e) - tail(e), 20);
}
export function C06(): void {
    const e = straight();
    e.loadState([
        bead(1, 1, 40),
        bead(2, 1, 60),
        bead(3, 0, 80),
        bead(4, 0, 100),
        bead(5, 1, 120)
    ], 24, 0, 1);
    e.insert(0, 3, { x: 131, y: 200 }, 0);
    assert.equal(e.score, 30);
    e.step(1000);
    assert.equal(e.status, 'won');
    assert.equal(e.maxCombo, 2);
    assert.equal(e.bursts.length, 3);
    assert.equal(e.score, 90 + Math.round(e.remainingDistance));
}
export function C07(): void {
    const e = straight();
    e.loadState([bead(1, 4, 100)], 24, 0, 1);
    assert.equal(e.current, 4);
    assert.equal(e.next, 4);
    e.aim(Math.PI / 2);
    for (let i = 0; i < 20; i++) {
        e.shoot();
        assert.equal(e.flight?.color, 4);
        e.step(1000);
        assert.equal(e.current, 4);
        assert.equal(e.next, 4);
    }
}
export function C08(): void {
    const e = straight();
    e.loadState([bead(1, 0, 100), bead(2, 1, 120)], 24, 0, 1);
    const random = e.random.state;
    e.swap();
    assert.equal(e.current, 1);
    assert.equal(e.next, 0);
    assert.equal(e.random.state, random);
    e.shoot();
    assert.equal(e.swap(), false);
    assert.equal(e.shoot(), false);
    assert.equal(e.shots, 1);
    e.aim(Math.PI / 2);
    e.step(2000);
    assert.equal(e.flight, null);
}
export function C09(): void {
    const e = straight();
    e.loadState([bead(1, 0, 100), bead(2, 0, 120, 'slow'), bead(3, 1, 220)], 24, 0, 1);
    e.insert(0, 1, { x: 151, y: 200 }, 0);
    assert.equal(e.slowMs, 5000);
    assert.deepEqual(e.events, ['insertion', 'bonus', 'éclatement']);
    near(actualSpeed(e), 2);
    e.step(1000);
    near(e.slowMs, 4000);
    e.activate('slow');
    assert.equal(e.slowMs, 5000);
    e.step(5000);
    near(e.slowMs, 0);
    near(actualSpeed(e), 4);
    const r = straight();
    r.loadState([bead(1, 0, 100), bead(2, 0, 120, 'reverse'), bead(3, 1, 220)], 24, 0, 1);
    r.insert(0, 1, { x: 151, y: 200 }, 0);
    assert.equal(r.reverseMs, 1500);
    r.step(500);
    near(head(r), 190);
    r.activate('reverse');
    assert.equal(r.reverseMs, 1500);
    r.step(1500);
    near(r.reverseMs, 0);
    near(head(r), 100);
}
export function C10(): void {
    const e = straight();
    e.loadState([bead(1, 0, 60), bead(2, 0, 80, 'bomb'), bead(3, 1, 180)], 24, 0, 1);
    e.insert(0, 1, { x: 111, y: 200 }, 0);
    assert.equal(e.bomb, true);
    e.loadState([bead(1, 0, 80), bead(2, 1, 100), bead(3, 2, 180)], 24, 0, 1);
    e.insert(0, 1, { x: 131, y: 200 }, 0);
    assert.equal(e.bomb, false);
    assert.deepEqual(e.chains[0]?.beads.map(b => b.id), [3]);
    // The closed radius includes 40, excludes 40.1, and is measured before displacement.
    for (const distance of [38.5, 40, 40.1]) {
        const boundary = straight();
        boundary.loadState([
            bead(1, 0, 100),
            bead(2, 1, 120),
            bead(3, 2, 140),
            bead(4, 1, 160)
        ], 24, 0, 1);
        boundary.activate('bomb');
        const impact = { x: 190 - distance, y: 200 };
        boundary.insert(0, 2, impact, 0);
        assert.equal(boundary.chains[0]?.beads.some(b => b.id === 4), distance > 40);
    }
    const displaced = straight();
    displaced.loadState([
        bead(1, 0, 100),
        bead(2, 1, 120),
        bead(3, 2, 140),
        bead(4, 1, 160)
    ], 24, 0, 1);
    displaced.activate('bomb');
    displaced.insert(0, 2, { x: 169, y: 200 }, 0);
    assert.equal(displaced.chains[0]?.beads.some(b => b.id === 4), false);
    const a = straight();
    a.loadState([bead(1, 0, 100), bead(2, 0, 120, 'aim'), bead(3, 1, 220)], 24, 0, 1);
    a.insert(0, 1, { x: 151, y: 200 }, 0);
    assert.equal(a.aimMs, 8000);
    a.step(1000);
    near(a.aimMs, 7000);
    a.activate('aim');
    assert.equal(a.aimMs, 8000);
    a.step(8000);
    near(a.aimMs, 0);
    a.loadState([bead(1, 1, 150)], 24, 1, 1);
    a.aim(-Math.PI / 2);
    const hit = a.trace();
    near(hit.x, 180);
    near(hit.y, 220);
}
export function C11(): void {
    const e = straight();
    e.loadState([bead(1, 0, 40), bead(2, 1, 240)], 24, 0, 1);
    e.aim(-Math.PI / 2);
    e.shoot();
    e.step(500);
    assert.equal(e.gapShots, 1);
    assert.equal(e.score, 25);
    assert.equal(count(e), 2);
    const t = straight();
    t.config.tunnels = [[80, 140]];
    t.loadState([bead(1, 0, 100)], 24, 0, 0);
    t.aim(Math.atan2(-150, -50));
    t.shoot();
    t.step(1500);
    assert.equal(count(t), 1);
    assert.equal(t.shots, 1);
    t.config.tunnels = [];
    t.aim(Math.atan2(200 - t.config.shooter.y, 30 + tail(t) - t.config.shooter.x));
    t.shoot();
    t.step(400);
    assert.equal(count(t), 2);
}
export function C12(): void {
    const e = straight();
    e.loadState([bead(1, 0, 255)]);
    assert.equal(e.danger, false);
    near(actualSpeed(e), 4);
    e.step(FIXED_MS);
    assert.equal(e.danger, true);
    near(actualSpeed(e), 5.6);
    assert.deepEqual(e.events, ['danger']);
    e.step(FIXED_MS);
    assert.deepEqual(e.events, ['danger']);
    e.events.length = 0;
    e.loadState([bead(1, 0, 299)]);
    e.step(1000);
    assert.equal(e.status, 'lost');
    assert.deepEqual(e.events, ['life', 'lost']);
    const final = new Engine(24, 300);
    const finalPath = final.config.paths[0];
    assert.ok(finalPath);
    final.loadState([bead(1, 0, finalPath.length * .85)], final.config.quota);
    near(actualSpeed(final), final.config.speed);
    final.step(FIXED_MS);
    near(actualSpeed(final), final.config.speed * 1.8);
    const w = straight();
    w.loadState([bead(1, 0, 100), bead(2, 0, 120)], 24, 0, 0);
    w.insert(0, 1, { x: 151, y: 200 }, 0);
    assert.equal(w.status, 'won');
    assert.equal(w.score, 190);
    // A flight insertion crosses 85% after the ordinary movement check.
    const insertion = straight();
    insertion.loadState([bead(1, 0, 254)], 24, 1, 0);
    insertion.flight = { x: 285, y: 200, dx: 650, dy: 0, color: 1, gap: false };
    insertion.step(FIXED_MS);
    assert.equal(insertion.danger, true);
    assert.equal(count(insertion), 2);
    assert.deepEqual(insertion.events, ['insertion', 'danger']);
    insertion.step(FIXED_MS);
    assert.deepEqual(insertion.events, ['insertion', 'danger']);
    // Crossing again after a retreat must produce a new warning.
    insertion.loadState([bead(1, 0, 254)], 24, 1, 0);
    insertion.insert(0, 0, { x: 285, y: 200 }, 1);
    assert.deepEqual(insertion.events, ['insertion', 'danger', 'insertion', 'danger']);
    const waiting = straight();
    waiting.loadState([], 6);
    waiting.step(FIXED_MS);
    assert.equal(waiting.status, 'playing');
    assert.equal(waiting.chains[0]?.emitted, 7);
}
export function C13(): void {
    const a = new Engine(15, 300), b = new Engine(15, 300);
    for (let n = 0; n < 200; n++) {
        if (n % 9 === 0) {
            policy(a);
            policy(b);
        }
        a.step(FIXED_MS);
        b.step(FIXED_MS);
        assert.deepEqual(a.snapshot(), b.snapshot());
    }
    const c = new Engine(0, 300), d = new Engine(0, 300);
    c.step(1000);
    for (let n = 0; n < 60; n++)
        d.step(FIXED_MS);
    assert.deepEqual(c.snapshot(), d.snapshot());
    assert.notEqual(new Engine(15, 300).random.state, new Engine(15, 301).random.state);
}
export function C14(): void {
    for (let i = 1; i < 30; i++) {
        const a = difficulty(i - 1), b = difficulty(i);
        assert.ok(b.colors >= a.colors);
        assert.ok(b.quota >= a.quota);
        assert.ok(b.speed >= a.speed);
        assert.ok(b.length <= a.length);
        assert.ok(b.bonusEvery >= a.bonusEvery);
    }
    assert.deepEqual(difficulty(0), {
        colors: 3,
        quota: 24,
        speed: 4,
        length: 1050,
        bonusEvery: 6
    });
    assert.deepEqual(difficulty(29), {
        colors: 6,
        quota: 82,
        speed: 8.64,
        length: 905,
        bonusEvery: 13
    });
    for (let i = 0; i < 30; i++)
        for (const path of levelAt(i).paths)
            near(path.length, 1050 - i * 5);
}
export function C17(): void {
    const introductions: number[] = [];
    let seen = new Set<string>();
    const shapes = new Set<number>();
    for (let i = 0; i < 30; i++) {
        const l = levelAt(i);
        shapes.add(l.shape);
        const fresh = l.mechanics.filter(m => !seen.has(m));
        if (fresh.length)
            introductions.push(i + 1);
        seen = new Set([...seen, ...l.mechanics]);
    }
    assert.equal(shapes.size, 8);
    assert.deepEqual(introductions, [
        1,
        5,
        9,
        13,
        17,
        21,
        25,
        29
    ]);
    for (let i = 1; i < introductions.length; i++) {
        const gap = (introductions[i] ?? 0) - (introductions[i - 1] ?? 0);
        assert.ok(gap >= 3 && gap <= 5);
    }
    assert.equal(levelAt(27).paths.length, 1);
    assert.equal(levelAt(28).paths.length, 2);
    assert.equal(levelAt(29).paths.length, 2);
    assert.deepEqual(levelAt(0).bonuses, []);
    assert.deepEqual(levelAt(16).bonuses, [
        'slow',
        'reverse',
        'bomb',
        'aim'
    ]);
    assert.equal(levelAt(20).tunnels.length, 1);
}
/** Every newly emitted bead enters at the origin, including after a real burst. */
export function C18(): void {
    const e = new Engine(0, 300);
    let births = 0, bursts = false;
    // Observe the real emitter at birth: a flight can remove the new bead later in the same step.
    const emitter = e as unknown as {
        emit(chain: Chain): void;
    };
    const emit = emitter.emit.bind(e);
    emitter.emit = chain => {
        const before = chain.emitted;
        emit(chain);
        if (chain.emitted > before) {
            births++;
            near(chain.beads[0]?.s ?? -1, 0);
        }
    };
    for (let n = 0; n < 600; n++) {
        if (n % 9 === 0)
            policy(e);
        bursts ||= e.bursts.length > 0;
        e.step(FIXED_MS);
    }
    assert.ok(bursts && births >= 3);
}
/** Long seeded emissions contain all allowed run lengths, and no short period. */
export function C19(count = 300): void {
    function sequence(seed: number): number[] {
        const e = new Engine(0, seed);
        const chain = e.chains[0];
        assert.ok(chain);
        chain.quota = count;
        e.config.paths = [new Path([{ x: 0, y: 200 }, { x: count * 20 + 200, y: 200 }])];
        e.config.speed = 1200;
        const colors = chain.beads.toReversed().map(b => b.color);
        while (chain.emitted < chain.quota) {
            const emitted = chain.emitted;
            e.step(FIXED_MS);
            if (chain.emitted > emitted)
                colors.push(chain.beads[0]?.color ?? -1);
        }
        // Three equal emitted beads are inert until a shot or a real weld resolves them.
        assert.equal(chain.beads.length, count);
        assert.equal(e.bursts.length, 0);
        return colors;
    }
    const colors = sequence(300);
    assert.equal(colors.length, count);
    const runs = new Set<number>();
    let run = 1;
    for (let i = 1; i <= colors.length; i++) {
        if (colors[i] === colors[i - 1])
            run++;
        else {
            runs.add(run);
            assert.ok(run <= 3);
            run = 1;
        }
    }
    assert.deepEqual([...runs].sort(), [1, 2, 3]);
    for (let period = 1; period <= 12; period++) {
        assert.ok(colors.some((c, i) => i >= period && c !== colors[i - period]));
    }
    assert.deepEqual(colors, sequence(300));
    assert.notDeepEqual(colors, sequence(301));
}
/** Fine arc-length probes cover every curve, including both final lanes. */
export function C20(full = false): void {
    for (let level = 0; level < 30; level++) {
        const config = levelAt(level);
        const probes: {
            x: number;
            y: number;
            s: number;
            chain: number;
            hidden: boolean;
        }[] = [];
        for (const [chain, path] of config.paths.entries()) {
            for (let s = 0; s <= path.length; s += full || [0, 9, 29].includes(level) ? 2 : 20) {
                const p = path.pointAt(s);
                assert.ok(p.x >= 10 && p.x <= 350 && p.y >= 50 && p.y <= 540, `Champ niveau ${String(level + 1)}`);
                assert.ok(Math.hypot(p.x - config.shooter.x, p.y - config.shooter.y) >= 30);
                assert.ok(Math.hypot(p.x - (config.shooter.x + 44), p.y - (config.shooter.y + 35)) >= 20);
                if (s + 20 <= path.length) {
                    const a = path.tangent(s), b = path.tangent(s + 20);
                    const angle = Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y))) * 180 / Math.PI;
                    assert.ok(angle < 35, `Courbure niveau ${String(level + 1)} : ${String(angle)}`);
                }
                probes.push({
                    ...p,
                    s,
                    chain,
                    hidden: config.tunnels.some(([a, b]) => s >= a && s <= b)
                });
            }
        }
        if (!full && ![0, 9, 29].includes(level))
            continue;
        // Only adjacent 20-unit cells can contain a forbidden near neighbour.
        // This preserves the exact distance oracle without a quadratic scan.
        const cells = new Map<string, typeof probes>();
        for (const a of probes) {
            const cx = Math.floor(a.x / 20), cy = Math.floor(a.y / 20);
            for (let dx = -1; dx <= 1; dx++)
                for (let dy = -1; dy <= 1; dy++)
                    for (const b of cells.get(`${String(cx + dx)},${String(cy + dy)}`) ?? []) {
                        if (a.hidden || b.hidden || a.chain === b.chain && Math.abs(a.s - b.s) < 40)
                            continue;
                        assert.ok((a.x - b.x) ** 2 + (a.y - b.y) ** 2 >= 400, `Séparation niveau ${String(level + 1)}`);
                    }
            const key = `${String(cx)},${String(cy)}`;
            const cell = cells.get(key) ?? [];
            cell.push(a);
            cells.set(key, cell);
        }
    }
}
export const engineCases = {
    C01,
    C02,
    C03,
    C04,
    C05,
    C06,
    C07,
    C08,
    C09,
    C10,
    C11,
    C12,
    C13,
    C14,
    C17,
    C18,
    C19,
    C20
};
