import { bit, cellName, complete, conflicts, topology, unitName, type Puzzle } from './grid';
import { deduce, tierOf, type Technique } from './logic';
import { provedUnique } from './solver';
/**
 * Pure rules (dossier § Interfaces): `applyAction(puzzle, state, action)` returns `{ accepted, state, events }`, or
 * `{ accepted: false, state, reason }` with the very same state object: a refused action never mutates anything (AC01).
 * States are plain JSON, never mutated: every accepted action builds a new one.
 */
export const ENGINE_VERSION = '1.0.0';
export interface Prepared extends Puzzle { solution: readonly number[] }
/** Solves the puzzle once (proved unique) so hints can point at a wrong entry. */
export function prepare(puzzle: Puzzle): Prepared {
    const solution = provedUnique(puzzle);
    if (!solution) throw new RangeError(`Grille ${puzzle.id} sans solution unique prouvée`);
    return { id: puzzle.id, size: puzzle.size, boxRows: puzzle.boxRows, boxCols: puzzle.boxCols, givens: [...puzzle.givens], solution };
}
export interface Frame { values: number[]; notes: number[][] }
export interface Hint {
    /** conflict: two equal digits in one unit; wrong: an entry the grid cannot keep; logic: a deduction; reveal: last resort. */
    kind: 'conflict' | 'wrong' | 'logic' | 'reveal';
    index: number;
    value: number | null;
    technique: Technique | null;
    /** Cells the explanation is about (highlighted with the hint). */
    cells: number[];
    /** Explanation, step by step. */
    lines: string[];
}
export interface SudokuState {
    levelId: string;
    values: number[];
    notes: number[][];
    selectedIndex: number | null;
    moves: number;
    mistakes: number;
    hintsUsed: number;
    elapsedMs: number;
    status: 'playing' | 'won';
    /** Values and notes before each undoable action (entry, erasure, note). */
    history: Frame[];
    hint: Hint | null;
}
export type SudokuAction =
    | { type: 'SET_VALUE'; index: number; value: number }
    | { type: 'CLEAR_VALUE'; index: number }
    | { type: 'TOGGLE_NOTE'; index: number; value: number }
    | { type: 'SELECT_CELL'; index: number | null }
    | { type: 'UNDO' }
    | { type: 'REQUEST_HINT' }
    | { type: 'TICK'; ms: number };
export interface EngineEvent { type: 'value' | 'cleared' | 'note' | 'select' | 'undo' | 'hint' | 'conflict' | 'mistake' | 'unit' | 'won' | 'tick'; payload?: unknown }
export type EngineResult = { accepted: true; state: SudokuState; events: EngineEvent[] } | { accepted: false; state: SudokuState; reason: string; events: [] };
export function createState(puzzle: Puzzle): SudokuState {
    const cells = puzzle.size * puzzle.size;
    return { levelId: puzzle.id, values: [...puzzle.givens], notes: Array.from({ length: cells }, () => []), selectedIndex: null,
        moves: 0, mistakes: 0, hintsUsed: 0, elapsedMs: 0, status: 'playing', history: [], hint: null };
}
const refuse = (state: SudokuState, reason: string): EngineResult => ({ accepted: false, state, reason, events: [] });
const frame = (s: SudokuState): Frame => ({ values: [...s.values], notes: s.notes.map(n => [...n]) });
function cellOk(p: Puzzle, index: unknown): index is number { return typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < p.size * p.size; }
function digitOk(p: Puzzle, value: unknown): value is number { return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= p.size; }
/** Units completed by the value just placed at `index` (each row/column/block now full and valid). */
function finishedUnits(p: Puzzle, values: readonly number[], index: number): number[] {
    const t = topology(p);
    return (t.unitsOf[index] ?? []).filter(u => (t.units[u] ?? []).reduce((m, i) => m | bit(values[i] ?? 0), 0) === t.full && (t.units[u] ?? []).every(i => values[i]));
}
export function applyAction(puzzle: Prepared, state: SudokuState, action: SudokuAction): EngineResult {
    if (state.levelId !== puzzle.id) return refuse(state, 'level');
    if (action.type === 'TICK') {
        if (!Number.isFinite(action.ms) || action.ms < 0) return refuse(state, 'time');
        if (state.status !== 'playing' || action.ms === 0) return refuse(state, 'idle');
        return { accepted: true, state: { ...state, elapsedMs: state.elapsedMs + action.ms }, events: [{ type: 'tick' }] };
    }
    if (action.type === 'SELECT_CELL') {
        if (action.index !== null && !cellOk(puzzle, action.index)) return refuse(state, 'cell');
        if (action.index === state.selectedIndex) return refuse(state, 'unchanged');
        return { accepted: true, state: { ...state, selectedIndex: action.index }, events: [{ type: 'select', payload: action.index }] };
    }
    if (state.status !== 'playing') return refuse(state, 'finished');
    if (action.type === 'UNDO') {
        const previous = state.history[state.history.length - 1];
        if (!previous) return refuse(state, 'nothing');
        return { accepted: true, state: { ...state, values: [...previous.values], notes: previous.notes.map(n => [...n]), history: state.history.slice(0, -1), hint: null, moves: state.moves + 1 }, events: [{ type: 'undo' }] };
    }
    if (action.type === 'REQUEST_HINT') {
        const hint = hintFor(puzzle, state.values);
        if (!hint) return refuse(state, 'nothing');
        return { accepted: true, state: { ...state, hint, hintsUsed: state.hintsUsed + 1, selectedIndex: hint.index }, events: [{ type: 'hint', payload: hint }] };
    }
    if (!cellOk(puzzle, action.index)) return refuse(state, 'cell');
    const i = action.index;
    if (puzzle.givens[i]) return refuse(state, 'given');
    if (action.type === 'CLEAR_VALUE') {
        if (!state.values[i] && !state.notes[i]?.length) return refuse(state, 'empty');
        const values = [...state.values], notes = state.notes.map(n => [...n]);
        values[i] = 0; notes[i] = [];
        return { accepted: true, state: { ...state, values, notes, history: [...state.history, frame(state)], moves: state.moves + 1, hint: null, selectedIndex: i }, events: [{ type: 'cleared', payload: i }] };
    }
    if (!digitOk(puzzle, action.value)) return refuse(state, 'digit');
    const v = action.value;
    if (action.type === 'TOGGLE_NOTE') {
        if (state.values[i]) return refuse(state, 'filled');
        const notes = state.notes.map(n => [...n]), here = notes[i] ?? [];
        notes[i] = here.includes(v) ? here.filter(x => x !== v) : [...here, v].sort((a, b) => a - b);
        return { accepted: true, state: { ...state, notes, history: [...state.history, frame(state)], moves: state.moves + 1, selectedIndex: i }, events: [{ type: 'note', payload: { index: i, value: v } }] };
    }
    // SET_VALUE
    if (state.values[i] === v) return refuse(state, 'unchanged');
    const values = [...state.values], notes = state.notes.map(n => [...n]), t = topology(puzzle);
    values[i] = v; notes[i] = [];
    // The digit leaves the notes of the cell's row, column and block (one undoable action with the entry).
    for (const p of t.peers[i] ?? []) if (notes[p]?.includes(v)) notes[p] = (notes[p] ?? []).filter(x => x !== v);
    const clash = (t.peers[i] ?? []).filter(p => values[p] === v);
    const events: EngineEvent[] = [{ type: 'value', payload: { index: i, value: v } }];
    if (clash.length) events.push({ type: 'conflict', payload: [i, ...clash] }, { type: 'mistake' });
    for (const u of clash.length ? [] : finishedUnits(puzzle, values, i)) events.push({ type: 'unit', payload: u });
    const won = complete(puzzle, values);
    if (won) events.push({ type: 'won' });
    return { accepted: true, events, state: { ...state, values, notes, history: [...state.history, frame(state)], moves: state.moves + 1,
        mistakes: state.mistakes + (clash.length ? 1 : 0), hint: null, selectedIndex: i, status: won ? 'won' : 'playing' } };
}
/**
 * The hint for these values, in order: a conflict to fix, an entry the grid cannot keep (the solver proves the grid has
 * no solution with it), then the next logical deduction, explained (AC07). A bare reveal only if logic is stuck.
 */
export function hintFor(p: Prepared, values: readonly number[]): Hint | null {
    const t = topology(p), clash = conflicts(p, values).filter(i => !p.givens[i]);
    const first = clash[0];
    if (first !== undefined) {
        const v = values[first] ?? 0, other = (t.peers[first] ?? []).find(q => values[q] === v) ?? first;
        const u = (t.unitsOf[first] ?? []).find(x => (t.units[x] ?? []).includes(other)) ?? 0;
        return { kind: 'conflict', index: first, value: null, technique: null, cells: [first, other],
            lines: [`Deux ${String(v)} dans ${unitName(t, u)} : ${cellName(p, first)} et ${cellName(p, other)}. Effacez celui qui est faux.`] };
    }
    const wrong = values.findIndex((v, i) => v && !p.givens[i] && v !== p.solution[i]);
    if (wrong >= 0) return { kind: 'wrong', index: wrong, value: null, technique: null, cells: [wrong],
        lines: [`Le ${String(values[wrong] ?? 0)} en ${cellName(p, wrong)} empêche de finir : avec lui, la grille n'a plus de solution. Effacez-le.`] };
    if (values.every(v => v)) return null;
    const chain = deduce(p, values);
    const last = chain?.[chain.length - 1];
    if (chain && last?.kind === 'place') return { kind: 'logic', index: last.index, value: last.value, technique: chain.reduce<Technique>((h, s) => tierOf(s.technique) > tierOf(h) ? s.technique : h, last.technique),
        cells: [...new Set([last.index, ...(last.unit === null ? [] : t.units[last.unit] ?? []), ...chain.flatMap(s => s.kind === 'eliminate' ? s.cells : [])])], lines: chain.map(s => s.text) };
    const open = values.findIndex(v => !v);
    return { kind: 'reveal', index: open, value: p.solution[open] ?? 0, technique: null, cells: [open], lines: [`Aucune déduction simple ici : ${cellName(p, open)} vaut ${String(p.solution[open] ?? 0)}.`] };
}
/** Stars on the shared score: three without mistake nor hint, two up to two of them, else one. The clock never counts. */
export function stars(state: Pick<SudokuState, 'mistakes' | 'hintsUsed'>): 1 | 2 | 3 {
    const slips = state.mistakes + state.hintsUsed;
    return slips === 0 ? 3 : slips <= 2 ? 2 : 1;
}
export function score(puzzle: Puzzle, state: SudokuState): number {
    if (state.status !== 'won') return 0;
    const empties = puzzle.givens.filter(v => !v).length;
    return Math.max(10, Math.round((100 + 20 * empties) * (1 - 0.1 * state.mistakes - 0.15 * state.hintsUsed)));
}
/** Restores a saved state for this puzzle, or null when it does not fit (other level, shape, givens changed). */
export function restore(puzzle: Prepared, saved: unknown): SudokuState | null {
    if (typeof saved !== 'object' || saved === null) return null;
    const s = saved as Partial<SudokuState>, cells = puzzle.size * puzzle.size;
    const grid = (v: unknown): v is number[] => Array.isArray(v) && v.length === cells && v.every(x => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= puzzle.size);
    const notes = (v: unknown): v is number[][] => Array.isArray(v) && v.length === cells && v.every(n => Array.isArray(n) && n.every(x => digitOk(puzzle, x)));
    const count = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
    if (s.levelId !== puzzle.id || !grid(s.values) || !notes(s.notes) || !count(s.moves) || !count(s.mistakes) || !count(s.hintsUsed) || !(typeof s.elapsedMs === 'number' && s.elapsedMs >= 0 && Number.isFinite(s.elapsedMs))) return null;
    if (!s.values.every((v, i) => !puzzle.givens[i] || v === puzzle.givens[i])) return null;
    const history = Array.isArray(s.history) ? s.history.filter((f): f is Frame => grid(f.values) && notes(f.notes)) : [];
    const values = [...s.values];
    return { levelId: puzzle.id, values, notes: s.notes.map(n => [...n]), selectedIndex: cellOk(puzzle, s.selectedIndex) ? s.selectedIndex : null,
        moves: s.moves, mistakes: s.mistakes, hintsUsed: s.hintsUsed, elapsedMs: s.elapsedMs, status: complete(puzzle, values) ? 'won' : 'playing', history, hint: null };
}
