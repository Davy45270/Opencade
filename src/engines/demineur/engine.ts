import { LEVELS, GAME_NAME, CLASSIC, classicLevel, dailyLevel, type Classic } from './levels';
import { applyAction, armState, initialState, inside, GENERATOR_VERSION, SCHEMA_VERSION, type GameAction, type GameEvent, type GameState, type LevelDefinition, type RefusalReason } from './rules';
import { hint as solverHint, type Hint } from './solver';
export { LEVELS, GAME_NAME };
/** What is being played: a progression grid, a classic size, or the day's challenge. */
export type Kind = 'progression' | Classic | 'daily';
export type Tool = 'dig' | 'flag';
/** Stars: three without hint, two with one or two, one beyond. */
export function stars(hints: number): number { return hints === 0 ? 3 : hints <= 2 ? 2 : 1; }
/** Saved run (spec "Persistance"): versions, seed, first click, size, revealed/flags/questions, mode, time, status.
 * Never the mine map: a deferred board is rebuilt from seed + first click + generator version. */
export interface RunSave {
    schemaVersion: string; generatorVersion: string; kind: Kind; index: number; seed: number; day: number;
    firstClick: { x: number; y: number } | null; width: number; height: number; mineCount: number;
    revealed: string; marks: string; elapsedMs: number; status: 'ready' | 'playing'; hints: number; turn: number;
}
/** Stateful wrapper around the pure reducer for the scene, the demo and the tests. The clock is outside the rules:
 * it runs only once the first cell is revealed, through `advance(ms)`. */
export class Engine {
    kind: Kind = 'progression'; index = 0; seed = 28; day = 0;
    level: LevelDefinition = LEVELS[0] ?? classicLevel('beginner', 28);
    state: GameState = initialState(this.level);
    /** 'playing' while the board is open (ready included), as the shell expects. */
    status: 'playing' | 'won' | 'lost' = 'playing';
    hints = 0;
    lastHint: Hint | null = null;
    events: GameEvent[] = [];
    refused: RefusalReason | null = null;
    /** Animation clock (ms), never read by the rules. */
    time = 0;
    elapsedMs = 0;
    /** True once the player revealed a cell (the opening of a curated board does not count). */
    clock = false;
    constructor() { this.loadLevel(0); }
    private load(level: LevelDefinition): void {
        this.level = level; this.state = initialState(level); this.status = 'playing'; this.hints = 0; this.lastHint = null;
        this.events = []; this.refused = null; this.elapsedMs = 0; this.clock = false;
    }
    loadLevel(index: number, seed = 28): void {
        const level = LEVELS[index]; if (!level) throw new RangeError('Niveau');
        this.kind = 'progression'; this.index = index; this.seed = seed; this.load(level);
    }
    loadClassic(kind: Classic, seed: number): void { this.kind = kind; this.index = 0; this.seed = seed >>> 0; this.load(classicLevel(kind, this.seed)); }
    loadDaily(day: number): void { this.kind = 'daily'; this.index = 0; this.day = day; this.seed = day; this.load(dailyLevel(day)); }
    /** Same board again (a classic board takes a new seed, given by the caller). */
    restart(seed = this.seed): void {
        if (this.kind === 'progression') this.loadLevel(this.index, seed);
        else if (this.kind === 'daily') this.loadDaily(this.day);
        else this.loadClassic(this.kind, seed);
    }
    get width(): number { return this.level.width; }
    get height(): number { return this.level.height; }
    get assisted(): boolean { return this.hints > 0; }
    get stars(): number { return stars(this.hints); }
    get score(): number { return this.status === 'won' ? 10 * this.level.mineCount + 100 * this.stars : 0; }
    /** Mines not yet flagged; 0 once the board is won (every mine is then known). */
    get minesLeft(): number { return this.status === 'won' ? 0 : this.level.mineCount - this.state.flags; }
    get name(): string {
        if (this.kind === 'progression') return LEVELS[this.index]?.name ?? '';
        return this.kind === 'daily' ? 'Défi du jour' : CLASSIC[this.kind].name;
    }
    /** Proven without guessing (progression and daily) or not (classic: guesses may be needed). */
    get noGuess(): boolean { return this.level.generation.noGuess === true; }
    act(action: GameAction): boolean {
        const result = applyAction(this.level, this.state, action);
        if (!result.accepted) { this.refused = result.reason; this.events = []; return false; }
        this.refused = null; this.state = result.state; this.events = result.events; this.lastHint = null;
        if (action.type === 'REVEAL' || action.type === 'CHORD') this.clock = true;
        this.status = this.state.status === 'won' ? 'won' : this.state.status === 'lost' ? 'lost' : 'playing';
        return true;
    }
    reveal(x: number, y: number): boolean { return this.act({ type: 'REVEAL', x, y }); }
    flag(x: number, y: number): boolean { return this.act({ type: 'FLAG', x, y }); }
    chord(x: number, y: number): boolean { return this.act({ type: 'CHORD', x, y }); }
    /** One touch on (x, y) with the current tool: a revealed number chords, otherwise dig or mark. */
    press(x: number, y: number, tool: Tool): boolean {
        if (!inside(this.width, this.height, x, y)) return this.act({ type: 'REVEAL', x, y });
        const cell = this.state.cells[y * this.width + x];
        if (cell?.revealed) return this.chord(x, y);
        return tool === 'flag' ? this.flag(x, y) : this.reveal(x, y);
    }
    /** A proven deduction, explained. Counted as help only when one is given. */
    hint(): Hint {
        if (this.status !== 'playing' || this.state.status === 'ready') {
            const h: Hint = { status: 'unknown', reason: 'ambiguous', proof: this.state.status === 'ready' ? 'Première case : elle est toujours sûre. Touchez où vous voulez.' : 'La partie est finie.' };
            this.lastHint = h; return h;
        }
        const h = solverHint(this.level, this.state.cells);
        if (h.status !== 'unknown') this.hints++;
        this.lastHint = h; return h;
    }
    advance(ms: number): void {
        if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Temps');
        this.time += ms;
        if (this.clock && this.status === 'playing') this.elapsedMs += ms;
    }
    step(ms: number): void { this.advance(ms); }
    serialize(): RunSave | null {
        if (this.status !== 'playing') return null;
        const s = this.state;
        return {
            schemaVersion: SCHEMA_VERSION, generatorVersion: this.level.generation.generatorVersion, kind: this.kind, index: this.index, seed: this.seed, day: this.day,
            firstClick: s.firstClick ? { ...s.firstClick } : null, width: this.width, height: this.height, mineCount: this.level.mineCount,
            revealed: s.cells.map(c => c.revealed ? '1' : '0').join(''), marks: s.cells.map(c => c.mark === 'flag' ? 'F' : c.mark === 'question' ? '?' : '.').join(''),
            elapsedMs: Math.round(this.elapsedMs), status: s.status === 'ready' ? 'ready' : 'playing', hints: this.hints, turn: s.turn,
        };
    }
    /** Rebuilds a saved run, or null if the save is from another version, inconsistent or finished (AC11). */
    static restore(save: unknown): Engine | null {
        if (typeof save !== 'object' || save === null) return null;
        const r = save as Partial<RunSave>;
        if (r.schemaVersion !== SCHEMA_VERSION || r.generatorVersion !== GENERATOR_VERSION) return null;
        const e = new Engine();
        try {
            if (r.kind === 'progression') e.loadLevel(r.index ?? -1, r.seed);
            else if (r.kind === 'daily') e.loadDaily(r.day ?? 0);
            else if (r.kind === 'beginner' || r.kind === 'intermediate' || r.kind === 'expert') e.loadClassic(r.kind, r.seed ?? 0);
            else return null;
        } catch { return null; }
        const n = e.width * e.height;
        if (r.width !== e.width || r.height !== e.height || r.mineCount !== e.level.mineCount || typeof r.revealed !== 'string' || typeof r.marks !== 'string' || r.revealed.length !== n || r.marks.length !== n) return null;
        let state = e.state;
        if (e.level.generation.type !== 'curated') {
            if (!r.firstClick) { if (r.revealed.includes('1')) return null; }
            else if (!inside(e.width, e.height, r.firstClick.x, r.firstClick.y)) return null;
            else state = armState(e.level, state, r.firstClick.x, r.firstClick.y);
        }
        const revealed = r.revealed, marks = r.marks;
        const cells = state.cells.map((c, i) => ({ ...c, revealed: revealed[i] === '1', mark: marks[i] === 'F' ? 'flag' as const : marks[i] === '?' ? 'question' as const : 'none' as const }));
        if (cells.some(c => c.revealed && (c.mine || c.mark !== 'none'))) return null;
        const safe = cells.filter(c => c.revealed).length;
        if (safe >= n - e.level.mineCount) return null;
        e.state = { ...state, cells, revealedSafeCount: safe, flags: cells.filter(c => c.mark === 'flag').length, turn: r.turn ?? 0, status: r.firstClick || e.level.generation.type === 'curated' ? 'playing' : 'ready' };
        e.hints = Math.max(0, Math.floor(r.hints ?? 0)); e.elapsedMs = Math.max(0, r.elapsedMs ?? 0);
        e.clock = e.elapsedMs > 0 || (e.level.generation.type === 'curated' ? (r.turn ?? 0) > 0 : Boolean(r.firstClick));
        return e;
    }
    snapshot() {
        const s = this.state;
        return {
            kind: this.kind, level: this.index, seed: this.seed, day: this.day, name: this.name, width: this.width, height: this.height, mines: this.level.mineCount,
            status: this.status, phase: s.status, revealed: s.revealedSafeCount, safe: this.width * this.height - this.level.mineCount, flags: s.flags, minesLeft: this.minesLeft,
            turn: s.turn, hints: this.hints, stars: this.stars, score: this.score, elapsedMs: Math.round(this.elapsedMs), clock: this.clock, noGuess: this.noGuess,
            firstClick: s.firstClick ? { ...s.firstClick } : null, refused: this.refused, events: this.events.map(e => e.type),
            hint: this.lastHint ? { ...this.lastHint } : null,
            cells: s.cells.map(c => c.revealed ? (c.mine ? 'X' : String(c.adjacent)) : c.mark === 'flag' ? 'F' : c.mark === 'question' ? '?' : '#').join(''),
        };
    }
}
/** Local best times (ms) of the timed modes. AC14: an assisted game (any hint) never enters them, nor a progression grid. */
export type Records = Partial<Record<Classic | 'daily', number>>;
export function recordTime(records: Records, kind: Kind, ms: number, assisted: boolean): { records: Records; improved: boolean } {
    if (kind === 'progression' || assisted || !Number.isFinite(ms) || ms <= 0) return { records, improved: false };
    const previous = records[kind];
    if (previous !== undefined && previous <= ms) return { records, improved: false };
    return { records: { ...records, [kind]: Math.round(ms) }, improved: true };
}
