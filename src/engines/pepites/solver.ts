import { W, type Direction, type Engine } from './engine';
export type Move = Direction | 'wait' | 'prop';
const moves: Move[] = ['up', 'down', 'left', 'right', 'wait'];
/** Offline best-first search over whole turns (offline calibration). Each edge
 * is one real `turn()` of the engine, so a found route replays exactly. */
export function search(start: Engine, limit = 60000, allowProp = false): Move[] | null {
    const key = (e: Engine) => `${e.state.grid.join('')}|${String(e.state.player.x)},${String(e.state.player.y)}|${e.state.enemies.map(n => `${String(n.x)},${String(n.y)}${n.heading}`).join(';')}|${String(e.specialUses)}${String(e.specialTurns)}`;
    const goal = (e: Engine) => e.open;
    // Walking distance (soil, empty, nuggets, open exit) to the nearest nugget, or to the exit once open.
    const nearest = (e: Engine) => {
        const p = e.state.player, wants = goal(e) ? ['E'] : ['*', 'g'], dist = new Map<number, number>([[p.y * W + p.x, 0]]), queue = [p.y * W + p.x];
        for (let i = 0; i < queue.length; i++) {
            const c = queue[i] ?? 0, d = dist.get(c) ?? 0, x = c % W, y = Math.floor(c / W);
            if (wants.includes(e.state.grid[c] ?? '') && i > 0) return d;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
                const n = (y + dy) * W + x + dx, t = e.state.grid[n];
                if (dist.has(n) || !(t === ' ' || t === '.' || t === '*' || t === 'g' || (t === 'E' && goal(e)))) continue;
                dist.set(n, d + 1); queue.push(n);
            }
        }
        return 60;
    };
    // Potential: nuggets in hand, nuggets made available (moths, sorting wall, moss), creatures removed.
    const enemies0 = start.state.enemies.length;
    const score = (e: Engine, depth: number) => (goal(e) ? 0 : 1000) - e.state.nuggets * 60 - e.state.grid.filter(t => t === '*' || t === 'g').length * 20
        - (enemies0 - e.state.enemies.length) * 80 + nearest(e) * 10 + depth * 0.5;
    interface Node { e: Engine; path: Move[]; f: number }
    const open: Node[] = [{ e: start.copy(), path: [], f: 0 }], seen = new Set<string>([key(start)]);
    let expanded = 0;
    while (open.length && expanded < limit) {
        // Small open lists: linear extraction keeps the code obvious.
        let bi = 0; for (let i = 1; i < open.length; i++) if ((open[i]?.f ?? Infinity) < (open[bi]?.f ?? Infinity)) bi = i;
        const node = open.splice(bi, 1)[0]; if (!node) break; expanded++;
        for (const m of allowProp && node.e.specialUses ? [...moves, 'prop' as const] : moves) {
            const e = node.e.copy();
            if (m === 'prop') e.special(); else if (m !== 'wait') e.input(m);
            e.turn();
            if (e.status === 'won') return [...node.path, m];
            if (e.status === 'lost') continue;
            const k = key(e); if (seen.has(k)) continue; seen.add(k);
            open.push({ e, path: [...node.path, m], f: score(e, node.path.length + 1) });
        }
    }
    return null;
}
