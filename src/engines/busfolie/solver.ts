import { boarding, exitFor, forwardSign, horizontal, isCar, legalMoves, type Core, type Direction, type LevelDefinition, type Side } from './rules';
/** Solver of the dossier: breadth-first search (A* with the admissible heuristic 0 and unit costs) over a canonical
 * state — the moving coordinate of every vehicle (or "departed") and the head of the waiting line; the fixed lane of a
 * vehicle, the obstacles and the exits never change. Results `solved` (a shortest line), `unsolvable` (the reachable
 * space was exhausted without a win) or `unknown` (a node or time limit was hit: never reported as unsolvable). */
export interface Move { busId: string; direction: Direction; distance: number; departs: boolean }
export interface SolverResult { status: 'solved' | 'unsolvable' | 'unknown'; actions?: Move[]; exploredNodes: number; durationMs: number; reason?: 'timeout' | 'node_limit' }
export const LIMITS = { nodes: 400000, ms: 20000 } as const;
interface Compiled {
    n: number; w: number; h: number; fixed: Int8Array; len: Int8Array; hz: Uint8Array; sign: Int8Array; oneWay: Uint8Array; car: Uint8Array;
    /** Per vehicle: may it leave through its low end (left/top), its high end (right/bottom), exit colour included. */
    low: Uint8Array; high: Uint8Array; walls: Uint8Array; grid: Uint8Array; ids: string[];
    /** board[q * n + i]: head of the line after vehicle i boards at head q, or -1. */
    board: Int16Array; groups: number; reverse: boolean;
}
export function compile(level: LevelDefinition): Compiled {
    const n = level.buses.length, w = level.board.width, h = level.board.height, groups = level.passengerQueue.length;
    const c: Compiled = {
        n, w, h, fixed: new Int8Array(n), len: new Int8Array(n), hz: new Uint8Array(n), sign: new Int8Array(n), oneWay: new Uint8Array(n), car: new Uint8Array(n),
        low: new Uint8Array(n), high: new Uint8Array(n), walls: new Uint8Array(w * h), grid: new Uint8Array(w * h), ids: level.buses.map(b => b.id), board: new Int16Array((groups + 1) * n).fill(-1), groups,
        reverse: level.rules.allowReverse,
    };
    for (const o of level.obstacles) c.walls[o.y * w + o.x] = 1;
    level.buses.forEach((b, i) => {
        c.fixed[i] = horizontal(b) ? b.y : b.x; c.len[i] = b.length; c.hz[i] = horizontal(b) ? 1 : 0; c.sign[i] = forwardSign(b);
        c.oneWay[i] = b.oneWay || !level.rules.allowReverse ? 1 : 0; c.car[i] = isCar(b) ? 1 : 0;
        const ok = (side: Side): number => { const e = exitFor(level, b, side); return !isCar(b) && e && (e.color === null || e.color === b.color) ? 1 : 0; };
        c.low[i] = ok(horizontal(b) ? 'left' : 'top'); c.high[i] = ok(horizontal(b) ? 'right' : 'bottom');
        if (c.oneWay[i]) { if (c.sign[i] > 0) c.low[i] = 0; else c.high[i] = 0; }
        for (let q = 0; q <= groups; q++) { const r = boarding(level.passengerQueue, q, b.color, b.capacity); if (typeof r !== 'string') c.board[q * n + i] = r.next; }
    });
    return c;
}
/** Canonical state, as a string key: one char per vehicle (moving coordinate + 1, 0 when departed), then the head of
 * the line. Successors are built by replacing chars of the key: no array per state. */
export function encode(level: LevelDefinition, state: Core): string {
    return String.fromCharCode(...level.buses.map(b => { const p = state.busPositions[b.id]; return p ? 1 + (horizontal(b) ? p.x : p.y) : 0; }), state.passengerQueueIndex);
}
export interface Step { key: string; vehicle: number; delta: number; departs: boolean }
/** Successors of a canonical state, with the move that leads to each. */
export function successors(c: Compiled, key: string, out: Step[] = []): Step[] {
    out.length = 0;
    const { n, w, h } = c, grid = c.grid;
    grid.set(c.walls);
    for (let i = 0; i < n; i++) {
        const p = key.charCodeAt(i); if (!p) continue;
        const f = c.fixed[i] ?? 0, len = c.len[i] ?? 2;
        for (let k = 0; k < len; k++) grid[c.hz[i] ? f * w + p - 1 + k : (p - 1 + k) * w + f] = 1;
    }
    const q = key.charCodeAt(n);
    for (let i = 0; i < n; i++) {
        const p = key.charCodeAt(i) - 1; if (p < 0) continue;
        const hz = c.hz[i] === 1, f = c.fixed[i] ?? 0, len = c.len[i] ?? 2, size = hz ? w : h, sign = c.sign[i] ?? 1;
        const head = key.slice(0, i), tail = key.slice(i + 1);
        for (let dir = 1; dir >= -1; dir -= 2) {
            if (c.oneWay[i] && dir !== sign) continue;
            let clear = true;
            for (let d = 1; ; d++) {
                const front = dir > 0 ? p + len - 1 + d : p - d;
                if (front < 0 || front >= size) break;
                if (grid[hz ? f * w + front : front * w + f]) { clear = false; break; }
                out.push({ key: head + String.fromCharCode(p + dir * d + 1) + tail, vehicle: i, delta: dir * d, departs: false });
            }
            if (!clear || (dir > 0 ? !c.high[i] : !c.low[i])) continue;
            const next = c.board[q * n + i] ?? -1; if (next < 0) continue;
            out.push({ key: head + '\u0000' + tail.slice(0, -1) + String.fromCharCode(next), vehicle: i, delta: dir > 0 ? size - p : -(p + len), departs: true });
        }
    }
    return out;
}
export function isWin(c: Compiled, key: string): boolean {
    if (key.charCodeAt(c.n) < c.groups) return false;
    for (let i = 0; i < c.n; i++) if (!c.car[i] && key.charCodeAt(i)) return false;
    return true;
}
/** The spec's move from a vehicle index and a signed delta. */
export function moveOf(level: LevelDefinition, vehicle: number, delta: number, departs: boolean): Move {
    const bus = level.buses[vehicle]; if (!bus) throw new RangeError('Bus');
    return { busId: bus.id, direction: Math.sign(delta) === forwardSign(bus) ? 'forward' : 'backward', distance: Math.abs(delta), departs };
}
/** Shortest line from `state` (moves counted per validated displacement, whatever its distance). */
export function solve(level: LevelDefinition, state: Core, limits: { nodes?: number; ms?: number } = {}): SolverResult {
    const t0 = Date.now(), maxNodes = limits.nodes ?? LIMITS.nodes, maxMs = limits.ms ?? LIMITS.ms;
    if (state.status === 'won') return { status: 'solved', actions: [], exploredNodes: 0, durationMs: 0 };
    const c = compile(level), startKey = encode(level, state);
    const parent = new Map<string, [string, number, number, boolean]>();
    let frontier = [startKey], explored = 0;
    const buffer: Step[] = [];
    while (frontier.length) {
        const next: string[] = [];
        for (const sk of frontier) {
            explored++;
            if (explored > maxNodes) return { status: 'unknown', exploredNodes: explored, durationMs: Date.now() - t0, reason: 'node_limit' };
            if ((explored & 1023) === 0 && Date.now() - t0 > maxMs) return { status: 'unknown', exploredNodes: explored, durationMs: Date.now() - t0, reason: 'timeout' };
            for (const m of successors(c, sk, buffer)) {
                const k = m.key;
                if (k === startKey || parent.has(k)) continue;
                parent.set(k, [sk, m.vehicle, m.delta, m.departs]);
                if (isWin(c, k)) {
                    const actions: Move[] = [];
                    for (let cur = k; cur !== startKey;) { const e = parent.get(cur); if (!e) break; actions.unshift(moveOf(level, e[1], e[2], e[3])); cur = e[0]; }
                    return { status: 'solved', actions, exploredNodes: explored, durationMs: Date.now() - t0 };
                }
                next.push(k);
            }
        }
        frontier = next;
    }
    return { status: 'unsolvable', exploredNodes: explored, durationMs: Date.now() - t0 };
}
/** The whole reachable space from the start, with the distance to a win of every state (-1: a dead end, the level can
 * no longer be won from there). Used offline (search, validation, measured difficulty and traps), never per frame. */
export interface Analysis {
    status: 'solved' | 'unsolvable' | 'unknown'; states: number; dead: number; optimal: number;
    /** Along one shortest line: the legal moves of each position and how many of them fall into a dead end. */
    path: { moves: number; traps: number; trapDepartures: number }[];
    /** A tempting dead end: from a position of the shortest line, a move (a departure when one exists) into a dead state. */
    trap: { before: Move[]; move: Move } | null;
    solution: Move[];
}
export function analyse(level: LevelDefinition, state: Core, maxStates: number = LIMITS.nodes): Analysis {
    const c = compile(level), start = encode(level, state), index = new Map<string, number>([[start, 0]]);
    const keys: string[] = [start], edgesFrom: number[] = [0], targets: number[] = [], wins: number[] = [];
    const buffer: Step[] = [];
    for (let i = 0; i < keys.length; i++) {
        if (keys.length > maxStates) return { status: 'unknown', states: keys.length, dead: 0, optimal: -1, path: [], trap: null, solution: [] };
        const s = keys[i] ?? '';
        if (isWin(c, s)) wins.push(i);
        else for (const m of successors(c, s, buffer)) {
            const k = m.key; let j = index.get(k);
            if (j === undefined) { j = keys.length; index.set(k, j); keys.push(k); }
            targets.push(j);
        }
        edgesFrom.push(targets.length);
    }
    // Reverse BFS from the wins: distance to a win of every state.
    const m = keys.length, count = new Int32Array(m + 1), from = new Int32Array(targets.length);
    for (const t of targets) count[t + 1] = (count[t + 1] ?? 0) + 1;
    for (let i = 0; i < m; i++) count[i + 1] = (count[i + 1] ?? 0) + (count[i] ?? 0);
    const fill = count.slice(0, m);
    for (let i = 0; i < m; i++) for (let e = edgesFrom[i] ?? 0; e < (edgesFrom[i + 1] ?? 0); e++) { const t = targets[e] ?? 0; from[fill[t] ?? 0] = i; fill[t] = (fill[t] ?? 0) + 1; }
    const dist = new Int32Array(m).fill(-1);
    let queue = wins; for (const wi of wins) dist[wi] = 0;
    for (let d = 1; queue.length; d++) {
        const next: number[] = [];
        for (const v of queue) for (let e = count[v] ?? 0; e < (count[v + 1] ?? 0); e++) { const u = from[e] ?? 0; if (dist[u] === -1) { dist[u] = d; next.push(u); } }
        queue = next;
    }
    const dead = dist.reduce((a, d) => a + (d < 0 ? 1 : 0), 0), optimal = dist[0] ?? -1;
    if (optimal < 0) return { status: 'unsolvable', states: m, dead, optimal, path: [], trap: null, solution: [] };
    // Walk one shortest line, deterministic (first successor that gets one step closer).
    const solution: Move[] = [], path: Analysis['path'] = [];
    let trap: Analysis['trap'] = null, trapScore = -1;
    for (let cur = 0; (dist[cur] ?? 0) > 0;) {
        const s = keys[cur] ?? '', moves = successors(c, s, []);
        let traps = 0, trapDepartures = 0, step: (typeof moves)[number] | undefined, after = -1;
        for (const mv of moves) {
            const j = index.get(mv.key) ?? -1, dj = dist[j] ?? -1;
            if (dj < 0) {
                traps++; if (mv.departs) trapDepartures++;
                // The most tempting dead end: a departure first, the earliest one on the line.
                const score = (mv.departs ? 2 : 1);
                if (score > trapScore) { trapScore = score; trap = { before: [...solution], move: moveOf(level, mv.vehicle, mv.delta, mv.departs) }; }
            }
            if (!step && dj === (dist[cur] ?? 0) - 1) { step = mv; after = j; }
        }
        path.push({ moves: moves.length, traps, trapDepartures });
        if (!step) break;
        solution.push(moveOf(level, step.vehicle, step.delta, step.departs)); cur = after;
    }
    return { status: 'solved', states: m, dead, optimal, path, trap, solution };
}
/** Measured difficulty: the shortest line, plus the mean choice along it, plus the share of choices that are traps. */
export function difficulty(a: Analysis): number {
    if (a.status !== 'solved' || !a.path.length) return 0;
    const choice = a.path.reduce((s, p) => s + p.moves, 0) / a.path.length;
    const traps = a.path.reduce((s, p) => s + p.traps, 0) / Math.max(1, a.path.reduce((s, p) => s + p.moves, 0));
    return Math.round(10 * (a.optimal + choice / 6 + 4 * traps + Math.log2(a.states) / 6)) / 10;
}
/** Legal moves of the rules, checked against the solver's successors (used by the tests). */
export function legalCount(level: LevelDefinition, state: Core): number { return legalMoves(level, state).length; }
