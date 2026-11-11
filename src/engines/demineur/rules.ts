import { Random } from '../shared/random';
/** Démineur rules: pure reducer over the contracts of David's specification (schemas/contracts.ts, v1.0).
 * An accepted action returns a new state and its events; a refused one returns the very same state, a reason
 * and no event (nothing is mutated, ever). Coordinates are integers, origin top left, eight neighbours. */
export const SCHEMA_VERSION = '1.0.0';
export const GENERATOR_VERSION = '1.0.0';
export type CellMark = 'none' | 'flag' | 'question';
export type GameStatus = 'ready' | 'playing' | 'won' | 'lost';
export type LevelMode = 'learning' | 'classic' | 'chrono' | 'challenge' | 'endless';
export interface LevelDefinition {
    schemaVersion: string; id: string; mode: LevelMode; width: number; height: number; mineCount: number;
    generation: { type: 'deferred_seeded' | 'curated'; generatorVersion: string; seed: number; noGuess?: boolean };
    rules: { firstClickSafe: boolean; firstClickZeroPreferred?: boolean; chordEnabled: boolean; questionMarks: boolean };
    /** Curated boards (Opencade extension): one string per row, '.' safe, '*' mine, '#' mine of the drawing. */
    layout?: readonly string[];
    /** Curated boards: the opening, a zero cell revealed before the first touch (it is the board's first click). */
    start?: { x: number; y: number };
}
export interface CellState { x: number; y: number; mine: boolean; adjacent: number; revealed: boolean; mark: CellMark }
export interface GameState {
    version: string; levelId: string; status: GameStatus; cells: CellState[]; firstClick?: { x: number; y: number };
    revealedSafeCount: number; flags: number; turn: number; elapsedMs: number;
}
export type GameAction = { type: 'REVEAL' | 'FLAG' | 'CHORD'; x: number; y: number } | { type: 'RESTART' };
export type GameEventType = 'MINES_GENERATED' | 'CELL_REVEALED' | 'MARK_CHANGED' | 'GAME_WON' | 'GAME_LOST';
export interface GameEvent { type: GameEventType; payload: Record<string, unknown> }
export type RefusalReason = 'OUT_OF_BOUNDS' | 'ALREADY_REVEALED' | 'FLAGGED' | 'INVALID_CHORD' | 'GAME_FINISHED';
export type ActionResult = { accepted: true; state: GameState; events: GameEvent[] } | { accepted: false; state: GameState; reason: RefusalReason; events: [] };

export const inside = (w: number, h: number, x: number, y: number): boolean => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < w && y < h;
/** Indices of the (up to) eight neighbours of cell `i`, diagonals included. */
export function neighbours(w: number, h: number, i: number): number[] {
    const x = i % w, y = Math.floor(i / w), out: number[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((dx !== 0 || dy !== 0) && inside(w, h, x + dx, y + dy)) out.push((y + dy) * w + x + dx);
    }
    return out;
}
/** Mines among the eight neighbours of every cell. */
export function counts(w: number, h: number, mines: readonly boolean[]): number[] {
    return mines.map((_, i) => neighbours(w, h, i).filter(n => mines[n]).length);
}
/** Mines of a curated layout (both '*' and '#'). */
export function layoutMines(layout: readonly string[]): boolean[] {
    return layout.flatMap(row => row.split('').map(c => c === '*' || c === '#'));
}
/** Cells that may take a mine when the first click is (x, y): everything but the click and, when there is room, its neighbours. */
export function admissible(w: number, h: number, mineCount: number, x: number, y: number): number[] {
    const first = y * w + x, zone = new Set([first, ...neighbours(w, h, first)]);
    const all = Array.from({ length: w * h }, (_, i) => i);
    const wide = all.filter(i => !zone.has(i));
    return wide.length >= mineCount ? wide : all.filter(i => i !== first);
}
/** 32-bit mix of the seed, the first click and the generator version: the three inputs that define a deferred board. */
export function boardSeed(seed: number, x: number, y: number, version = GENERATOR_VERSION): number {
    let h = 2166136261 ^ (seed >>> 0);
    for (const v of [x, y, ...version.split('').map(c => c.charCodeAt(0))]) { h = Math.imul(h ^ v, 16777619) >>> 0; h ^= h >>> 13; }
    return h >>> 0;
}
/** Deferred placement: a partial Fisher–Yates over the admissible cells, driven by the shared seeded generator. */
export function placeMines(w: number, h: number, mineCount: number, seed: number, x: number, y: number, version = GENERATOR_VERSION): boolean[] {
    const pool = admissible(w, h, mineCount, x, y);
    if (mineCount > pool.length || mineCount < 1) throw new RangeError('Trop de mines pour ce plateau');
    const random = new Random(boardSeed(seed, x, y, version)), mines = Array.from({ length: w * h }, () => false);
    for (let k = 0; k < mineCount; k++) {
        const j = k + Math.floor(random.next() * (pool.length - k));
        const a = pool[k] ?? 0, b = pool[j] ?? 0; pool[k] = b; pool[j] = a;
        mines[b] = true;
    }
    return mines;
}
/** Semantic validation of a level (beyond the JSON schema): sizes, mine count, curated layout and opening. */
export function validateLevel(level: LevelDefinition): string[] {
    const errors: string[] = [], { width: w, height: h, mineCount } = level;
    if (!level.id) errors.push('id');
    if (!['learning', 'classic', 'chrono', 'challenge', 'endless'].includes(level.mode)) errors.push('mode');
    if (!Number.isInteger(w) || !Number.isInteger(h) || w < 2 || h < 2 || w > 100 || h > 100) errors.push('dimensions');
    if (!Number.isInteger(mineCount) || mineCount < 1) errors.push('mineCount');
    // AC13: never more mines than cells left once the first click is excluded.
    if (mineCount > w * h - 1) errors.push('mines > cases admissibles');
    if (level.generation.type === 'curated') {
        const layout = level.layout ?? [];
        if (layout.length !== h || layout.some(row => row.length !== w || /[^.*#]/.test(row))) errors.push('layout');
        else {
            const mines = layoutMines(layout), start = level.start;
            if (mines.filter(Boolean).length !== mineCount) errors.push('mineCount ≠ layout');
            if (!start || !inside(w, h, start.x, start.y)) errors.push('start');
            else if (mines[start.y * w + start.x] || counts(w, h, mines)[start.y * w + start.x] !== 0) errors.push('start non nul');
        }
    } else if (level.layout) errors.push('layout sur un plateau différé');
    return errors;
}
function blankCells(w: number, h: number): CellState[] {
    return Array.from({ length: w * h }, (_, i) => ({ x: i % w, y: Math.floor(i / w), mine: false, adjacent: 0, revealed: false, mark: 'none' as CellMark }));
}
function armed(cells: readonly CellState[], w: number, h: number, mines: readonly boolean[]): CellState[] {
    const n = counts(w, h, mines);
    return cells.map((c, i) => ({ ...c, mine: mines[i] ?? false, adjacent: n[i] ?? 0 }));
}
/** The state before any touch. A curated board is armed and its opening already revealed (that is its first click). */
export function initialState(level: LevelDefinition): GameState {
    const { width: w, height: h } = level;
    const base: GameState = { version: SCHEMA_VERSION, levelId: level.id, status: 'ready', cells: blankCells(w, h), revealedSafeCount: 0, flags: 0, turn: 0, elapsedMs: 0 };
    if (level.generation.type !== 'curated' || !level.layout || !level.start) return base;
    const cells = armed(base.cells, w, h, layoutMines(level.layout));
    const opened = { ...base, cells, status: 'playing' as GameStatus, firstClick: { ...level.start } };
    const revealed = cascade(level, opened.cells, [level.start.y * w + level.start.x]);
    const done = revealed.list.length === w * h - level.mineCount;
    return { ...opened, cells: revealed.cells, revealedSafeCount: revealed.list.length, status: done ? 'won' : 'playing' };
}
/** Arms a deferred board around its first click (the same seed, click and version always give the same mines). */
export function armState(level: LevelDefinition, state: GameState, x: number, y: number): GameState {
    const mines = placeMines(level.width, level.height, level.mineCount, level.generation.seed, x, y, level.generation.generatorVersion);
    return { ...state, cells: armed(state.cells, level.width, level.height, mines), firstClick: { x, y }, status: 'playing' };
}
/** Breadth-first reveal from `from`: zeros open their unflagged neighbours; a mine is never revealed by the flood.
 * A '?' does not stop it (only flags do). Returns new cells and the list of cells revealed, in order. */
export function cascade(level: LevelDefinition, cells: readonly CellState[], from: readonly number[]): { cells: CellState[]; list: number[] } {
    const out = cells.slice(), list: number[] = [], queue = [...from], seen = new Set(from);
    while (queue.length) {
        const i = queue.shift() ?? 0, c = out[i];
        if (!c || c.revealed || c.mark === 'flag') continue;
        out[i] = { ...c, revealed: true, mark: 'none' }; list.push(i);
        if (c.mine || c.adjacent > 0) continue;
        for (const n of neighbours(level.width, level.height, i)) {
            const d = out[n];
            if (!seen.has(n) && d && !d.revealed && d.mark !== 'flag' && !d.mine) { seen.add(n); queue.push(n); }
        }
    }
    return { cells: out, list };
}
const refuse = (state: GameState, reason: RefusalReason): ActionResult => ({ accepted: false, state, reason, events: [] });
/** Reveals `targets` (already checked), then settles victory or defeat. */
function open(level: LevelDefinition, state: GameState, targets: number[], events: GameEvent[]): ActionResult {
    const { cells, list } = cascade(level, state.cells, targets);
    const safe = list.filter(i => !cells[i]?.mine), boom = list.find(i => cells[i]?.mine);
    let next: GameState = { ...state, cells, revealedSafeCount: state.revealedSafeCount + safe.length, turn: state.turn + 1, status: 'playing' };
    if (list.length) events.push({ type: 'CELL_REVEALED', payload: { cells: list, cascade: list.length } });
    if (boom !== undefined) {
        next = { ...next, status: 'lost' };
        events.push({ type: 'GAME_LOST', payload: { x: boom % level.width, y: Math.floor(boom / level.width) } });
    } else if (next.revealedSafeCount === level.width * level.height - level.mineCount) {
        next = { ...next, status: 'won' };
        events.push({ type: 'GAME_WON', payload: { turn: next.turn } });
    }
    return { accepted: true, state: next, events };
}
export function applyAction(level: LevelDefinition, state: GameState, action: GameAction): ActionResult {
    if (action.type === 'RESTART') return { accepted: true, state: initialState(level), events: [] };
    const { width: w, height: h } = level, { x, y } = action;
    if (!inside(w, h, x, y)) return refuse(state, 'OUT_OF_BOUNDS');
    if (state.status === 'won' || state.status === 'lost') return refuse(state, 'GAME_FINISHED');
    const i = y * w + x, cell = state.cells[i];
    if (!cell) return refuse(state, 'OUT_OF_BOUNDS');
    if (action.type === 'FLAG') {
        if (cell.revealed) return refuse(state, 'ALREADY_REVEALED');
        const mark: CellMark = cell.mark === 'none' ? 'flag' : cell.mark === 'flag' && level.rules.questionMarks ? 'question' : 'none';
        const cells = state.cells.slice(); cells[i] = { ...cell, mark };
        const flags = state.flags + (mark === 'flag' ? 1 : 0) - (cell.mark === 'flag' ? 1 : 0);
        return { accepted: true, state: { ...state, cells, flags, turn: state.turn + 1 }, events: [{ type: 'MARK_CHANGED', payload: { x, y, mark } }] };
    }
    if (action.type === 'REVEAL') {
        if (cell.revealed) return refuse(state, 'ALREADY_REVEALED');
        if (cell.mark === 'flag') return refuse(state, 'FLAGGED');
        const events: GameEvent[] = [];
        let current = state;
        if (state.status === 'ready') {
            current = armState(level, state, x, y);
            events.push({ type: 'MINES_GENERATED', payload: { seed: level.generation.seed, firstClick: { x, y }, generatorVersion: level.generation.generatorVersion } });
        }
        return open(level, current, [i], events);
    }
    // CHORD: on a revealed number whose flags match it, reveal every unflagged covered neighbour at once.
    if (!level.rules.chordEnabled || !cell.revealed || cell.adjacent === 0 || state.status !== 'playing') return refuse(state, 'INVALID_CHORD');
    const around = neighbours(w, h, i), flags = around.filter(n => state.cells[n]?.mark === 'flag').length;
    const targets = around.filter(n => { const c = state.cells[n]; return c !== undefined && !c.revealed && c.mark !== 'flag'; });
    if (flags !== cell.adjacent || !targets.length) return refuse(state, 'INVALID_CHORD');
    return open(level, state, targets, []);
}
