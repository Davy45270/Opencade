import { difficulty, follow, currentAt, layout, gateOpen, same, type Engine, type Direction, type State } from '../../src/engines/serpentin/engine';
import { pilot } from '../../src/engines/serpentin/pilot';

// Mirrors the engine: an arrow under the head imposes the move, portals jump.
function move(state: State, level: number, wanted: Direction): void {
    const head = state.segments[0]; if (!head) return;
    const direction = currentAt(level, head) ?? wanted;
    const next = follow(level, head, direction); if (!next) return;
    state.direction = direction; state.segments.unshift(next);
    if (!same(next, state.apple)) state.segments.pop();
}
/** Plan from the observed position. Queue a corner's exit as well: at level 10
 * two moves can occur between 150 ms observations. No scene clock is touched. */
export function snakePlan(snapshot: ReturnType<Engine['snapshot']>, latencyMs = 0): Direction[] {
    const state = structuredClone(snapshot);
    const ticks = Math.floor((latencyMs + state.remainder + 1e-8) * 60 / 1000);
    const moves = Math.floor((state.movement + ticks * difficulty(state.level).speed + 1e-8) / 60);
    for (let i = 0; i < moves; i++) { const head = state.segments[0]; move(state, state.level, head && currentAt(state.level, head) ? state.direction : state.queue.shift() ?? state.direction); }
    // The clone's clock follows the simulated latency, so gate predictions stay exact.
    state.movement = (state.movement + ticks * difficulty(state.level).speed) - moves * 60; state.ticks += ticks;
    const clock = { ticks: state.ticks, movement: state.movement };
    if (latencyMs > 0) return delayedPlan(state);
    const queue = [...state.queue];
    for (const d of queue) move(state, state.level, d);
    let first = pilot({ state, level: state.level, clock });
    if (first === state.direction && queue.length === 0) {
        const future = structuredClone(state); move(future, state.level, first);
        const exit = pilot({ state: future, level: state.level, clock });
        const head = state.segments[0], next = head && follow(state.level, head, exit);
        // Turn one cell early when the next corner would fall between samples.
        if (exit !== first && next && ![...state.obstacles, ...state.segments.slice(0, -1)].some(c => same(c, next))) first = exit;
    }
    const directions = [first];
    if (first !== state.direction && queue.length === 0) {
        move(state, state.level, first);
        const second = pilot({ state, level: state.level, clock });
        if (second !== first) directions.push(second);
    }
    return directions;
}

/** Select a queued route that also leaves room for the next reaction interval. */
function delayedPlan(state: ReturnType<Engine['snapshot']>): Direction[] {
    const directions: Direction[] = ['up', 'right', 'down', 'left'];
    const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
    const level = state.level, closed = (c: { x: number; y: number }, ahead: number) => layout(level).gates.some(g => same(g.cell, c) && !gateOpen(g, state.ticks + ahead));
    const distance = (s: typeof state): number => {
        const head = s.segments[0]; if (!head) return 1000;
        const seen = new Set([`${String(head.x)},${String(head.y)}`]), q = [{ ...head, distance: 0 }];
        for (let i = 0; i < q.length; i++) {
            const c = q[i]; if (!c) continue;
            if (same(c, s.apple)) return c.distance;
            for (const d of directions) {
                const n = follow(level, c, d); if (!n) continue;
                const key = `${String(n.x)},${String(n.y)}`;
                if (seen.has(key) || [...s.obstacles, ...s.segments.slice(1, -1)].some(b => same(b, n))) continue;
                seen.add(key); q.push({ ...n, distance: c.distance + 1 });
            }
        }
        return 1000;
    };
    let best: Direction[] = [], score = Infinity;
    const preferred = pilot({ state, level: state.level, clock: { ticks: state.ticks, movement: state.movement } });
    for (const a of directions) for (const b of directions) {
        const s = structuredClone(state), commands: Direction[] = [];
        for (const d of [a, b]) {
            const last = s.queue.at(-1) ?? s.direction;
            if (s.queue.length < 2 && d !== last && d !== opposite[last]) { s.queue.push(d); commands.push(d); }
        }
        let valid = true, ate = false;
        for (let i = 0; i < 3; i++) {
            const head = s.segments[0], forced = head && currentAt(level, head), d = forced || (s.queue.shift() ?? s.direction), n = head && follow(level, head, d);
            if (!n || closed(n, Math.ceil((60 - state.movement - 1e-8) / difficulty(level).speed) + Math.floor(i * 60 / difficulty(level).speed)) || [...s.obstacles, ...s.segments.slice(0, same(n, s.apple) ? undefined : -1)].some(c => same(c, n))) { valid = false; break; }
            move(s, s.level, d);
            if (same(n, s.apple)) { ate = true; break; }
        }
        if (!valid) continue;
        const value = (ate ? -100 : distance(s)) + (a === preferred ? 0 : .1) + commands.length * .01;
        if (value < score) { score = value; best = commands; }
    }
    return best;
}
