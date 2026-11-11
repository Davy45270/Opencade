import { Random } from '../shared/random';
import { DIRECTIONS, applyAction, initialState, maxTile, segments, slide, slideBoard, type Direction, type GameConfig, type GameState } from './rules';
/**
 * Bounded expectimax, the help agent: player nodes take the best of the four directions, chance nodes average the
 * spawn of a 2 or a 4 in every empty cell (weighted by the config). Leaves are scored by a line heuristic (empty
 * cells, possible merges, monotonic lines, tile sum), a well-known public heuristic for sliding-tile games, written again here
 * for any size and with walls. It is a helper, never a guarantee: a seed does not make a game winnable, and the
 * agent can lose.
 */
const LOST = 0;
const EMPTY: readonly number[] = [];
const RANK_POW_4: number[] = [], RANK_POW_35: number[] = [];
for (let r = 0; r < 20; r++) { RANK_POW_4.push(r ** 4); RANK_POW_35.push(r ** 3.5); }
const rank = (v: number): number => v ? 31 - Math.clz32(v) : 0;
const lineCache = new Map<string, number[][]>();
/** Row and column segments (walls cut lines), cached per geometry. */
function lines(size: number, walls: readonly number[]): number[][] {
    const key = `${String(size)}:${walls.join(',')}`;
    let out = lineCache.get(key);
    if (!out) { const seg = segments(size, walls); out = [...seg.left, ...seg.up]; lineCache.set(key, out); }
    return out;
}
/** Line score: the same formula for every row and column segment. Higher is better. */
function lineScore(board: readonly number[], line: readonly number[]): number {
    let empty = 0, merges = 0, prev = 0, counter = 0, sum = 0, left = 0, right = 0, before = -1;
    for (const i of line) {
        const r = rank(board[i] ?? 0);
        sum += RANK_POW_35[r] ?? 0;
        if (r === 0) empty++;
        else { if (prev === r) counter++; else if (counter > 0) { merges += 1 + counter; counter = 0; } prev = r; }
        if (before >= 0) { const a = RANK_POW_4[before] ?? 0, b = RANK_POW_4[r] ?? 0; if (a > b) left += a - b; else right += b - a; }
        before = r;
    }
    if (counter > 0) merges += 1 + counter;
    return 200000 + 270 * empty + 700 * merges - 47 * Math.min(left, right) - 11 * sum;
}
/** Heuristic value of a board (spawn already applied). */
export function evaluate(board: readonly number[], size: number, walls: readonly number[] = []): number {
    let total = 0;
    for (const line of lines(size, walls)) total += lineScore(board, line);
    return total;
}
interface Search { size: number; walls: readonly number[]; blocked: Set<number>; p2: number; nodes: number; all: number[][]; through: number[][] }
function player(board: readonly number[], depth: number, s: Search): number {
    let best = LOST;
    for (const d of DIRECTIONS) {
        const next = slideBoard(board, s.size, d, s.walls);
        if (next) best = Math.max(best, chance(next, depth, s));
    }
    return best;
}
/** Lines through each cell, to rescore only the two lines a spawn touches. */
const cellLineCache = new Map<string, number[][]>();
function cellLines(size: number, walls: readonly number[]): number[][] {
    const key = `${String(size)}:${walls.join(',')}`;
    let out = cellLineCache.get(key);
    if (!out) {
        const all = lines(size, walls), map: number[][] = Array.from({ length: size * size }, () => []);
        all.forEach((line, k) => { for (const i of line) map[i]?.push(k); });
        out = map; cellLineCache.set(key, out);
    }
    return out;
}
function chance(board: number[], depth: number, s: Search): number {
    s.nodes++;
    const empty: number[] = [];
    for (let i = 0; i < board.length; i++) if (board[i] === 0 && !s.blocked.has(i)) empty.push(i);
    if (!empty.length) return depth <= 1 ? evaluate(board, s.size, s.walls) : player(board, depth - 1, s);
    let total = 0;
    if (depth <= 1) {
        // Leaf: the board's line scores once, then only the lines through the spawned cell change (exact, cheaper).
        const all = s.all, through = s.through, base = all.map(line => lineScore(board, line));
        const sum = base.reduce((a, b) => a + b, 0);
        for (const i of empty) for (const [v, p] of [[2, s.p2], [4, 1 - s.p2]] as const) {
            if (p <= 0) continue;
            board[i] = v;
            let value = sum;
            for (const k of through[i] ?? []) { const line = all[k]; if (line) value += lineScore(board, line) - (base[k] ?? 0); }
            total += p * value;
            board[i] = 0;
        }
        return total / empty.length;
    }
    for (const i of empty) {
        for (const [v, p] of [[2, s.p2], [4, 1 - s.p2]] as const) {
            if (p <= 0) continue;
            board[i] = v;
            total += p * player(board, depth - 1, s);
            board[i] = 0;
        }
    }
    return total / empty.length;
}
export interface Choice { direction: Direction; value: number; values: Partial<Record<Direction, number>>; nodes: number }
/** Depth in player moves. With many empty cells the second ply adds little: depth `auto` searches 2 plies when at most
 * 8 cells are empty (a crowded board), 1 otherwise. */
export function bestMove(config: GameConfig, board: readonly number[], depth: number | 'auto' = 'auto'): Choice | null {
    const walls = config.walls ?? EMPTY, s: Search = { size: config.size, walls, blocked: new Set(walls), p2: config.spawnWeights['2'] / 100, nodes: 0, all: lines(config.size, walls), through: cellLines(config.size, walls) };
    const empty = board.filter((v, i) => v === 0 && !walls.includes(i)).length;
    const d = depth === 'auto' ? (empty <= 8 ? 2 : 1) : depth;
    let best: Choice | null = null;
    const values: Partial<Record<Direction, number>> = {};
    for (const dir of DIRECTIONS) {
        const next = slideBoard(board, config.size, dir, walls);
        if (!next) continue;
        const v = chance(next, d, s);
        values[dir] = v;
        if (!best || v > best.value) best = { direction: dir, value: v, values, nodes: 0 };
    }
    if (best) best.nodes = s.nodes;
    return best;
}
export interface Hint { direction: Direction; reason: 'only' | 'merge' | 'corner' | 'space' | 'order'; text: string }
const ARROW: Record<Direction, string> = { up: 'vers le haut', down: 'vers le bas', left: 'vers la gauche', right: 'vers la droite' };
const corners = (size: number): number[] => [0, size - 1, size * (size - 1), size * size - 1];
/** The agent's move and one sentence saying why (keep the big tile in its corner, free cells, merge…). */
export function hint(config: GameConfig, state: GameState): Hint | null {
    if (state.status !== 'playing') return null;
    const choice = bestMove(config, state.board);
    if (!choice) return null;
    const d = choice.direction, walls = config.walls ?? EMPTY, size = config.size;
    const results = DIRECTIONS.map(dir => ({ dir, r: slide(state.board, size, dir, walls) })).filter(x => x.r.changed);
    const chosen = slide(state.board, size, d, walls);
    const empties = (b: readonly number[]): number => b.filter((v, i) => v === 0 && !walls.includes(i)).length;
    const top = maxTile(state.board), biggest = chosen.merged.reduce((m, x) => Math.max(m, x.value), 0);
    const where = ARROW[d];
    if (results.length === 1) return { direction: d, reason: 'only', text: `Un seul coup possible : ${where}.` };
    if (biggest >= Math.max(16, top)) return { direction: d, reason: 'merge', text: `Glisser ${where} : les deux ${String(biggest / 2)} fusionnent en ${String(biggest)}.` };
    const corner = corners(size), topAt = state.board.indexOf(top), after = chosen.board.indexOf(maxTile(chosen.board));
    if (corner.includes(topAt) && corner.includes(after) && top >= 8) return { direction: d, reason: 'corner', text: `Glisser ${where} : la grande tuile (${String(top)}) garde son coin.` };
    const free = empties(chosen.board), best = Math.max(...results.map(x => empties(x.r.board)));
    if (free >= best && chosen.merged.length > 0) return { direction: d, reason: 'space', text: `Glisser ${where} : ${String(chosen.merged.length)} fusion${chosen.merged.length > 1 ? 's' : ''}, ${String(free)} cases libres.` };
    return { direction: d, reason: 'order', text: `Glisser ${where} : les tuiles restent rangées vers le coin, sans bloquer le plateau.` };
}
export interface AgentRun { won: boolean; moves: number; score: number; maxTile: number; lostBy: GameState['lostBy'] }
/**
 * One game played by the agent on a config (its own seed). With `epsilon` > 0 the agent plays a random legal move that
 * often (its own seeded generator `noise`): an imperfect player, so that many runs of the same challenge differ.
 */
export function playAgent(config: GameConfig, options: { epsilon?: number; noise?: number; depth?: number | 'auto'; maxMoves?: number } = {}): AgentRun {
    const eps = options.epsilon ?? 0, random = new Random(options.noise ?? 1), max = options.maxMoves ?? 20000;
    let state = initialState(config);
    while (state.status === 'playing' && state.moves < max) {
        let dir: Direction | undefined;
        if (eps > 0 && random.next() < eps) {
            const legal = DIRECTIONS.filter(d => slideBoard(state.board, config.size, d, config.walls ?? EMPTY) !== null);
            dir = legal[Math.floor(random.next() * legal.length)];
        } else dir = bestMove(config, state.board, options.depth ?? 1)?.direction;
        if (!dir) break;
        const r = applyAction(config, state, { type: 'MOVE', direction: dir });
        if (!r.accepted) break;
        state = r.state;
    }
    return { won: state.status === 'won', moves: state.moves, score: state.score, maxTile: maxTile(state.board), lostBy: state.lostBy };
}
/** Noise levels of the measuring agent (share of random moves) and runs per level. */
export const MEASURE = { epsilons: [0.25, 0.1, 0.03] as const, runs: 40 } as const;
/**
 * Empirical difficulty: share of lost games of the agent (depth 1) over `runs` games at each noise level, on the
 * challenge's own seed (the games differ by the agent's random moves, hence by their spawns). 0 = always won,
 * 100 = never won. Measured, not proved.
 */
export function measure(config: GameConfig, runs: number = MEASURE.runs): { difficulty: number; rates: number[]; meanMoves: number } {
    const rates: number[] = [];
    let moves = 0;
    for (const [k, epsilon] of MEASURE.epsilons.entries()) {
        let won = 0;
        for (let run = 0; run < runs; run++) {
            const r = playAgent(config, { epsilon, noise: 1000 * (k + 1) + run });
            if (r.won) won++;
            moves += r.moves;
        }
        rates.push(won / runs);
    }
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    return { difficulty: Math.round(1000 * (1 - mean)) / 10, rates, meanMoves: Math.round(moves / (runs * MEASURE.epsilons.length)) };
}
