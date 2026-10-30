import { follow, currentAt, same, layout, gateOpen, opposite, type Cell, type Direction, type Engine } from './engine';
const directions: Direction[] = ['up', 'right', 'down', 'left'];
/** Ordinary routes with a tail escape check; never activates the optional dodge.
 * Routes use the level's real moves: portals, arrows that impose the next move,
 * and gates predicted closed at the arrival tick. */
export interface Clock { ticks: number; movement: number }
export function pilot(e: Pick<Engine, 'state' | 'level'> & { snapshot?: () => Clock; clock?: Clock }, order: readonly Direction[] = directions): Direction {
    const { state: s, level } = e, head = s.segments[0];
    if (!head) return s.direction;
    const l = layout(level), clock = e.clock ?? e.snapshot?.(), ticks = clock?.ticks ?? 0, movement = clock?.movement ?? 0;
    const first = Math.ceil((60 - movement - 1e-8) / l.speed), per = 60 / l.speed;
    const closed = (c: Cell, depth: number) => l.gates.some(g => same(g.cell, c) && !gateOpen(g, ticks + first + Math.floor((depth - 1) * per)));
    const key = (c: Cell) => c.y * 15 + c.x;
    const route = (start: Cell, target: Cell, blocked: Cell[], heading: Direction): Direction[] | null => {
        const wall = new Set([...blocked, ...l.patrols.flatMap(p => p.path)].map(key)), seen = new Set([key(start)]);
        const queue = [{ cell: start, path: [] as Direction[], heading }];
        for (let i = 0; i < queue.length; i++) {
            const item = queue[i]; if (!item) continue;
            const forced = currentAt(level, item.cell);
            for (const d of forced ? [forced] : order) {
                if (!forced && d === opposite[item.heading]) continue;
                const next = follow(level, item.cell, d);
                if (!next || wall.has(key(next)) || closed(next, item.path.length + 1)) continue;
                if (seen.has(key(next))) continue;
                const path = [...item.path, d];
                if (same(next, target)) return path;
                seen.add(key(next)); queue.push({ cell: next, path, heading: d });
            }
        }
        return null;
    };
    const target = s.scissors && s.segments.length >= 12 ? s.scissors : s.apple;
    const plan = route(head, target, [...s.obstacles, ...s.segments.slice(1)], s.direction);
    if (plan) {
        const future = s.segments.map(c => ({ ...c }));
        for (const d of plan) {
            const next = follow(level, future[0] ?? head, d); if (!next) break;
            future.unshift(next); if (!same(next, s.apple)) future.pop();
        }
        const end = future[0], tail = future.at(-1);
        if (end && tail && route(end, tail, [...s.obstacles, ...future.slice(1, -1)], plan.at(-1) ?? s.direction)) return plan[0] ?? s.direction;
    }
    const forced = currentAt(level, head);
    if (forced) return forced;
    return route(head, s.segments.at(-1) ?? head, [...s.obstacles, ...s.segments.slice(1, -1)], s.direction)?.[0]
        ?? order.find(d => { const n = follow(level, head, d); return d !== opposite[s.direction] && n && !closed(n, 1) && !l.patrols.some(p => p.path.some(c => same(c, n))) && ![...s.obstacles, ...s.segments.slice(0, -1)].some(c => same(c, n)); })
        ?? s.direction;
}
