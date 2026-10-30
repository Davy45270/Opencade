import { Engine, W, type Direction, type State } from '../../src/engines/pepites/engine';
const steps: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
/** Live finger policy: from the observed position, the first step of the
 * shortest walk to the nearest nugget (or the open exit) whose next three turns,
 * simulated on a copy, do not lose. No future input is assumed. */
export function pepitesStep(level: number, observed: State, aheadTurns = 0): Direction | null {
    const model = new Engine(level); model.loadState(observed);
    // Latency: the world keeps turning between the observation and the tap; plan from where it will be.
    for (let i = 0; i < aheadTurns && model.status === 'playing'; i++) model.turn();
    const state = model.state;
    const target = model.open ? 'E' : '*', start = state.player.y * W + state.player.x;
    const prev = new Map<number, [number, Direction]>(), queue = [start], seen = new Set([start]);
    const walkable = (t: string | undefined) => t === ' ' || t === '.' || t === '*' || t === 'g' || (t === 'E' && model.open);
    for (let i = 0; i < queue.length; i++) {
        const c = queue[i] ?? 0;
        if (i > 0 && (state.grid[c] === target || (target === '*' && state.grid[c] === 'g'))) {
            let cur = c, first: Direction | null = null;
            while (cur !== start) { const p = prev.get(cur); if (!p) break; first = p[1]; cur = p[0]; }
            if (first && safe(model, first, aheadTurns)) return first;
            continue;
        }
        for (const d of ['down', 'left', 'right', 'up'] as Direction[]) {
            const [dx, dy] = steps[d], n = c + dy * W + dx;
            // A boulder can be pushed sideways into an empty cell.
            const pushable = dy === 0 && state.grid[n] === 'o' && state.grid[n + dx] === ' ';
            if (seen.has(n) || !(walkable(state.grid[n]) || pushable)) continue;
            seen.add(n); prev.set(n, [c, d]); queue.push(n);
        }
    }
    return (['left', 'right', 'down', 'up'] as Direction[]).find(d => safe(model, d, aheadTurns)) ?? null;
}
/** The move is safe if the miner survives standing still for the reaction
 * horizon (the next tap lands that late), then some continuation of two more
 * turns (any step or a pause) survives. */
function safe(model: Engine, d: Direction, idle = 0): boolean {
    const e = model.copy(); e.input(d); e.turn();
    for (let i = 0; i < idle && e.status === 'playing'; i++) e.turn();
    return e.status !== 'lost' && survives(e, 2);
}
function survives(e: Engine, depth: number): boolean {
    if (depth === 0 || e.status !== 'playing') return e.status !== 'lost';
    for (const a of [null, 'down', 'left', 'right', 'up'] as (Direction | null)[]) {
        const n = e.copy(); if (a) n.input(a); n.turn();
        if (survives(n, depth - 1)) return true;
    }
    return false;
}
