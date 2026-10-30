import { Random } from '../shared/random';
import { PLANS, type Plan } from './levels';
export { PLANS };
export type { Plan };
export type Direction = 'up' | 'down' | 'left' | 'right';
export type Action = Direction | 'wait' | 'bond';
export interface Cell { x: number; y: number }
export interface Lane {
    y: number; kind: 'road' | 'river'; direction: number; offset: number; diver: boolean;
    /** Pass 404 (optional): cells per phase, traffic light, alternating current. */
    speed?: number; light?: { period: number; red: number }; tide?: number;
}
export interface Board { lanes: Lane[]; shelters: number[]; rocks?: Cell[]; castaway?: { lane: number; x: number } | null; ordered?: boolean }
export interface State { player: Cell; previous: Cell; lives: number; occupied: number[]; time: number; phase: number; score: number; rescued?: boolean }
export function difficulty(level: number) {
    if (!Number.isInteger(level) || level < 0 || level > 29) throw new RangeError('Niveau invalide');
    const plan = PLANS[level] ?? { name: '' };
    return { flowFrames: 30 - Math.floor(17 * level / 29) + (plan.slower ?? 0), spacing: 6 - Math.floor(2 * level / 29), logLength: 8 - Math.floor(3 * level / 29), diveDuration: level < 6 ? 0 : 1 + Math.floor((level - 6) / 6), timeMs: 60000 - 1000 * level, shelters: 3 + Math.floor(level / 10), mixedLanes: 1 + Math.floor(level / 5), lives: plan.lives ?? 3 };
}
export const LEVELS = PLANS.map((p, i) => ({ name: `${String(i + 1)}. ${p.name}` }));
const mod = (n: number, d: number): number => ((n % d) + d) % d;
export function generate(level: number, seed: number): Board {
    // Curated traffic layouts, measured offline with the space-time BFS.
    // These salts only select PRNG streams; collision rules never use proof metrics.
    const streams = [8,33,4,0,13,1,85,23,7,17,58,136,32,10,117,7002,132,7802,8206,8602,183,233,34,10205,12,264,480,137,12205,623];
    const d = difficulty(level), r = new Random(seed + (streams[level] ?? 0) + level * 7919);
    const rows = Array.from({ length: 12 }, (_, i) => i + 2);
    // Sample without replacement: safe banks and the road/river boundary vary too.
    for (let i = rows.length - 1; i > 0; i--) {
        const j = Math.floor(r.next() * (i + 1));
        const a = rows[i], b = rows[j];
        if (a !== undefined && b !== undefined) [rows[i], rows[j]] = [b, a];
    }
    const plan = PLANS[level] ?? { name: '' };
    const lanes = rows.slice(0, 8).sort((a, b) => a - b).map((y, i): Lane => ({
        y, kind: i < 5 ? 'river' : 'road', direction: i < d.mixedLanes ? (i % 2 ? -1 : 1) : (r.next() < .5 ? -1 : 1),
        offset: Math.floor(r.next() * 9), diver: i < 5 && r.next() < .4,
        ...(plan.fast?.includes(i) ? { speed: 2 } : {}), ...(plan.lights?.includes(i) && i >= 5 ? { light: { period: 6, red: 2 } } : {}),
        ...(plan.tide?.lanes.includes(i) ? { tide: plan.tide.period } : {}),
    }));
    // Rocks on bank rows (never the start row, the shelter row or the start column of row 13).
    const banks = Array.from({ length: 13 }, (_, i) => i + 1).filter(y => !lanes.some(l => l.y === y));
    const rocks: Cell[] = [];
    for (let i = 0; i < (plan.rocks ?? 0) * 4 && rocks.length < (plan.rocks ?? 0); i++) {
        const cell = { x: Math.floor(r.next() * 9), y: banks[Math.floor(r.next() * banks.length)] ?? 1 };
        if (!rocks.some(c => c.x === cell.x && c.y === cell.y) && !(cell.x === 4 && cell.y === 13)) rocks.push(cell);
    }
    let castaway: Board['castaway'] = null;
    if (plan.rescue) {
        let lane = lanes.findIndex(l => l.kind === 'river' && !l.diver && l.tide === undefined);
        // Fallback: the rule never disappears; the first river lane becomes a steady log lane.
        if (lane < 0) { lane = 0; const first = lanes[0]; if (first) { first.diver = false; delete first.tide; } }
        const l = lanes[lane];
        if (l) castaway = { lane, x: Array.from({ length: 9 }, (_, x) => x).find(x => filled(l, x, 0, level)) ?? 0 };
    }
    return { shelters: d.shelters === 3 ? [1, 4, 7] : d.shelters === 4 ? [0, 3, 5, 8] : [0, 2, 4, 6, 8], lanes, rocks, castaway, ordered: plan.ordered ?? false };
}
/** Signed cells a lane has travelled after `phase` quanta (lights, tides and speed included). */
export function travel(lane: Lane, phase: number): number {
    const speed = lane.speed ?? 1;
    if (lane.light) { const { period, red } = lane.light; return lane.direction * speed * (Math.floor(phase / period) * (period - red) + Math.max(0, phase % period - red)); }
    if (lane.tide) { const k = Math.floor(phase / lane.tide), rem = phase % lane.tide; return lane.direction * speed * (k % 2 ? lane.tide - rem : rem); }
    return lane.direction * speed * phase;
}
/** Cells a lane moves during quantum `phase` (what a log carries). */
export const drift = (lane: Lane, phase: number): number => travel(lane, phase + 1) - travel(lane, phase);
/** Where the castaway rides at `phase`, or null once rescued or absent. */
export function castawayAt(board: Board, phase: number): Cell | null {
    const c = board.castaway, lane = c ? board.lanes[c.lane] : undefined;
    return c && lane ? { x: mod(c.x + travel(lane, phase), 9), y: lane.y } : null;
}
export function submerged(lane: Lane, phase: number, level: number): boolean {
    return lane.diver && mod(phase + lane.offset, 18) < difficulty(level).diveDuration;
}
export function filled(lane: Lane, x: number, phase: number, level: number): boolean {
    const d = difficulty(level);
    const position = x - lane.offset - travel(lane, phase);
    return lane.kind === 'road' ? mod(position, d.spacing) < 2 : !submerged(lane, phase, level) && mod(position, 9) < d.logLength;
}
export function safe(board: Board, cell: Cell, phase: number, level: number): boolean {
    if (cell.x < 0 || cell.x > 8 || cell.y < 0 || cell.y > 14) return false;
    if (cell.y === 0) return board.shelters.includes(cell.x);
    if (board.rocks?.some(r => r.x === cell.x && r.y === cell.y)) return false;
    const lane = board.lanes.find(l => l.y === cell.y);
    return !lane || (lane.kind === 'road' ? !filled(lane, cell.x, phase, level) : filled(lane, cell.x, phase, level));
}
const vectors: Record<Action, Cell> = { bond: { x: 0, y: -2 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, wait: { x: 0, y: 0 } };
/** One command, contact, then lane movement and a second contact. Shared by the search and simulation. */
export function transition(board: Board, player: Cell, phase: number, action: Action, level: number): Cell | null {
    const v = vectors[action];
    let next = { x: Math.max(0, Math.min(8, player.x + v.x)), y: Math.max(0, Math.min(14, player.y + v.y)) };
    // A rock simply stops the step (the player stays), it never costs a life.
    if (board.rocks?.some(r => r.x === next.x && r.y === next.y)) next = { ...player };
    if (!safe(board, next, phase, level)) return null;
    if (next.y === 0) return next;
    const lane = board.lanes.find(l => l.y === next.y);
    if (lane?.kind === 'river') next.x += drift(lane, phase);
    return safe(board, next, phase + 1, level) ? next : null;
}
/** May the player arrive in shelter `x` now? Shut until the castaway is aboard; in order when ordered. */
export function shelterOpen(board: Board, occupied: number[], rescued: boolean, x: number): boolean {
    if (board.castaway && !rescued) return false;
    if (board.ordered) return board.shelters.find(s => !occupied.includes(s)) === x;
    return !occupied.includes(x);
}
export class Engine {
    specialUses = 1;
    specialMs = 0;
    level = 0; seed = 28; board: Board = generate(0, 28);
    status: 'playing' | 'won' | 'lost' = 'playing';
    state: State = { player: { x: 4, y: 14 }, previous: { x: 4, y: 14 }, lives: 3, occupied: [], time: 60000, phase: 0, score: 0 };
    private remainder = 0; private frames = 0; private queue: Action[] = [];
    constructor(level = 0, seed = 28) { this.loadLevel(level, seed); }
    loadLevel(level: number, seed = 28): void {
        const d = difficulty(level); this.level = level; this.seed = seed; this.board = generate(level, seed); this.status = 'playing'; this.remainder = 0; this.frames = 0; this.queue = [];
        this.specialUses = 1; this.specialMs = 0;
        this.state = { player: { x: 4, y: 14 }, previous: { x: 4, y: 14 }, lives: d.lives, occupied: [], time: d.timeMs, phase: 0, score: 0, rescued: false };
    }
    /** Serializable scenario position; no collision or terminal rule is altered. */
    loadState(state: State): void { this.state = { rescued: false, ...structuredClone(state) }; this.status = 'playing'; this.queue = []; this.frames = 0; this.remainder = 0; }
    input(direction: Direction): void { if (this.status === 'playing') this.queue.push(direction); }
    special(): boolean {
        if (this.status !== 'playing' || this.specialUses === 0) return false;
        this.specialUses--; this.queue.push('bond'); return true;
    }
    private reset(): void { this.state.player = { x: 4, y: 14 }; this.state.previous = { ...this.state.player }; this.state.time = difficulty(this.level).timeMs; this.queue = []; }
    private life(): void { this.state.lives--; this.reset(); this.specialUses = 1; this.specialMs = 0; if (this.state.lives === 0) this.status = 'lost'; }
    step(dtMs: number): void {
        if (!Number.isFinite(dtMs) || dtMs < 0) throw new RangeError('Temps invalide');
        if (this.status !== 'playing') return;
        this.remainder += dtMs;
        while (this.remainder + 1e-8 >= 1000 / 60 && this.status === 'playing') {
            this.remainder -= 1000 / 60; this.frames++; this.state.time -= 1000 / 60;
            this.specialMs = Math.max(0, this.specialMs - 1000 / 60);
            if (this.state.time < 1e-7) { this.life(); continue; }
            if (this.frames < difficulty(this.level).flowFrames) continue;
            this.frames = 0;
            const action = this.queue.shift() ?? 'wait';
            if (action === 'bond') this.specialMs = 500;
            const next = transition(this.board, this.state.player, this.state.phase, action, this.level);
            this.state.phase++;
            this.state.previous = { ...this.state.player };
            if (!next) { this.life(); continue; }
            this.state.player = next;
            const castaway = this.state.rescued ? null : castawayAt(this.board, this.state.phase);
            if (castaway && castaway.x === next.x && castaway.y === next.y) { this.state.rescued = true; this.state.score += 300 * (this.level + 1); }
            if (next.y === 0) {
                if (!shelterOpen(this.board, this.state.occupied, this.state.rescued ?? false, next.x)) this.life();
                else { this.state.occupied.push(next.x); this.state.score += 100 * (this.level + 1); this.reset(); if (this.state.occupied.length === this.board.shelters.length) this.status = 'won'; }
            }
        }
        if (this.status !== 'playing') this.remainder = 0;
    }
    advance(ms: number): void { this.step(ms); }
    snapshot() { return { specialUses: this.specialUses, specialMs: this.specialMs, ...structuredClone(this.state), board: structuredClone(this.board), level: this.level, seed: this.seed, status: this.status, frames: this.frames, queue: [...this.queue], remainder: Math.max(0, Math.round(this.remainder * 1e8) / 1e8) }; }
}
