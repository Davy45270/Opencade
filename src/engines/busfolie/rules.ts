/** Bus en folie rules: a pure reducer over the contracts of David's design dossier (schemas/contracts.ts, v1.0),
 * adapted to the repository. A bus slides only along its axis, never over an obstacle, another vehicle or the board
 * edge; it leaves the board only through an exit of its lane, compatible with its colour, and only when the group at
 * the head of the waiting line is of its colour and fits: it then boards that group and the next ones of its colour
 * while they fit, and drives away. An accepted action returns a new state and its events; a refused one returns the
 * very same state, a reason and no event (nothing is mutated, ever). Origin top left, integer cells. */
export const SCHEMA_VERSION = '1.0.0';
export const ENGINE_VERSION = '1.0.0';
export type Color = 'rouge' | 'bleu' | 'jaune' | 'vert' | 'violet' | 'orange' | 'gris';
/** Colours that carry passengers (grey is a parked car: it blocks, slides, never leaves). */
export const PASSENGER_COLORS: readonly Exclude<Color, 'gris'>[] = ['rouge', 'bleu', 'jaune', 'vert', 'violet', 'orange'];
export type Facing = 'left' | 'right' | 'up' | 'down';
export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Direction = 'forward' | 'backward';
export interface Bus {
    id: string; color: Color; x: number; y: number; length: 2 | 3; orientation: 'horizontal' | 'vertical';
    /** Seats; 0 for a grey car. */
    capacity: number;
    /** Where the front of the vehicle points (drawn as an arrow); `forward` moves that way. */
    facing: Facing;
    /** One way: it may only move forward (Opencade extension, per bus). */
    oneWay?: boolean;
}
export interface PassengerGroup { id: string; color: Exclude<Color, 'gris'>; count: number }
export interface Exit { id: string; side: Side; index: number; color: Exclude<Color, 'gris'> | null }
export interface LevelDefinition {
    schemaVersion: string; id: string; mode: 'kids' | 'classic'; seed: number | null; generatorVersion: string;
    board: { width: number; height: number };
    buses: Bus[]; passengerQueue: PassengerGroup[]; exits: Exit[]; obstacles: { x: number; y: number }[];
    rules: { allowReverse: boolean; allowUndo: boolean; timeLimitSeconds: number | null };
}
export type GameStatus = 'playing' | 'blocked' | 'won';
/** Everything an undo must restore: positions, departed buses, the waiting line, the loads and the move count. */
export interface Core {
    levelId: string; turn: number; status: GameStatus;
    /** Positions of the buses still on the board (a departed bus has none). */
    busPositions: Record<string, { x: number; y: number }>;
    departedBusIds: string[];
    passengerQueueIndex: number;
    /** Passengers still waiting. */
    remainingPassengerCount: number;
    /** Passengers on board of each departed bus. */
    loads: Record<string, number>;
    delivered: number;
    moves: number;
}
export interface GameState extends Core { history: Core[] }
export type GameAction =
    | { type: 'MOVE_BUS'; busId: string; direction: Direction; distance: number }
    | { type: 'UNDO' } | { type: 'RESTART' } | { type: 'REQUEST_HINT' };
export type GameEventType = 'LEVEL_BLOCKED' | 'BUS_MOVED' | 'PASSENGERS_BOARDED' | 'BUS_DEPARTED' | 'LEVEL_WON' | 'UNDONE' | 'RESTARTED' | 'HINT_REQUESTED';
export interface GameEvent { type: GameEventType; payload: Record<string, unknown> }
export type RefusalReason = 'BUS_NOT_FOUND' | 'PATH_BLOCKED' | 'INVALID_DIRECTION' | 'OUT_OF_BOUNDS' | 'GAME_NOT_PLAYING' | 'NO_UNDO'
    /** Opencade additions for the exit: wrong exit colour, head group of another colour, head group too large, nobody left. */
    | 'WRONG_EXIT' | 'WRONG_COLOR' | 'OVER_CAPACITY' | 'QUEUE_EMPTY';
export type ActionResult = { accepted: true; state: GameState; events: GameEvent[] } | { accepted: false; state: GameState; reason: RefusalReason; events: [] };

export const horizontal = (b: Bus): boolean => b.orientation === 'horizontal';
/** +1 when forward increases the moving coordinate (right, down), -1 otherwise. */
export const forwardSign = (b: Bus): 1 | -1 => b.facing === 'right' || b.facing === 'down' ? 1 : -1;
export const isCar = (b: Bus): boolean => b.color === 'gris';
/** Cells covered by a vehicle at (x, y). */
export function cellsOf(b: Bus, x: number, y: number): [number, number][] {
    return Array.from({ length: b.length }, (_, k) => horizontal(b) ? [x + k, y] as [number, number] : [x, y + k] as [number, number]);
}
/** The exit a vehicle reaches by leaving through `side` (its lane: the row of a horizontal bus, the column of a vertical one). */
export function exitFor(level: LevelDefinition, b: Bus, side: Side): Exit | undefined {
    const lane = horizontal(b) ? b.y : b.x;
    return level.exits.find(e => e.side === side && e.index === lane);
}
/** Groups boarded by a bus of `color` and `capacity` from the head of the line at `index`: the head group and the next
 * ones of the same colour while they fit (the line never reorders). Null when the head is of another colour, too large,
 * or nobody waits. */
export function boarding(queue: readonly PassengerGroup[], index: number, color: Color, capacity: number): { next: number; count: number } | RefusalReason {
    const head = queue[index];
    if (!head) return 'QUEUE_EMPTY';
    if (head.color !== color) return 'WRONG_COLOR';
    if (head.count > capacity) return 'OVER_CAPACITY';
    let next = index, count = 0;
    for (let g = queue[next]; g && g.color === color && count + g.count <= capacity; g = queue[next]) { count += g.count; next++; }
    return { next, count };
}
export function totalPassengers(level: LevelDefinition): number { return level.passengerQueue.reduce((s, g) => s + g.count, 0); }
export function initialState(level: LevelDefinition): GameState {
    return {
        levelId: level.id, turn: 0, status: 'playing', departedBusIds: [], passengerQueueIndex: 0, remainingPassengerCount: totalPassengers(level),
        busPositions: Object.fromEntries(level.buses.map(b => [b.id, { x: b.x, y: b.y }])), loads: {}, delivered: 0, moves: 0, history: [],
    };
}
const core = (s: GameState): Core => ({
    levelId: s.levelId, turn: s.turn, status: s.status, busPositions: Object.fromEntries(Object.entries(s.busPositions).map(([k, p]) => [k, { ...p }])),
    departedBusIds: [...s.departedBusIds], passengerQueueIndex: s.passengerQueueIndex, remainingPassengerCount: s.remainingPassengerCount,
    loads: { ...s.loads }, delivered: s.delivered, moves: s.moves,
});
/** Occupancy: obstacles and every vehicle still on the board, except `skip`. */
export function occupied(level: LevelDefinition, state: Core, skip?: string): Set<number> {
    const w = level.board.width, out = new Set<number>();
    for (const o of level.obstacles) out.add(o.y * w + o.x);
    for (const b of level.buses) {
        const p = state.busPositions[b.id];
        if (!p || b.id === skip) continue;
        for (const [x, y] of cellsOf(b, p.x, p.y)) out.add(y * w + x);
    }
    return out;
}
export function won(level: LevelDefinition, state: Core): boolean {
    return state.passengerQueueIndex >= level.passengerQueue.length && level.buses.every(b => isCar(b) || !state.busPositions[b.id]);
}
const refuse = (state: GameState, reason: RefusalReason): ActionResult => ({ accepted: false, state, reason, events: [] });
/** One move of a vehicle: the signed number of cells along its moving coordinate, or a departure through its lane end. */
export function applyAction(level: LevelDefinition, state: GameState, action: GameAction): ActionResult {
    if (action.type === 'RESTART') {
        const fresh = initialState(level);
        return { accepted: true, state: fresh, events: [{ type: 'RESTARTED', payload: {} }] };
    }
    if (action.type === 'UNDO') {
        const previous = state.history[state.history.length - 1];
        if (!level.rules.allowUndo || !previous) return refuse(state, 'NO_UNDO');
        return { accepted: true, state: { ...previous, history: state.history.slice(0, -1) }, events: [{ type: 'UNDONE', payload: { turn: previous.turn } }] };
    }
    if (action.type === 'REQUEST_HINT') {
        if (state.status !== 'playing') return refuse(state, 'GAME_NOT_PLAYING');
        return { accepted: true, state, events: [{ type: 'HINT_REQUESTED', payload: {} }] };
    }
    if (state.status !== 'playing') return refuse(state, 'GAME_NOT_PLAYING');
    const bus = level.buses.find(b => b.id === action.busId), at = bus ? state.busPositions[bus.id] : undefined;
    if (!bus || !at) return refuse(state, 'BUS_NOT_FOUND');
    // The action may come from outside (a save, a test): its direction is checked as plain data.
    const raw: { direction: unknown; distance: unknown } = action;
    if (!Number.isInteger(raw.distance) || action.distance <= 0 || (raw.direction !== 'forward' && raw.direction !== 'backward')) return refuse(state, 'INVALID_DIRECTION');
    if (action.direction === 'backward' && (!level.rules.allowReverse || bus.oneWay)) return refuse(state, 'INVALID_DIRECTION');
    const sign = forwardSign(bus) * (action.direction === 'forward' ? 1 : -1), w = level.board.width, h = level.board.height;
    const hz = horizontal(bus), pos = hz ? at.x : at.y, size = hz ? w : h, target = pos + sign * action.distance;
    const busy = occupied(level, state, bus.id), cell = (p: number): number => hz ? at.y * w + p : p * w + at.x;
    // Swept cells, up to the target or up to the edge for a departure.
    const leaves = target < 0 || target + bus.length > size;
    const front = sign > 0 ? pos + bus.length : pos - 1, last = leaves ? (sign > 0 ? size - 1 : 0) : (sign > 0 ? target + bus.length - 1 : target);
    for (let p = front; sign > 0 ? p <= last : p >= last; p += sign) if (busy.has(cell(p))) return refuse(state, 'PATH_BLOCKED');
    const events: GameEvent[] = [];
    const next: GameState = { ...core(state), history: [...state.history, core(state)], turn: state.turn + 1, moves: state.moves + 1 };
    if (!leaves) {
        const to = hz ? { x: target, y: at.y } : { x: at.x, y: target };
        next.busPositions[bus.id] = to;
        events.push({ type: 'BUS_MOVED', payload: { busId: bus.id, from: { ...at }, to, distance: action.distance } });
    } else {
        const side: Side = hz ? (sign > 0 ? 'right' : 'left') : (sign > 0 ? 'bottom' : 'top');
        const exit = exitFor(level, bus, side);
        if (!exit || isCar(bus)) return refuse(state, 'OUT_OF_BOUNDS');
        if (exit.color !== null && exit.color !== bus.color) return refuse(state, 'WRONG_EXIT');
        const b = boarding(level.passengerQueue, state.passengerQueueIndex, bus.color, bus.capacity);
        if (typeof b === 'string') return refuse(state, b);
        const groups = level.passengerQueue.slice(state.passengerQueueIndex, b.next).map(g => g.id);
        next.busPositions = Object.fromEntries(Object.entries(next.busPositions).filter(([id]) => id !== bus.id));
        next.departedBusIds.push(bus.id); next.loads[bus.id] = b.count;
        next.passengerQueueIndex = b.next; next.remainingPassengerCount -= b.count; next.delivered += b.count;
        events.push({ type: 'BUS_MOVED', payload: { busId: bus.id, from: { ...at }, to: null, distance: action.distance } });
        events.push({ type: 'PASSENGERS_BOARDED', payload: { busId: bus.id, groups, count: b.count, capacity: bus.capacity } });
        events.push({ type: 'BUS_DEPARTED', payload: { busId: bus.id, exitId: exit.id, side } });
    }
    if (won(level, next)) { next.status = 'won'; events.push({ type: 'LEVEL_WON', payload: { moves: next.moves } }); }
    return { accepted: true, state: next, events };
}
/** Every accepted move from `state`, one per reachable position (and one per departure), shortest distances first. */
export function legalMoves(level: LevelDefinition, state: Core): { busId: string; direction: Direction; distance: number; departs: boolean }[] {
    if (state.status !== 'playing') return [];
    const out: { busId: string; direction: Direction; distance: number; departs: boolean }[] = [];
    const w = level.board.width, h = level.board.height, busy = occupied(level, state);
    for (const bus of level.buses) {
        const at = state.busPositions[bus.id]; if (!at) continue;
        const hz = horizontal(bus), pos = hz ? at.x : at.y, size = hz ? w : h, cell = (p: number): number => hz ? at.y * w + p : p * w + at.x;
        for (const direction of ['forward', 'backward'] as const) {
            if (direction === 'backward' && (!level.rules.allowReverse || bus.oneWay)) continue;
            const sign = forwardSign(bus) * (direction === 'forward' ? 1 : -1);
            let d = 1;
            for (; ; d++) {
                const front = sign > 0 ? pos + bus.length - 1 + d : pos - d;
                if (front < 0 || front >= size) break;
                if (busy.has(cell(front))) { d = -1; break; }
                out.push({ busId: bus.id, direction, distance: d, departs: false });
            }
            if (d < 0 || isCar(bus)) continue;
            const side: Side = hz ? (sign > 0 ? 'right' : 'left') : (sign > 0 ? 'bottom' : 'top'), exit = exitFor(level, bus, side);
            if (!exit || (exit.color !== null && exit.color !== bus.color)) continue;
            if (typeof boarding(level.passengerQueue, state.passengerQueueIndex, bus.color, bus.capacity) === 'string') continue;
            // The distance that takes the whole bus past the edge.
            out.push({ busId: bus.id, direction, distance: sign > 0 ? size - pos : pos + bus.length, departs: true });
        }
    }
    return out;
}
/** Structural problems of a level (empty when it can be played): sizes, overlaps, exits on the border, a lane exit for
 * every bus, groups no bus could take, passengers that no bus colour matches. */
export function validateLevel(level: LevelDefinition): string[] {
    const errors: string[] = [], w = level.board.width, h = level.board.height;
    if (!Number.isInteger(w) || !Number.isInteger(h) || w < 4 || h < 4 || w > 10 || h > 10) errors.push('plateau');
    const seen = new Map<number, string>(), ids = new Set<string>();
    const put = (x: number, y: number, who: string): void => {
        if (x < 0 || y < 0 || x >= w || y >= h) { errors.push(`${who} hors plateau`); return; }
        const k = y * w + x, other = seen.get(k);
        if (other) errors.push(`${who} chevauche ${other}`); else seen.set(k, who);
    };
    for (const o of level.obstacles) put(o.x, o.y, 'obstacle');
    for (const b of level.buses) {
        if (ids.has(b.id)) errors.push(`id ${b.id}`); ids.add(b.id);
        const length: number = b.length;
        if (length !== 2 && length !== 3) errors.push(`${b.id} longueur`);
        if ((b.orientation === 'horizontal') !== (b.facing === 'left' || b.facing === 'right')) errors.push(`${b.id} sens`);
        if (isCar(b) ? b.capacity !== 0 : b.capacity < 1) errors.push(`${b.id} capacité`);
        for (const [x, y] of cellsOf(b, b.x, b.y)) put(x, y, b.id);
        if (!isCar(b)) {
            const sides: Side[] = horizontal(b) ? (b.oneWay ? [b.facing === 'right' ? 'right' : 'left'] : ['left', 'right']) : (b.oneWay ? [b.facing === 'down' ? 'bottom' : 'top'] : ['top', 'bottom']);
            if (!sides.some(s => { const e = exitFor(level, b, s); return e && (e.color === null || e.color === b.color); })) errors.push(`${b.id} sans sortie`);
        }
    }
    for (const e of level.exits) if (e.index < 0 || e.index >= (e.side === 'top' || e.side === 'bottom' ? w : h)) errors.push(`sortie ${e.id}`);
    for (const g of level.passengerQueue) {
        if (!Number.isInteger(g.count) || g.count < 1) errors.push(`groupe ${g.id}`);
        if (!level.buses.some(b => b.color === g.color && b.capacity >= g.count)) errors.push(`groupe ${g.id} sans bus`);
    }
    for (const b of level.buses) if (!isCar(b) && !level.passengerQueue.some(g => g.color === b.color)) errors.push(`${b.id} sans passager`);
    return errors;
}
