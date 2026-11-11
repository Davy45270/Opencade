import { LEVELS, GAME_NAME } from './levels';
import { applyAction, cellsOf, forwardSign, horizontal, initialState, isCar, legalMoves, ENGINE_VERSION, SCHEMA_VERSION, type Bus, type Color, type Direction, type GameAction, type GameEvent, type GameState, type LevelDefinition, type RefusalReason } from './rules';
import { encode, solve, type Move } from './solver';
export { LEVELS, GAME_NAME };
/** Bounds of the in-game searches (hint, dead-end check): every progression board's whole space is under 60 000 states. */
export const GAME_LIMITS = { nodes: 120000, ms: 4000 } as const;
export const COLOR_NAMES: Readonly<Record<Color, string>> = { rouge: 'rouge', bleu: 'bleu', jaune: 'jaune', vert: 'vert', violet: 'violet', orange: 'orange', gris: 'gris' };
export interface Hint { status: 'move' | 'none'; move: Move | null; text: string; remaining: number }
/** Stars: three at par without hint, two within par + 50 % with one hint at most, one otherwise. */
export function stars(moves: number, par: number, hints: number): number {
    if (hints === 0 && moves <= par) return 3;
    return hints <= 1 && moves <= par + Math.ceil(par / 2) ? 2 : 1;
}
export interface RunSave { schemaVersion: string; engineVersion: string; index: number; line: Move[]; hints: number }
export const busName = (b: Bus): string => isCar(b) ? 'la voiture grise' : `le ${b.length === 3 ? 'car' : 'bus'} ${COLOR_NAMES[b.color]}`;
export function directionWord(b: Bus, direction: Direction): string {
    const s = forwardSign(b) * (direction === 'forward' ? 1 : -1);
    return horizontal(b) ? (s > 0 ? 'vers la droite' : 'vers la gauche') : (s > 0 ? 'vers le bas' : 'vers le haut');
}
/** Stateful wrapper around the pure reducer for the scene, the demo and the tests. */
export class Engine {
    index = 0;
    level: LevelDefinition = LEVELS[0] as LevelDefinition;
    state: GameState = initialState(this.level);
    /** The accepted moves from the start to the current position (undo removes the last one): what a save keeps. */
    line: Move[] = [];
    hints = 0;
    lastHint: Hint | null = null;
    events: GameEvent[] = [];
    refused: RefusalReason | null = null;
    /** Animation clock (ms), never read by the rules. */
    time = 0;
    private plan: { key: string; moves: Move[] } | null = null;
    constructor() { this.loadLevel(0); }
    loadLevel(index: number): void {
        const level = LEVELS[index]; if (!level) throw new RangeError('Niveau');
        this.index = index; this.level = level; this.reset();
    }
    private reset(): void {
        this.state = initialState(this.level); this.line = []; this.hints = 0; this.lastHint = null; this.events = []; this.refused = null; this.plan = null;
    }
    get status(): GameState['status'] { return this.state.status; }
    /** The catalogue's demo contract sets the outcome directly to check its restart. */
    set status(status: GameState['status']) { this.state = { ...this.state, status }; }
    get par(): number { return LEVELS[this.index]?.par ?? 0; }
    get stars(): number { return stars(this.state.moves, this.par, this.hints); }
    get score(): number { return this.status === 'won' ? 10 * this.state.delivered + 100 * this.stars : 0; }
    get name(): string { return LEVELS[this.index]?.name ?? ''; }
    bus(id: string): Bus | undefined { return this.level.buses.find(b => b.id === id); }
    private act(action: GameAction): boolean {
        const result = applyAction(this.level, this.state, action);
        if (!result.accepted) { this.refused = result.reason; this.events = []; return false; }
        this.refused = null; this.state = result.state; this.events = result.events; this.lastHint = null;
        return true;
    }
    /** One validated displacement (a departure when it takes the bus past an exit). */
    move(busId: string, direction: Direction, distance: number): boolean {
        const bus = this.bus(busId);
        if (!this.act({ type: 'MOVE_BUS', busId, direction, distance })) return false;
        const departs = !this.state.busPositions[busId];
        this.line.push({ busId, direction, distance, departs });
        // Only a departure or a one-way move cannot be walked back: the board may then have become unwinnable.
        if (this.state.status === 'playing' && (departs || bus?.oneWay)) this.checkBlocked();
        return true;
    }
    /** Proves a dead end with the solver (exhaustive search); `unknown` never declares the board blocked. */
    checkBlocked(): boolean {
        if (this.state.status !== 'playing') return this.state.status === 'blocked';
        if (legalMoves(this.level, this.state).length && solve(this.level, this.state, GAME_LIMITS).status !== 'unsolvable') return false;
        this.state = { ...this.state, status: 'blocked' };
        this.events = [...this.events, { type: 'LEVEL_BLOCKED', payload: { moves: this.state.moves } }];
        return true;
    }
    undo(): boolean {
        if (!this.act({ type: 'UNDO' })) return false;
        this.line.pop(); return true;
    }
    restart(): void { this.act({ type: 'RESTART' }); this.line = []; this.lastHint = null; }
    /** The next move of a shortest line from here, explained; counted as help only when one is given. */
    hint(): Hint {
        if (this.state.status !== 'playing') {
            const h: Hint = { status: 'none', move: null, remaining: 0, text: this.state.status === 'blocked' ? 'Plus aucune suite ne gagne : annulez le dernier coup ou recommencez.' : 'Le niveau est fini.' };
            this.lastHint = h; return h;
        }
        const moves = this.solution();
        if (!moves?.length) { const h: Hint = { status: 'none', move: null, remaining: 0, text: 'Pas de conseil sûr ici : annulez un coup ou recommencez.' }; this.lastHint = h; return h; }
        const move = moves[0] as Move, h: Hint = { status: 'move', move, remaining: moves.length, text: this.explain(moves) };
        this.hints++; this.lastHint = h; this.events = [{ type: 'HINT_REQUESTED', payload: { busId: move.busId } }];
        return h;
    }
    /** A shortest line from the current position (cached while the player follows it). */
    solution(): Move[] | null {
        const key = encode(this.level, this.state);
        if (this.plan?.key === key) return this.plan.moves;
        const r = solve(this.level, this.state, GAME_LIMITS);
        if (r.status !== 'solved' || !r.actions) return null;
        this.plan = { key, moves: r.actions };
        return r.actions;
    }
    /** Says why the first move of `moves` helps: a departure (who boards), or whose road it clears later in the line. */
    explain(moves: readonly Move[]): string {
        const first = moves[0]; if (!first) return '';
        const bus = this.bus(first.busId); if (!bus) return '';
        const tail = moves.length > 1 ? ` Encore ${String(moves.length)} coups au mieux.` : ' C’est le dernier coup !';
        if (first.departs) {
            const head = this.level.passengerQueue[this.state.passengerQueueIndex];
            return `${cap(busName(bus))} peut partir : le groupe de ${String(head?.count ?? 0)} en tête de file est ${COLOR_NAMES[bus.color]} et tient dans ses ${String(bus.capacity)} places.${tail}`;
        }
        const action = `Glissez ${busName(bus)} de ${String(first.distance)} case${first.distance > 1 ? 's' : ''} ${directionWord(bus, first.direction)}`;
        // Replay the line: the first later move of another vehicle that sweeps a cell the mover leaves.
        const w = this.level.board.width, at = this.state.busPositions[bus.id];
        const freed = new Set(at ? cellsOf(bus, at.x, at.y).map(([x, y]) => y * w + x) : []);
        let state = applyAction(this.level, this.state, { type: 'MOVE_BUS', busId: first.busId, direction: first.direction, distance: first.distance }).state;
        for (const m of moves.slice(1)) {
            const other = this.bus(m.busId), p = state.busPositions[m.busId];
            if (other && p && other.id !== bus.id) {
                const s = forwardSign(other) * (m.direction === 'forward' ? 1 : -1), hz = horizontal(other), cells: number[] = [];
                const size = hz ? w : this.level.board.height, pos = hz ? p.x : p.y, end = m.departs ? (s > 0 ? size : -other.length) : pos + s * m.distance;
                for (let q = Math.min(pos, end); q <= Math.max(pos, end) + other.length - 1; q++) if (q >= 0 && q < size) cells.push(hz ? p.y * w + q : q * w + p.x);
                if (cells.some(c => freed.has(c))) return `${action} : cela libère la route ${busName(other).replace(/^le /, 'du ').replace(/^la /, 'de la ')}.${tail}`;
            }
            state = applyAction(this.level, state, { type: 'MOVE_BUS', busId: m.busId, direction: m.direction, distance: m.distance }).state;
        }
        return `${action} : c’est le premier coup de la solution la plus courte.${tail}`;
    }
    advance(ms: number): void { if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Temps'); this.time += ms; }
    step(ms: number): void { this.advance(ms); }
    serialize(): RunSave | null {
        if (this.state.status === 'won') return null;
        return { schemaVersion: SCHEMA_VERSION, engineVersion: ENGINE_VERSION, index: this.index, line: this.line.map(m => ({ ...m })), hints: this.hints };
    }
    /** Rebuilds a saved run by replaying its line, or null if the save is from another version or does not replay (AC-12). */
    static restore(save: unknown): Engine | null {
        if (typeof save !== 'object' || save === null) return null;
        const r = save as Partial<RunSave>;
        if (r.schemaVersion !== SCHEMA_VERSION || r.engineVersion !== ENGINE_VERSION || !Array.isArray(r.line)) return null;
        const e = new Engine();
        try { e.loadLevel(r.index ?? -1); } catch { return null; }
        for (const item of r.line as unknown[]) {
            const m = item as Partial<Record<'busId' | 'direction' | 'distance', unknown>> | null;
            if (typeof m !== 'object' || m === null || typeof m.busId !== 'string' || typeof m.distance !== 'number' || !e.move(m.busId, m.direction === 'backward' ? 'backward' : 'forward', m.distance)) return null;
        }
        if (e.state.status === 'won') return null;
        e.hints = Math.max(0, Math.floor(r.hints ?? 0)); e.events = []; e.lastHint = null;
        return e;
    }
    snapshot() {
        const s = this.state;
        return {
            level: this.index, name: this.name, status: s.status, moves: s.moves, par: this.par, turn: s.turn, hints: this.hints, stars: this.stars, score: this.score,
            positions: Object.fromEntries(Object.entries(s.busPositions).map(([k, p]) => [k, { ...p }])), departed: [...s.departedBusIds],
            queueIndex: s.passengerQueueIndex, waiting: s.remainingPassengerCount, delivered: s.delivered, loads: { ...s.loads },
            undo: s.history.length, refused: this.refused, events: this.events.map(e => e.type), hint: this.lastHint ? { ...this.lastHint } : null,
        };
    }
}
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
