import { bit, bitCount, topology, type Grid, type Topology } from './grid';
/**
 * Exact solver (dossier § solver): constraint propagation (naked and hidden singles) then backtracking on the cell with
 * the fewest candidates (MRV), counting solutions up to `countLimit` (2 by default: 0, 1 or "at least 2").
 * A node or time limit gives `unknown`, never `unique` (AC08).
 */
export interface SolveOptions {
    /** Search nodes (assumptions) allowed; 200 000 by default. */
    maxNodes?: number;
    /** Wall-clock budget, only with an injected clock (engines read no clock of their own). */
    maxDurationMs?: number;
    now?: () => number;
    countLimit?: 1 | 2;
}
export type SolveResult =
    | { status: 'solved'; solution: number[]; solutionCount: 1 | 2; nodes: number }
    | { status: 'unsolvable'; solutionCount: 0; nodes: number }
    | { status: 'unknown'; reason: 'timeout' | 'node_limit'; nodes: number };
interface Work { values: number[]; masks: number[] }
class Limit extends Error { constructor(readonly reason: 'timeout' | 'node_limit') { super(reason); } }
function assign(t: Topology, w: Work, i: number, v: number): boolean {
    w.values[i] = v; w.masks[i] = 0;
    const b = bit(v);
    for (const p of t.peers[i] ?? []) {
        if (w.values[p] === v) return false;
        if (!w.values[p]) w.masks[p] = (w.masks[p] ?? 0) & ~b;
    }
    return true;
}
/** Singles until nothing moves; false on a contradiction (an empty cell without candidate, a digit without place). */
function propagate(t: Topology, w: Work): boolean {
    for (let changed = true; changed;) {
        changed = false;
        for (let i = 0; i < t.cells; i++) {
            if (w.values[i]) continue;
            const m = w.masks[i] ?? 0;
            if (!m) return false;
            if (!(m & (m - 1))) { if (!assign(t, w, i, 31 - Math.clz32(m) + 1)) return false; changed = true; }
        }
        for (const unit of t.units) {
            let placed = 0;
            for (const i of unit) placed |= bit(w.values[i] ?? 0) & t.full;
            for (let v = 1; v <= t.size; v++) {
                const b = bit(v); if (placed & b) continue;
                let at = -1, count = 0;
                for (const i of unit) if ((w.masks[i] ?? 0) & b) { count++; at = i; }
                if (!count) return false;
                if (count === 1) { if (!assign(t, w, at, v)) return false; placed |= b; changed = true; }
            }
        }
    }
    return true;
}
export function solve(puzzle: Grid & { givens: readonly number[] }, options: SolveOptions = {}): SolveResult {
    const t = topology(puzzle), maxNodes = options.maxNodes ?? 200_000, limit = options.countLimit ?? 2;
    const started = options.now?.() ?? 0;
    let nodes = 0;
    const w: Work = { values: Array<number>(t.cells).fill(0), masks: Array<number>(t.cells).fill(t.full) };
    if (puzzle.givens.length !== t.cells) return { status: 'unsolvable', solutionCount: 0, nodes };
    for (let i = 0; i < t.cells; i++) {
        const v = puzzle.givens[i] ?? 0;
        if (v < 0 || v > t.size || !Number.isInteger(v)) return { status: 'unsolvable', solutionCount: 0, nodes };
        if (v && (!((w.masks[i] ?? 0) & bit(v)) || !assign(t, w, i, v))) return { status: 'unsolvable', solutionCount: 0, nodes };
    }
    const solutions: number[][] = [];
    const search = (state: Work): void => {
        if (!propagate(t, state)) return;
        let best = -1, fewest = 99;
        for (let i = 0; i < t.cells; i++) {
            if (state.values[i]) continue;
            const c = bitCount(state.masks[i] ?? 0);
            if (c < fewest) { fewest = c; best = i; if (c === 2) break; }
        }
        if (best < 0) { solutions.push([...state.values]); return; }
        const m = state.masks[best] ?? 0;
        for (let v = 1; v <= t.size && solutions.length < limit; v++) {
            if (!(m & bit(v))) continue;
            if (++nodes > maxNodes) throw new Limit('node_limit');
            if (options.now && options.maxDurationMs !== undefined && options.now() - started > options.maxDurationMs) throw new Limit('timeout');
            const next: Work = { values: [...state.values], masks: [...state.masks] };
            if (assign(t, next, best, v)) search(next);
        }
    };
    try { search(w); } catch (error) {
        if (error instanceof Limit) return { status: 'unknown', reason: error.reason, nodes };
        throw error;
    }
    const first = solutions[0];
    if (!first) return { status: 'unsolvable', solutionCount: 0, nodes };
    return { status: 'solved', solution: first, solutionCount: solutions.length >= 2 ? 2 : 1, nodes };
}
/** Proved unique: solved with exactly one solution. `unknown` is never unique. */
export function provedUnique(puzzle: Grid & { givens: readonly number[] }, options?: SolveOptions): number[] | null {
    const r = solve(puzzle, { ...options, countLimit: 2 });
    return r.status === 'solved' && r.solutionCount === 1 ? r.solution : null;
}
