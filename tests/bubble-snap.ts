import assert from './bubble-assert';
import { Engine, center, neighbors, key, valid, RADIUS, WIDTH, ORIGIN, ROWS, CONTACT_SCALE, type Cell, type Point } from '../src/engines/bubble/engine';
import { LEVELS } from '../src/engines/bubble/levels';
// Independent geometry: brute force over all 117 cells, no shared helper from snap().
const REACH = 2 * RADIUS / Math.sqrt(3);
function allCells(): { row: number; col: number }[] {
    const cells: { row: number; col: number }[] = [];
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < 9; col++) if (valid(row, col)) cells.push({ row, col });
    return cells;
}
function hanging(cell: { row: number; col: number }, occupied: Set<string>): boolean {
    return cell.row === 0 || neighbors({ ...cell, color: 0 }).some(n => occupied.has(key(n)));
}
function nearestSocket(at: Point, grid: Cell[], drops: number): { row: number; col: number } | null {
    const occupied = new Set(grid.map(key));
    let best: { row: number; col: number } | null = null, bestDistance = Infinity;
    for (const cell of allCells()) {
        if (occupied.has(key(cell)) || !hanging(cell, occupied)) continue;
        const p = center(cell, drops), d = Math.hypot(p.x - at.x, p.y - at.y);
        if (d < bestDistance - 1e-9) { best = cell; bestDistance = d; }
    }
    return best;
}
function segmentDistance(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l));
    return Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
}
/** B-SNAP-01: every shot settles in the free hanging cell that contains its impact point. */
export function impactCell(EngineClass = Engine, step = 2): number {
    let checked = 0;
    for (let level = 0; level < LEVELS.length; level++) {
        const source = new EngineClass(28); source.loadLevel(level, 28);
        // Holes make grazing shots, side sockets and shots threading a gap.
        const grid = source.grid.filter((_, i) => (i * 7 + level) % 5 !== 0);
        const e = new EngineClass(28); e.loadLevel(level, 28); e.load(grid, grid[0]?.color ?? 0, 28);
        const occupied = new Set(grid.map(key));
        for (let i = -139; i <= 139; i += step) {
            const angle = i / 100, path = e.trace(angle), end = path.segments.at(-1)?.to;
            assert.ok(end && path.target);
            const target = path.target, p = center(target, e.drops);
            assert.equal(occupied.has(key(target)), false, `occupied L${String(level + 1)} ${String(angle)}`);
            assert.ok(hanging(target, occupied));
            assert.ok(Math.hypot(p.x - end.x, p.y - end.y) <= REACH + 1e-9);
            assert.deepEqual({ row: target.row, col: target.col }, nearestSocket(end, grid, e.drops));
            if (path.struck) {
                const struck = path.struck, q = center(struck, e.drops);
                assert.ok(neighbors(struck).some(n => key(n) === key(target)));
                // First contact: the projectile touches the struck bubble at the contact distance.
                assert.ok(Math.abs(Math.hypot(q.x - end.x, q.y - end.y) - 2 * RADIUS * CONTACT_SCALE) < 1e-6);
            } else assert.ok(Math.abs(end.y - (RADIUS + e.drops * Math.sqrt(3) * RADIUS)) < 1e-6);
            // No tunnelling: the path never comes closer than contact to any bubble.
            for (const cell of grid) for (const s of path.segments)
                assert.equal(segmentDistance(center(cell, e.drops), s.from, s.to) >= 2 * RADIUS * CONTACT_SCALE - 1e-6, true, `tunnel L${String(level + 1)} ${String(angle)}`);
            checked++;
        }
    }
    return checked;
}
/** B-SNAP-02: walls on an empty board: exact bounce count, mirrored directions, ceiling socket. */
export function wallBounces(EngineClass = Engine): void {
    const e = new EngineClass(); e.load([]);
    for (let i = -139; i <= 139; i++) {
        const angle = i / 100, path = e.trace(angle);
        const travel = (ORIGIN.y - RADIUS) * Math.abs(Math.tan(angle)), lane = WIDTH - 2 * RADIUS, first = ORIGIN.x - RADIUS;
        const bounces = travel <= first ? 0 : 1 + Math.floor((travel - first) / lane);
        assert.equal(path.segments.length, bounces + 1, `bounces ${String(angle)}`);
        path.segments.forEach((s, n) => {
            assert.ok(s.from.x >= RADIUS - 1e-9 && s.from.x <= WIDTH - RADIUS + 1e-9 && s.to.x >= RADIUS - 1e-9 && s.to.x <= WIDTH - RADIUS + 1e-9);
            assert.ok(Math.abs(Math.hypot(s.direction.x, s.direction.y) - 1) < 1e-12);
            assert.ok(s.to.y < s.from.y);
            const next = path.segments[n + 1];
            assert.equal(s.bounce, next !== undefined);
            if (next) {
                assert.ok(Math.abs(s.to.x - RADIUS) < 1e-9 || Math.abs(s.to.x - (WIDTH - RADIUS)) < 1e-9);
                assert.equal(next.direction.x, -s.direction.x); assert.equal(next.direction.y, s.direction.y);
                assert.deepEqual(next.from, s.to);
            }
        });
        const end = path.segments.at(-1)?.to;
        assert.ok(end && Math.abs(end.y - RADIUS) < 1e-9);
        assert.deepEqual(path.target && { row: path.target.row, col: path.target.col }, { row: 0, col: Math.min(8, Math.max(0, Math.round((end.x - RADIUS) / (2 * RADIUS)))) });
    }
    // Exact wall/ceiling corner: the ceiling wins, no zero-length bounce, corner socket.
    for (const [angle, col] of [[Math.atan(160 / 550), 8], [-Math.atan(160 / 550), 0]] as const) {
        const path = e.trace(angle);
        assert.equal(path.segments.length, 1);
        assert.ok(Math.abs((path.segments[0]?.to.x ?? 0) - (col ? WIDTH - RADIUS : RADIUS)) < 1e-9);
        assert.deepEqual(path.target, { row: 0, col, color: 0 });
    }
}
function anchoredKeys(grid: Cell[]): Set<string> {
    const cells = new Map(grid.map(c => [key(c), c])), seen = new Set<string>();
    const queue = grid.filter(c => c.row === 0);
    while (queue.length) {
        const cell = queue.pop();
        if (!cell || seen.has(key(cell))) continue;
        seen.add(key(cell));
        for (const n of neighbors(cell)) { const next = cells.get(key(n)); if (next) queue.push(next); }
    }
    return seen;
}
/** B-SNAP-03: real shots through every level; detached groups always fall, nothing floats, attached = guide target. */
export function detachedGroupsFall(EngineClass = Engine): number {
    let falls = 0;
    for (let level = 0; level < LEVELS.length; level++) {
        const e = new EngineClass(28); e.loadLevel(level, 28);
        for (let shot = 0; shot < 30 && e.status === 'playing'; shot++) {
            const angle = Math.sin(shot * 2.3 + level) * 1.35;
            const before = e.grid.map(c => ({ ...c })), guide = e.trace(angle).target;
            e.aim(angle); e.shoot(); e.advance(10000);
            assert.deepEqual(e.last.attached && { row: e.last.attached.row, col: e.last.attached.col }, guide && { row: guide.row, col: guide.col });
            const anchored = anchoredKeys(e.grid);
            assert.equal(e.grid.every(c => anchored.has(key(c))), true, `floating L${String(level + 1)} shot ${String(shot + 1)}`);
            if (!e.last.popped.length) assert.equal(e.last.fallen.length, 0);
            // Fallen cells are exactly the survivors of the pop that lost every path to row 0.
            const removed = new Set(e.last.popped.map(key));
            const after = [...before, ...(e.last.attached ? [e.last.attached] : [])].filter(c => !removed.has(key(c)));
            const reach = anchoredKeys(after);
            if (e.last.popped.length) assert.deepEqual(e.last.fallen.map(key).sort(), after.filter(c => !reach.has(key(c))).map(key).sort());
            falls += e.last.fallen.length;
        }
    }
    return falls;
}
