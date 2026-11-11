import { Random } from '../shared/random';
/**
 * Fusio rules, pure: no Phaser, no DOM, no unseeded randomness. Contracts follow the received design dossier (GameConfig,
 * GameState, GameEvent, GameAction, ActionResult), with three optional extensions for the written challenges:
 * `moveLimit`, `walls` (blocked cells) and `start` (an editorial starting board).
 *
 * A move compresses every line towards the direction, then merges each pair of equal neighbours once, nearest to the
 * edge first: [2,2,2,2] → [4,4,0,0], never [8,0,0,0]. The score grows by the value of every tile a merge produces.
 * When the board changed, one tile appears in an empty cell (2 at `spawnWeights[2]` %, else 4), drawn from the seeded
 * generator whose state is part of the game state. A move that changes nothing spawns nothing, counts nothing and
 * leaves the generator untouched. Walls split a line into segments: tiles never cross them.
 */
export const SCHEMA_VERSION = '1.0.0';
/** Engine version: part of the reproducibility key (seed + engine version + generator consumption order). */
export const ENGINE_VERSION = '1.0.0';
export type Direction = 'up' | 'down' | 'left' | 'right';
export const DIRECTIONS: readonly Direction[] = ['up', 'right', 'down', 'left'];
export type Mode = 'kids' | 'classic' | 'timed' | 'endless' | 'challenge';
export type Size = 4 | 5 | 6;
export interface GameConfig {
    schemaVersion: '1.0.0';
    mode: Mode;
    size: Size;
    target: number;
    seed: number;
    spawnWeights: { '2': number; '4': number };
    undoEnabled?: boolean;
    timerSeconds?: number | null;
    /** Extension: the game is lost when this many moves were played without reaching the target. */
    moveLimit?: number | null;
    /** Extension: blocked cells (row-major indices); no tile ever enters them. */
    walls?: number[];
    /** Extension: editorial starting board (row-major, 0 for empty); without it, two tiles are spawned. */
    start?: number[];
    /** Extension: after the win, the game may go on (classic). */
    continueAfterWin?: boolean;
}
export type Status = 'playing' | 'won' | 'lost';
/** What undo restores: everything that a move changes. */
export interface Snapshot { board: number[]; score: number; moves: number; prngState: number; status: Status; reached: boolean }
export interface GameState extends Snapshot {
    version: '1.0.0';
    /** True once the game went on after its win: no second WON. */
    endless: boolean;
    /** Why the game is lost, when it is. */
    lostBy: 'blocked' | 'moves' | null;
    /** Previous snapshots, most recent last (at most HISTORY). */
    history: Snapshot[];
}
export type GameEventType = 'TILE_MOVED' | 'TILE_MERGED' | 'TILE_SPAWNED' | 'SCORE_CHANGED' | 'WON' | 'LOST' | 'UNDONE' | 'CONTINUED' | 'RESTARTED';
export interface GameEvent { type: GameEventType; payload: Record<string, unknown> }
export type GameAction = { type: 'MOVE'; direction: Direction } | { type: 'UNDO' } | { type: 'RESTART' } | { type: 'CONTINUE' };
export type RefusalReason = 'NO_CHANGE' | 'INVALID_ACTION' | 'GAME_OVER' | 'UNDO_UNAVAILABLE';
export type ActionResult = { accepted: true; state: GameState; events: GameEvent[] } | { accepted: false; state: GameState; reason: RefusalReason; events: [] };
/** Undo depth: enough for any regret, bounded so a saved game stays small. */
export const HISTORY = 50;
const KEYS = new Set(['schemaVersion', 'mode', 'size', 'target', 'seed', 'spawnWeights', 'undoEnabled', 'timerSeconds', 'moveLimit', 'walls', 'start', 'continueAfterWin']);
const REQUIRED = ['schemaVersion', 'mode', 'size', 'target', 'seed', 'spawnWeights'] as const;
const MODES = new Set(['kids', 'classic', 'timed', 'endless', 'challenge']);
export const isPowerOfTwo = (v: number): boolean => Number.isInteger(v) && v >= 2 && (v & (v - 1)) === 0;
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
/** Schema (closed keys, enums, types) then business rules (weights sum to 100, target a power of two, walls and start
 * consistent with the size). Returns the list of problems; an empty list means valid. Nothing is ever coerced. */
export function validateConfig(value: unknown): string[] {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return ['objet attendu'];
    const c = value as Record<string, unknown>, errors: string[] = [];
    for (const key of Object.keys(c)) if (!KEYS.has(key)) errors.push(`clé inconnue ${key}`);
    for (const key of REQUIRED) if (!(key in c)) errors.push(`${key} absent`);
    if ('schemaVersion' in c && c.schemaVersion !== SCHEMA_VERSION) errors.push('schemaVersion');
    if ('mode' in c && (typeof c.mode !== 'string' || !MODES.has(c.mode))) errors.push('mode inconnu');
    if ('size' in c && c.size !== 4 && c.size !== 5 && c.size !== 6) errors.push('taille hors 4/5/6');
    if ('target' in c && (!isInt(c.target) || c.target < 128 || !isPowerOfTwo(c.target))) errors.push('cible : puissance de 2 ≥ 128');
    if ('seed' in c && (!isInt(c.seed) || c.seed < 0 || c.seed > 0xffffffff)) errors.push('graine');
    if ('spawnWeights' in c) {
        const w = c.spawnWeights as Record<string, unknown> | null;
        if (typeof w !== 'object' || w === null || Object.keys(w).some(k => k !== '2' && k !== '4') || !isInt(w['2']) || !isInt(w['4']) || w['2'] < 0 || w['2'] > 100 || w['4'] < 0 || w['4'] > 100) errors.push('poids d’apparition');
        else if (w['2'] + w['4'] !== 100) errors.push('somme des poids ≠ 100');
    }
    if ('undoEnabled' in c && typeof c.undoEnabled !== 'boolean') errors.push('undoEnabled');
    if ('continueAfterWin' in c && typeof c.continueAfterWin !== 'boolean') errors.push('continueAfterWin');
    if ('timerSeconds' in c && c.timerSeconds !== null && (!isInt(c.timerSeconds) || c.timerSeconds < 1)) errors.push('timerSeconds');
    if ('moveLimit' in c && c.moveLimit !== null && (!isInt(c.moveLimit) || c.moveLimit < 1)) errors.push('moveLimit');
    const size = c.size === 4 || c.size === 5 || c.size === 6 ? c.size : 0, n = size * size;
    let walls: number[] = [];
    if ('walls' in c) {
        if (!Array.isArray(c.walls) || c.walls.some(i => !isInt(i) || i < 0 || i >= n) || new Set(c.walls).size !== c.walls.length) errors.push('cases bloquées');
        else walls = c.walls as number[];
        if (walls.length > n - 4) errors.push('trop de cases bloquées');
    }
    if ('start' in c) {
        const s = c.start;
        if (!Array.isArray(s) || s.length !== n) errors.push('plateau de départ : dimensions');
        else {
            if (s.some(v => !isInt(v) || (v !== 0 && !isPowerOfTwo(v)))) errors.push('plateau de départ : valeurs');
            if (walls.some(i => s[i] !== 0)) errors.push('plateau de départ : tuile sur une case bloquée');
            if (isInt(c.target) && s.some(v => isInt(v) && v >= (c.target as number))) errors.push('plateau de départ : cible déjà atteinte');
            if (s.filter((v, i) => v === 0 && !walls.includes(i)).length < 1) errors.push('plateau de départ : aucune case libre');
        }
    }
    return errors;
}
/** Checks a state against its config (saves): dimensions, values, walls, counters. */
export function validateState(config: GameConfig, value: unknown): string[] {
    if (typeof value !== 'object' || value === null) return ['objet attendu'];
    const s = value as Partial<GameState>, n = config.size * config.size, errors: string[] = [], walls = new Set(config.walls ?? []);
    const board = (b: unknown): boolean => Array.isArray(b) && b.length === n && b.every((v, i) => isInt(v) && (v === 0 || isPowerOfTwo(v)) && !(walls.has(i) && v !== 0));
    if (s.version !== SCHEMA_VERSION) errors.push('version');
    if (!board(s.board)) errors.push('plateau');
    if (!isInt(s.score) || s.score < 0 || !isInt(s.moves) || s.moves < 0 || !isInt(s.prngState) || s.prngState < 0 || s.prngState > 0xffffffff) errors.push('compteurs');
    if (s.status !== 'playing' && s.status !== 'won' && s.status !== 'lost') errors.push('statut');
    if (!Array.isArray(s.history) || s.history.length > HISTORY || s.history.some(h => !board(h.board) || !isInt(h.score) || !isInt(h.moves) || !isInt(h.prngState))) errors.push('historique');
    return errors;
}
// ——— Geometry: lines and segments ———
const segmentCache = new Map<string, Record<Direction, number[][]>>();
/** Same walls array, same answer: a per-array memo in front of the string-keyed cache (the search calls this a lot). */
const segmentMemo = new WeakMap<readonly number[], Map<number, Record<Direction, number[][]>>>();
const NO_WALLS: readonly number[] = [];
/** For each direction, the segments of cells, each listed from the edge the tiles move to. Walls cut the lines. */
export function segments(size: number, walls: readonly number[] = NO_WALLS): Record<Direction, number[][]> {
    let memo = segmentMemo.get(walls);
    const hit = memo?.get(size); if (hit) return hit;
    if (!memo) { memo = new Map(); segmentMemo.set(walls, memo); }
    const key = `${String(size)}:${walls.join(',')}`;
    const cached = segmentCache.get(key); if (cached) { memo.set(size, cached); return cached; }
    const blocked = new Set(walls);
    const line = (d: Direction, k: number): number[] => Array.from({ length: size }, (_, j) => {
        if (d === 'left') return k * size + j;
        if (d === 'right') return k * size + (size - 1 - j);
        if (d === 'up') return j * size + k;
        return (size - 1 - j) * size + k;
    });
    const out = {} as Record<Direction, number[][]>;
    for (const d of DIRECTIONS) {
        out[d] = [];
        for (let k = 0; k < size; k++) {
            let current: number[] = [];
            for (const i of line(d, k)) {
                if (blocked.has(i)) { if (current.length > 1) out[d].push(current); current = []; } else current.push(i);
            }
            if (current.length > 1) out[d].push(current);
        }
    }
    segmentCache.set(key, out); memo.set(size, out);
    return out;
}
export interface SlideResult { board: number[]; changed: boolean; gained: number; moved: { from: number; to: number; value: number }[]; merged: { from: [number, number]; to: number; value: number }[] }
/** One move without spawn: compression then one merge per tile, nearest the edge first. */
export function slide(board: readonly number[], size: number, direction: Direction, walls: readonly number[] = NO_WALLS): SlideResult {
    const out = board.slice(), moved: SlideResult['moved'] = [], merged: SlideResult['merged'] = [];
    let gained = 0, changed = false;
    for (const seg of segments(size, walls)[direction]) {
        let write = 0, open = -1, openFrom = -1;
        for (const i of seg) out[i] = 0;
        for (const from of seg) {
            const v = board[from] ?? 0; if (!v) continue;
            const last = open >= 0 ? seg[open] : undefined;
            if (last !== undefined && out[last] === v) {
                out[last] = 2 * v; gained += 2 * v;
                merged.push({ from: [openFrom, from], to: last, value: 2 * v });
                if (from !== last) changed = true;
                open = -1;
            } else {
                const to = seg[write] ?? from;
                out[to] = v; open = write; openFrom = from; write++;
                if (to !== from) changed = true;
                moved.push({ from, to, value: v });
            }
        }
    }
    // Tiles that merged into a moved tile: drop the earlier "moved" of the first tile of the pair (it is in `merged`).
    const inMerge = new Set(merged.map(m => m.from[0]));
    return { board: out, changed, gained, moved: moved.filter(m => !inMerge.has(m.from) && m.from !== m.to), merged };
}
/** Fast path for the search: the board after the move, or null when nothing moves (same rules as `slide`). */
export function slideBoard(board: readonly number[], size: number, direction: Direction, walls: readonly number[] = NO_WALLS): number[] | null {
    const out = board.slice();
    let changed = false;
    for (const seg of segments(size, walls)[direction]) {
        let write = 0, open = -1;
        for (const i of seg) out[i] = 0;
        for (const from of seg) {
            const v = board[from] ?? 0; if (!v) continue;
            const last = open >= 0 ? seg[open] : undefined;
            if (last !== undefined && out[last] === v) { out[last] = 2 * v; changed = true; open = -1; }
            else { const to = seg[write] ?? from; out[to] = v; open = write; write++; if (to !== from) changed = true; }
        }
    }
    return changed ? out : null;
}
/** True when some direction changes the board. */
export function canMove(board: readonly number[], size: number, walls: readonly number[] = NO_WALLS): boolean {
    return DIRECTIONS.some(d => slideBoard(board, size, d, walls) !== null);
}
// ——— Seeded spawns ———
/** Seed mixing (32-bit avalanche) so that neighbouring seeds give unrelated games. */
export function mixSeed(seed: number): number {
    let h = (seed ^ 0x9e3779b9) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
}
/** One tile in an empty cell: two draws (cell, then value). Returns the new generator state, or null when full. */
export function spawn(board: number[], config: GameConfig, prngState: number): { at: number; value: number; prngState: number } | null {
    const walls = new Set(config.walls ?? []);
    const empty: number[] = [];
    for (let i = 0; i < board.length; i++) if (board[i] === 0 && !walls.has(i)) empty.push(i);
    if (!empty.length) return null;
    const r = new Random(prngState);
    const at = empty[Math.floor(r.next() * empty.length)] ?? empty[0] ?? 0;
    const value = r.next() * 100 < config.spawnWeights['2'] ? 2 : 4;
    board[at] = value;
    return { at, value, prngState: r.state };
}
export function initialState(config: GameConfig): GameState {
    const n = config.size * config.size;
    const board = config.start ? config.start.slice() : new Array<number>(n).fill(0);
    let prngState = mixSeed(config.seed);
    if (!config.start) for (let k = 0; k < 2; k++) { const s = spawn(board, config, prngState); if (s) prngState = s.prngState; }
    return { version: SCHEMA_VERSION, board, score: 0, moves: 0, prngState, status: 'playing', reached: false, endless: false, lostBy: null, history: [] };
}
const snap = (s: GameState): Snapshot => ({ board: s.board.slice(), score: s.score, moves: s.moves, prngState: s.prngState, status: s.status, reached: s.reached });
const refuse = (state: GameState, reason: RefusalReason): ActionResult => ({ accepted: false, state, reason, events: [] });
/** The reducer. A refused action returns the very same state object and no event. */
export function applyAction(config: GameConfig, state: GameState, action: GameAction): ActionResult {
    if (typeof (action as unknown) !== 'object' || (action as unknown) === null) return refuse(state, 'INVALID_ACTION');
    if (action.type === 'RESTART') return { accepted: true, state: initialState(config), events: [{ type: 'RESTARTED', payload: {} }] };
    if (action.type === 'UNDO') {
        if (config.undoEnabled === false || !state.history.length) return refuse(state, 'UNDO_UNAVAILABLE');
        const previous = state.history[state.history.length - 1];
        if (!previous) return refuse(state, 'UNDO_UNAVAILABLE');
        const back: GameState = { ...state, ...snap({ ...state, ...previous }), lostBy: null, endless: state.endless && previous.reached, history: state.history.slice(0, -1) };
        return { accepted: true, state: back, events: [{ type: 'UNDONE', payload: { moves: back.moves } }] };
    }
    if (action.type === 'CONTINUE') {
        if (state.status !== 'won' || !config.continueAfterWin) return refuse(state, 'INVALID_ACTION');
        return { accepted: true, state: { ...state, status: 'playing', endless: true }, events: [{ type: 'CONTINUED', payload: {} }] };
    }
    if ((action as { type: string }).type !== 'MOVE' || !DIRECTIONS.includes(action.direction)) return refuse(state, 'INVALID_ACTION');
    if (state.status !== 'playing') return refuse(state, 'GAME_OVER');
    const walls = config.walls ?? NO_WALLS;
    const r = slide(state.board, config.size, action.direction, walls);
    if (!r.changed) return refuse(state, 'NO_CHANGE');
    const events: GameEvent[] = [];
    for (const m of r.moved) events.push({ type: 'TILE_MOVED', payload: { ...m } });
    for (const m of r.merged) events.push({ type: 'TILE_MERGED', payload: { from: [...m.from], to: m.to, value: m.value } });
    const board = r.board, born = spawn(board, config, state.prngState);
    if (born) events.push({ type: 'TILE_SPAWNED', payload: { at: born.at, value: born.value } });
    const score = state.score + r.gained;
    if (r.gained) events.push({ type: 'SCORE_CHANGED', payload: { delta: r.gained, score } });
    const moves = state.moves + 1, history = [...state.history, snap(state)].slice(-HISTORY);
    let status: Status = 'playing', reached = state.reached, lostBy: GameState['lostBy'] = null;
    if (!state.endless && r.merged.some(m => m.value >= config.target)) { status = 'won'; reached = true; events.push({ type: 'WON', payload: { target: config.target, moves } }); }
    else if (!canMove(board, config.size, walls)) { status = 'lost'; lostBy = 'blocked'; }
    else if (config.moveLimit && moves >= config.moveLimit && !state.endless) { status = 'lost'; lostBy = 'moves'; }
    if (status === 'lost') events.push({ type: 'LOST', payload: { by: lostBy, moves } });
    return { accepted: true, state: { ...state, board, score, moves, prngState: born?.prngState ?? state.prngState, status, reached, lostBy, history }, events };
}
/** Largest tile on the board. */
export const maxTile = (board: readonly number[]): number => board.reduce((m, v) => Math.max(m, v), 0);
