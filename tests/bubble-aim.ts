import assert from './bubble-assert';
import { Engine, key, AIM_MIN, AIM_MAX, type Cell } from '../src/engines/bubble/engine';
import { LEVELS } from '../src/engines/bubble/levels';
/** One board per level: its start grid, then the same grid with holes (side sockets, gaps). */
export function aimBoards(EngineClass = Engine, levels = 30): Engine[] {
    const boards: Engine[] = [];
    for (let level = 0; level < Math.min(levels, LEVELS.length); level++) {
        const source = new EngineClass(28); source.loadLevel(level, 28);
        for (const grid of [source.grid, source.grid.filter((_, i) => (i * 7 + level) % 4 !== 0)] as Cell[][]) {
            const e = new EngineClass(28); e.loadLevel(level, 28); e.load(grid.map(c => ({ ...c })), grid[0]?.color ?? 0, 28);
            boards.push(e);
        }
    }
    return boards;
}
const SAMPLE = 0.0005;
/** Independent brute force: the guide's socket over the whole aim range, as contiguous runs of angles. */
function runs(e: Engine): { key: string; from: number; to: number }[] {
    const out: { key: string; from: number; to: number }[] = [];
    for (let a = AIM_MIN; a <= AIM_MAX + 1e-12; a += SAMPLE) {
        const t = e.trace(a, false).target, k = t ? key(t) : '-', last = out.at(-1);
        if (last && last.key === k) last.to = a; else out.push({ key: k, from: a, to: a });
    }
    return out;
}
/**
 * B-AIM-01: from the left bound, Shift + → (nextSocketAngle) visits every socket whose window is
 * wider than 0.002 rad, lands in the middle of each window, and the shot fills that socket.
 * The plain 0.08 rad arrow step misses sockets on the same boards (counted in `arrowMisses`).
 */
export function fineAimReachesEverySocket(boards = aimBoards()): { sockets: number; arrowMisses: number } {
    let sockets = 0, arrowMisses = 0;
    for (const e of boards) {
        const all = runs(e);
        const visited = new Set<string>();
        let angle = AIM_MIN;
        const first = e.trace(angle, false).target; if (first) visited.add(key(first));
        for (let n = 0; n < 400; n++) {
            const next = e.nextSocketAngle(1, angle);
            if (next === angle) break;
            assert.ok(next > angle && next <= AIM_MAX + 1e-9);
            angle = next;
            const t = e.trace(angle, false).target; assert.ok(t);
            const k = key(t), w = all.find(r => r.from - SAMPLE < angle && angle < r.to + SAMPLE && r.key === k);
            assert.ok(w);
            visited.add(k);
            // Lands well inside the run (a run may hide a sliver of another socket): a hand drift keeps it.
            if (w.to - w.from >= 0.004) assert.ok(Math.min(angle - w.from, w.to - angle) >= 0.3 * (w.to - w.from));
        }
        const arrows = new Set<string>();
        for (let i = -20; i <= 20; i++) { const t = e.trace(Math.max(AIM_MIN, Math.min(AIM_MAX, i * 0.08)), false).target; if (t) arrows.add(key(t)); }
        const wide = new Set(all.filter(r => r.key !== '-' && r.to - r.from >= 0.002).map(r => r.key));
        for (const k of wide) assert.ok(visited.has(k));
        sockets += wide.size;
        for (const k of wide) if (!arrows.has(k)) arrowMisses++;
        // Back to the left: the same walk leftwards ends on the left bound's socket.
        let back = angle;
        for (let n = 0; n < 400; n++) { const prev = e.nextSocketAngle(-1, back); if (prev === back) break; assert.ok(prev < back); back = prev; }
        assert.equal(key(e.trace(back, false).target ?? { row: -1, col: -1 }), first ? key(first) : '-1:-1');
    }
    return { sockets, arrowMisses };
}
