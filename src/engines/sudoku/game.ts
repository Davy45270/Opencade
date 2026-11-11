import { applyAction, createState, prepare, restore, score, stars, type EngineEvent, type Prepared, type SudokuAction, type SudokuState } from './engine';
import { generate, PROFILES, type Profile } from './generator';
import { conflicts, validateLevel, type SudokuLevel } from './grid';
import { GRIDS, levelRecord } from './levels';
/**
 * One game on top of the pure rules: which grid (written level, daily grid or endless grid), the state, the input
 * helpers the scene and the thumbnail share (notes mode, cursor moves). Every change still goes through applyAction.
 */
export type Mode = 'classic' | 'daily' | 'endless';
/** Endless grids cycle through three profiles; the daily grid is always medium. */
export function profileFor(mode: Mode, seed: number): Profile {
    if (mode === 'daily') return PROFILES.medium;
    return [PROFILES.easy, PROFILES.medium, PROFILES.hard][seed % 3] ?? PROFILES.easy;
}
export class SudokuGame {
    mode: Mode = 'classic';
    level = 0;
    seed = 0;
    record: SudokuLevel = levelRecord(0);
    puzzle: Prepared = prepare(this.record);
    state: SudokuState = createState(this.puzzle);
    status: 'playing' | 'won' = 'playing';
    notesMode = false;
    /** Events of the last accepted action, for sound, animation and the companion. */
    events: EngineEvent[] = [];
    /** Why the last action was refused (null when accepted). */
    refused: string | null = null;
    loadLevel(index: number, seed = 0): void {
        if (!GRIDS[index]) throw new RangeError('Niveau');
        this.mode = 'classic'; this.level = index; this.seed = seed;
        this.use(validateLevel(levelRecord(index)));
    }
    /** Daily or endless grid: generated from the seed, published only once proved unique (the generator refuses otherwise). */
    loadGenerated(mode: Exclude<Mode, 'classic'>, seed: number): void {
        const made = generate(profileFor(mode, seed), seed, `SDK-${mode === 'daily' ? 'DAY' : 'INF'}-${String(seed)}`);
        this.mode = mode; this.level = 0; this.seed = seed;
        this.use(validateLevel(made.level));
    }
    private use(record: SudokuLevel): void {
        this.record = record; this.puzzle = prepare(record);
        this.restart();
    }
    restart(): void { this.state = createState(this.puzzle); this.status = 'playing'; this.notesMode = false; this.events = []; this.refused = null; }
    /** Puts a saved state back if it belongs to this grid; false otherwise (the grid then starts fresh). */
    resume(saved: unknown): boolean {
        const state = restore(this.puzzle, saved);
        if (!state) return false;
        this.state = state; this.status = state.status; return true;
    }
    dispatch(action: SudokuAction): boolean {
        const result = applyAction(this.puzzle, this.state, action);
        if (!result.accepted) { this.refused = result.reason; if (action.type !== 'TICK') this.events = []; return false; }
        this.refused = null; this.state = result.state; this.status = result.state.status;
        if (action.type !== 'TICK') this.events = result.events;
        return true;
    }
    /** A digit from the pad or the keyboard: an entry, or a note in notes mode (or when `note` is forced). */
    input(value: number, note = this.notesMode): boolean {
        const index = this.state.selectedIndex;
        if (index === null) { this.refused = 'select'; this.events = []; return false; }
        return this.dispatch(note ? { type: 'TOGGLE_NOTE', index, value } : { type: 'SET_VALUE', index, value });
    }
    erase(): boolean {
        const index = this.state.selectedIndex;
        if (index === null) { this.refused = 'select'; this.events = []; return false; }
        return this.dispatch({ type: 'CLEAR_VALUE', index });
    }
    select(index: number | null): boolean { return this.dispatch({ type: 'SELECT_CELL', index }); }
    /** Arrow keys: the cursor wraps around the grid edges. */
    move(dx: number, dy: number): boolean {
        const n = this.puzzle.size, at = this.state.selectedIndex ?? Math.floor(n * n / 2);
        const r = (Math.floor(at / n) + dy + n) % n, c = (at % n + dx + n) % n;
        return this.select(this.state.selectedIndex === null ? at : r * n + c);
    }
    undo(): boolean { return this.dispatch({ type: 'UNDO' }); }
    hint(): boolean { return this.dispatch({ type: 'REQUEST_HINT' }); }
    toggleNotes(): void { this.notesMode = !this.notesMode; }
    step(ms: number): void {
        if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Temps');
        if (ms > 0 && this.status === 'playing') this.dispatch({ type: 'TICK', ms });
    }
    advance(ms: number): void { this.step(ms); }
    /** Placed count of each digit 1..N (the pad dims a digit once all N are placed without conflict). */
    counts(): number[] {
        const bad = new Set(conflicts(this.puzzle, this.state.values));
        return Array.from({ length: this.puzzle.size }, (_, d) => this.state.values.filter((v, i) => v === d + 1 && !bad.has(i)).length);
    }
    snapshot() {
        const s = this.state;
        return { mode: this.mode, level: this.level, seed: this.seed, id: this.record.id, size: this.puzzle.size, difficulty: this.record.difficulty, status: this.status,
            values: [...s.values], givens: [...this.puzzle.givens], notes: s.notes.map(n => [...n]), selectedIndex: s.selectedIndex, notesMode: this.notesMode,
            moves: s.moves, mistakes: s.mistakes, hintsUsed: s.hintsUsed, elapsedMs: s.elapsedMs, history: s.history.length,
            conflicts: conflicts(this.puzzle, s.values), hint: s.hint ? { ...s.hint, cells: [...s.hint.cells], lines: [...s.hint.lines] } : null,
            stars: stars(s), score: score(this.puzzle, s), events: this.events.map(e => e.type), refused: this.refused };
    }
}
