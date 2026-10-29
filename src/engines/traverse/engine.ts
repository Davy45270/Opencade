import { Random } from '../shared/random';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type Action = Direction | 'wait';
export interface Cell { x: number; y: number }
export interface Lane { y: number; kind: 'road' | 'river'; direction: number; offset: number; diver: boolean }
export interface Board { lanes: Lane[]; shelters: number[] }
export interface State { player: Cell; previous: Cell; lives: number; occupied: number[]; time: number; phase: number; score: number }
export function difficulty(level: number) {
    if (!Number.isInteger(level) || level < 0 || level > 29) throw new RangeError('Niveau invalide');
    return { flowFrames: 30 - Math.floor(17 * level / 29), spacing: 6 - Math.floor(2 * level / 29), logLength: 8 - Math.floor(3 * level / 29), diveDuration: level < 9 ? 0 : 1 + Math.floor((level - 9) / 5), timeMs: 60000 - 1000 * level, shelters: 3 + Math.floor(level / 10), mixedLanes: 1 + Math.floor(level / 5) };
}
export const LEVELS = Array.from({ length: 30 }, (_, i) => ({ name: `Confluence ${String(i + 1)}` }));
const mod = (n: number, d: number): number => ((n % d) + d) % d;
export function generate(level: number, seed: number): Board {
    // Curated traffic layouts, measured offline with the space-time BFS.
    // These salts only select PRNG streams; collision rules never use proof metrics.
    const streams = [8,33,4,0,13,1,85,23,7,17,58,136,32,10,117,295,132,160,89,264,183,233,34,337,12,264,480,137,120,623];
    const d = difficulty(level), r = new Random(seed + (streams[level] ?? 0) + level * 7919);
    const rows = Array.from({ length: 12 }, (_, i) => i + 2);
    // Sample without replacement: safe banks and the road/river boundary vary too.
    for (let i = rows.length - 1; i > 0; i--) {
        const j = Math.floor(r.next() * (i + 1));
        const a = rows[i], b = rows[j];
        if (a !== undefined && b !== undefined) [rows[i], rows[j]] = [b, a];
    }
    const lanes = rows.slice(0, 8).sort((a, b) => a - b).map((y, i): Lane => ({
        y, kind: i < 5 ? 'river' : 'road', direction: i < d.mixedLanes ? (i % 2 ? -1 : 1) : (r.next() < .5 ? -1 : 1),
        offset: Math.floor(r.next() * 9), diver: i < 5 && r.next() < .4,
    }));
    return { shelters: d.shelters === 3 ? [1, 4, 7] : d.shelters === 4 ? [0, 3, 5, 8] : [0, 2, 4, 6, 8], lanes };
}
export function submerged(lane: Lane, phase: number, level: number): boolean {
    return lane.diver && mod(phase + lane.offset, 18) < difficulty(level).diveDuration;
}
export function filled(lane: Lane, x: number, phase: number, level: number): boolean {
    const d = difficulty(level);
    const position = x - lane.offset - phase * lane.direction;
    return lane.kind === 'road' ? mod(position, d.spacing) < 2 : !submerged(lane, phase, level) && mod(position, 9) < d.logLength;
}
export function safe(board: Board, cell: Cell, phase: number, level: number): boolean {
    if (cell.x < 0 || cell.x > 8 || cell.y < 0 || cell.y > 14) return false;
    if (cell.y === 0) return board.shelters.includes(cell.x);
    const lane = board.lanes.find(l => l.y === cell.y);
    return !lane || (lane.kind === 'road' ? !filled(lane, cell.x, phase, level) : filled(lane, cell.x, phase, level));
}
const vectors: Record<Action, Cell> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, wait: { x: 0, y: 0 } };
/** One command, contact, then lane movement and a second contact. Shared by the search and simulation. */
export function transition(board: Board, player: Cell, phase: number, action: Action, level: number): Cell | null {
    const v = vectors[action];
    const next = { x: Math.max(0, Math.min(8, player.x + v.x)), y: Math.max(0, Math.min(14, player.y + v.y)) };
    if (!safe(board, next, phase, level)) return null;
    if (next.y === 0) return next;
    const lane = board.lanes.find(l => l.y === next.y);
    if (lane?.kind === 'river') next.x += lane.direction;
    return safe(board, next, phase + 1, level) ? next : null;
}
export class Engine {
    level = 0; seed = 28; board: Board = generate(0, 28);
    status: 'playing' | 'won' | 'lost' = 'playing';
    state: State = { player: { x: 4, y: 14 }, previous: { x: 4, y: 14 }, lives: 3, occupied: [], time: 60000, phase: 0, score: 0 };
    private remainder = 0; private frames = 0; private queue: Direction[] = [];
    constructor(level = 0, seed = 28) { this.loadLevel(level, seed); }
    loadLevel(level: number, seed = 28): void {
        const d = difficulty(level); this.level = level; this.seed = seed; this.board = generate(level, seed); this.status = 'playing'; this.remainder = 0; this.frames = 0; this.queue = [];
        this.state = { player: { x: 4, y: 14 }, previous: { x: 4, y: 14 }, lives: 3, occupied: [], time: d.timeMs, phase: 0, score: 0 };
    }
    /** Serializable scenario position; no collision or terminal rule is altered. */
    loadState(state: State): void { this.state = structuredClone(state); this.status = 'playing'; this.queue = []; this.frames = 0; this.remainder = 0; }
    input(direction: Direction): void { if (this.status === 'playing') this.queue.push(direction); }
    private reset(): void { this.state.player = { x: 4, y: 14 }; this.state.previous = { ...this.state.player }; this.state.time = difficulty(this.level).timeMs; this.queue = []; }
    private life(): void { this.state.lives--; this.reset(); if (this.state.lives === 0) this.status = 'lost'; }
    step(dtMs: number): void {
        if (!Number.isFinite(dtMs) || dtMs < 0) throw new RangeError('Temps invalide');
        if (this.status !== 'playing') return;
        this.remainder += dtMs;
        while (this.remainder + 1e-8 >= 1000 / 60 && this.status === 'playing') {
            this.remainder -= 1000 / 60; this.frames++; this.state.time -= 1000 / 60;
            if (this.state.time < 1e-7) { this.life(); continue; }
            if (this.frames < difficulty(this.level).flowFrames) continue;
            this.frames = 0;
            const next = transition(this.board, this.state.player, this.state.phase, this.queue.shift() ?? 'wait', this.level);
            this.state.phase++;
            this.state.previous = { ...this.state.player };
            if (!next) { this.life(); continue; }
            this.state.player = next;
            if (next.y === 0) {
                if (this.state.occupied.includes(next.x)) this.life();
                else { this.state.occupied.push(next.x); this.state.score += 100 * (this.level + 1); this.reset(); if (this.state.occupied.length === this.board.shelters.length) this.status = 'won'; }
            }
        }
        if (this.status !== 'playing') this.remainder = 0;
    }
    snapshot() { return { ...structuredClone(this.state), board: structuredClone(this.board), level: this.level, seed: this.seed, status: this.status, frames: this.frames, queue: [...this.queue], remainder: Math.max(0, Math.round(this.remainder * 1e8) / 1e8) }; }
}
