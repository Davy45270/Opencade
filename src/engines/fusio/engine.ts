import { CHALLENGES, challengeConfig, classicConfig, themeOf, type Theme } from './challenges';
import { ENGINE_VERSION, SCHEMA_VERSION, applyAction, initialState, maxTile, validateState, type Direction, type GameAction, type GameConfig, type GameEvent, type GameState, type RefusalReason } from './rules';
import { bestMove, hint as solverHint, type Hint } from './solver';
export const GAME_NAME = 'Fusio';
/** The level list of the shell: the thirty challenges. */
export const LEVELS = CHALLENGES;
export type Kind = 'classic' | 'challenge';
/** Stars of a won challenge: three without help, two with one or two hints or undos, one beyond. */
export function stars(helps: number): number { return helps === 0 ? 3 : helps <= 2 ? 2 : 1; }
/** Saved run: versions, what is played, the seed and the whole state (history and generator state included). */
export interface RunSave { schemaVersion: string; engineVersion: string; kind: Kind; index: number; seed: number; hints: number; undos: number; state: GameState }
/** Stateful wrapper around the pure reducer, for the scene, the demo and the tests. */
export class Engine {
    kind: Kind = 'classic'; index = 0; seed = 45270;
    config: GameConfig = classicConfig(45270);
    state: GameState = initialState(this.config);
    events: GameEvent[] = [];
    refused: RefusalReason | null = null;
    lastHint: Hint | null = null;
    hints = 0; undos = 0;
    /** Animation clock (ms), never read by the rules. */
    time = 0;
    constructor() { this.loadClassic(45270); }
    private load(config: GameConfig): void {
        this.config = config; this.state = initialState(config); this.events = []; this.refused = null; this.lastHint = null; this.hints = 0; this.undos = 0;
    }
    loadClassic(seed: number): void { this.kind = 'classic'; this.index = 0; this.seed = seed >>> 0; this.load(classicConfig(this.seed)); }
    loadChallenge(index: number): void {
        const c = CHALLENGES[index]; if (!c) throw new RangeError('Défi');
        this.kind = 'challenge'; this.index = index; this.seed = c.seed; this.load(challengeConfig(index));
    }
    get status(): GameState['status'] { return this.state.status; }
    /** Forces the status (catalogue contract: a demo whose game ended restarts on its next step). */
    set status(status: GameState['status']) { this.state = { ...this.state, status }; }
    get size(): number { return this.config.size; }
    get theme(): Theme { return this.kind === 'classic' ? 'classique' : themeOf(this.index); }
    get name(): string { return this.kind === 'classic' ? 'Classique' : CHALLENGES[this.index]?.name ?? ''; }
    get stars(): number { return stars(this.hints + this.undos); }
    get movesLeft(): number | null { return this.config.moveLimit ? Math.max(0, this.config.moveLimit - this.state.moves) : null; }
    act(action: GameAction): boolean {
        const r = applyAction(this.config, this.state, action);
        if (!r.accepted) { this.refused = r.reason; this.events = []; return false; }
        this.refused = null; this.state = r.state; this.events = r.events; this.lastHint = null;
        if (action.type === 'UNDO') this.undos++;
        if (action.type === 'RESTART') { this.hints = 0; this.undos = 0; }
        return true;
    }
    move(direction: Direction): boolean { return this.act({ type: 'MOVE', direction }); }
    undo(): boolean { return this.act({ type: 'UNDO' }); }
    restart(): boolean { return this.act({ type: 'RESTART' }); }
    /** Classic only: go on after the win (the target was reached once). */
    keepGoing(): boolean { return this.act({ type: 'CONTINUE' }); }
    get canUndo(): boolean { return this.config.undoEnabled !== false && this.state.history.length > 0; }
    /** The agent's move with its one-line reason; counted as help when one is given. */
    hint(): Hint | null {
        const h = solverHint(this.config, this.state);
        if (h) this.hints++;
        this.lastHint = h; return h;
    }
    /** The agent's move without counting it (demo, tests). */
    nextMove(): Direction | null { return this.state.status === 'playing' ? bestMove(this.config, this.state.board)?.direction ?? null : null; }
    advance(ms: number): void { if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Temps'); this.time += ms; }
    step(ms: number): void { this.advance(ms); }
    serialize(): RunSave { return { schemaVersion: SCHEMA_VERSION, engineVersion: ENGINE_VERSION, kind: this.kind, index: this.index, seed: this.seed, hints: this.hints, undos: this.undos, state: structuredClone(this.state) }; }
    /** Rebuilds a saved run, or null if it is from another version or inconsistent with its config (AC12). */
    static restore(save: unknown): Engine | null {
        if (typeof save !== 'object' || save === null) return null;
        const r = save as Partial<RunSave>;
        if (r.schemaVersion !== SCHEMA_VERSION || r.engineVersion !== ENGINE_VERSION) return null;
        const e = new Engine();
        try {
            if (r.kind === 'classic' && typeof r.seed === 'number') e.loadClassic(r.seed);
            else if (r.kind === 'challenge' && typeof r.index === 'number') e.loadChallenge(r.index);
            else return null;
        } catch { return null; }
        if (validateState(e.config, r.state).length) return null;
        const s = r.state as GameState, raw = r.state as unknown as Record<string, unknown>;
        e.state = { ...structuredClone(s), endless: raw.endless === true, lostBy: raw.lostBy === 'moves' || raw.lostBy === 'blocked' ? raw.lostBy : null, reached: raw.reached === true };
        e.hints = Math.max(0, Math.floor(r.hints ?? 0)); e.undos = Math.max(0, Math.floor(r.undos ?? 0));
        return e;
    }
    snapshot() {
        const s = this.state;
        return {
            kind: this.kind, level: this.index, seed: this.seed, name: this.name, size: this.size, target: this.config.target, theme: this.theme,
            board: s.board.slice(), score: s.score, moves: s.moves, movesLeft: this.movesLeft, prngState: s.prngState, status: s.status, endless: s.endless, lostBy: s.lostBy,
            maxTile: maxTile(s.board), walls: [...(this.config.walls ?? [])], undo: this.config.undoEnabled !== false, canUndo: this.canUndo, history: s.history.length,
            hints: this.hints, undos: this.undos, stars: this.stars, refused: this.refused, events: this.events.map(e => e.type),
            hint: this.lastHint ? { ...this.lastHint } : null,
        };
    }
}
