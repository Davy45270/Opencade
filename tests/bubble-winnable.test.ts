import { expect, test } from 'vitest';
import { Engine, neighbors, key, center } from '../src/engines/bubble/engine';
import { LEVELS } from '../src/engines/bubble/levels';
// A plain human-like player: each shot (with or without swap) is judged one move ahead on the real engine,
// preferring fewer bubbles, same-colour pairs and a high front. Every level must be won with its real deal.
function settle(e: Engine): void { e.shoot(); for (let i = 0; i < 2000 && e.flight; i++) e.step(50); }
function value(e: Engine): number {
    if (e.status === 'won') return 1e9; if (e.status === 'lost') return -1e9;
    const cells = new Map(e.grid.map(c => [key(c), c])); let pairs = 0, low = 0;
    for (const c of e.grid) {
        for (const n of neighbors(c)) if (cells.get(key(n))?.color === c.color) pairs++;
        low = Math.max(low, center(c, e.drops).y);
    }
    return -e.grid.length * 10 + pairs * 2 - Math.max(0, low - 300) * 1.5;
}
function play(index: number): { status: string; shots: number } {
    let e = new Engine(LEVELS[index]?.seed); e.loadLevel(index);
    for (let shots = 1; shots <= 120; shots++) {
        let best: Engine | null = null, bestValue = -Infinity;
        for (const swap of [false, true]) for (let i = -139; i <= 139; i += 3) {
            const c = new Engine(e.seed, e); if (swap) c.swap(); c.aim(i / 100); settle(c);
            const v = value(c); if (v > bestValue) { bestValue = v; best = c; }
        }
        if (!best || best.status === 'lost') return { status: 'lost', shots };
        if (best.status === 'won') return { status: 'won', shots };
        e = best;
    }
    return { status: 'stuck', shots: 120 };
}
test('B-WIN-01 chaque niveau se gagne avec sa donne réelle par un joueur simple', () => {
    const lost = LEVELS.map((l, i) => ({ id: l.id, ...play(i) })).filter(r => r.status !== 'won');
    expect(lost).toEqual([]);
}, 600000);
