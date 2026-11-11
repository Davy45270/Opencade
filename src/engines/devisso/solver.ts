import { blocker, key, legal, stuck, unscrew, won, type Board, type State } from './rules';
/** Depth-first search over whole positions with a memo of dead positions. Every edge is the
 * rules' own `unscrew`, so a proof replays the real game. Moves that drop a screw straight into
 * a box are tried first. `limit` bounds the visited positions (clock-free budget). */
export interface Search { moves: number[]; visited: number; complete: boolean }
function order(board: Board, s: State, moves: number[]): number[] {
    const score = (i: number): number => {
        const moved = unscrew(board, s, i); if (!moved) return 99;
        return (moved.events.includes('buffer') ? 10 : 0) - moved.events.filter(e => e === 'complete').length * 3 - moved.fell.length;
    };
    return moves.map(i => [i, score(i)] as const).sort((a, b) => a[1] - b[1] || a[0] - b[0]).map(([i]) => i);
}
export function solve(board: Board, start: State, limit = 200000): Search | null {
    const dead = new Set<string>(), path: number[] = [];
    const budget = { visited: 0, over: false };
    const visit = (s: State): boolean => {
        if (won(s)) return true;
        const k = key(s); if (dead.has(k)) return false;
        if (++budget.visited > limit) { budget.over = true; return false; }
        for (const i of order(board, s, legal(board, s))) {
            const moved = unscrew(board, s, i); if (!moved) continue;
            path.push(i);
            if (visit(moved.state)) return true;
            path.pop();
            if (budget.over) return false;
        }
        dead.add(k); return false;
    };
    const found = visit(start), visited = budget.visited;
    return found ? { moves: [...path], visited, complete: true } : budget.over ? null : { moves: [], visited, complete: true };
}
/** A real dead end: a sequence of legal moves after which no move is possible. Buffer moves first. */
export function trap(board: Board, start: State, limit = 200000): number[] | null {
    const seen = new Set<string>(), path: number[] = [];
    let visited = 0;
    const visit = (s: State): boolean => {
        if (stuck(board, s)) return true;
        if (won(s)) return false;
        const k = key(s); if (seen.has(k) || ++visited > limit) return false;
        seen.add(k);
        for (const i of order(board, s, legal(board, s)).reverse()) {
            const moved = unscrew(board, s, i); if (!moved) continue;
            path.push(i);
            if (visit(moved.state)) return true;
            path.pop();
        }
        return false;
    };
    return visit(start) ? [...path] : null;
}
/** Shortest dead end by breadth-first search (bounded). */
export function shortestTrap(board: Board, start: State, limit = 300000): number[] | null {
    let layer: { s: State; path: number[] }[] = [{ s: start, path: [] }];
    const seen = new Set<string>([key(start)]);
    while (layer.length && seen.size < limit) {
        const next: typeof layer = [];
        for (const { s, path } of layer) for (const i of legal(board, s)) {
            const moved = unscrew(board, s, i); if (!moved) continue;
            const p = [...path, i];
            if (stuck(board, moved.state)) return p;
            const k = key(moved.state); if (seen.has(k)) continue;
            seen.add(k); next.push({ s: moved.state, path: p });
        }
        layer = next;
    }
    return null;
}
/** Screws free right now (nothing above, no lock, ice or chain), whether or not they fit. */
export function free(board: Board, s: State): number[] {
    return board.screws.flatMap((_, i) => s.present[i] && blocker(board, s, i) === null ? [i] : []);
}
