import { Random } from '../shared/random';
import { LAYOUTS, type Cell, type Direction, type Gate, type Layout, type Patrol } from './levels';
export type { Cell, Direction, Gate, Layout, Portal, Current, Patrol } from './levels';
export { LAYOUTS };
const vectors: Record<Direction, Cell> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
export const opposite: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
export const same = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y;
const index = (c: Cell): number => c.y * 15 + c.x;
export function layout(level: number): Layout {
    const data = Number.isInteger(level) ? LAYOUTS[level] : undefined;
    if (!data) throw new RangeError('Niveau invalide');
    return data;
}
export function difficulty(level: number) {
    const l = layout(level);
    return {
        speed: l.speed, goal: l.goal, obstacles: l.barriers.length + l.random, pattern: l.pattern, walls: l.walls,
        portals: l.portals.length, gates: l.gates.length, currents: l.currents.length, patrols: l.patrols.length, prey: l.prey, scissors: l.scissors, timeMs: l.timeMs,
    };
}
export const LEVELS = LAYOUTS.map((l, i) => ({ name: `${String(i + 1)}. ${l.name}` }));
export function neighbor(cell: Cell, direction: Direction, walls: boolean): Cell | null {
    const v = vectors[direction];
    const x = cell.x + v.x, y = cell.y + v.y;
    if (walls && (x < 0 || x >= 15 || y < 0 || y >= 21)) return null;
    return { x: (x + 15) % 15, y: (y + 21) % 21 };
}
/** Back-and-forth position after `moves` snake moves. */
export function patrolAt(p: Patrol, moves: number): Cell {
    const n = p.path.length, cycle = Math.max(1, 2 * n - 2), k = Math.floor(moves / p.every) % cycle;
    return { ...(p.path[k < n ? k : cycle - k] ?? p.path[0] ?? { x: 0, y: 0 }) };
}
export const gateOpen = (g: Gate, ticks: number): boolean => (ticks + g.phase) % g.period < g.open;
/** Next head cell for a level: border rule, then a portal jump keeping the heading. */
export function follow(level: number, cell: Cell, direction: Direction): Cell | null {
    const l = layout(level), next = neighbor(cell, direction, l.walls);
    if (!next) return null;
    for (const p of l.portals) { if (same(next, p.a)) return { ...p.b }; if (same(next, p.b)) return { ...p.a }; }
    return next;
}
/** Arrow on this cell, if any: it imposes the next move. */
export function currentAt(level: number, cell: Cell): Direction | null {
    return layout(level).currents.find(k => same(k.cell, cell))?.direction ?? null;
}
/** Cells that carry a mechanism: never an apple, prey step, bonus or seeded obstacle. */
export function mechanismCells(level: number): Cell[] {
    const l = layout(level);
    return [...l.portals.flatMap(p => [p.a, p.b]), ...l.gates.map(g => g.cell), ...l.currents.map(k => k.cell), ...l.patrols.flatMap(p => p.path)];
}
// Même ordre haut, bas, gauche, droite que neighbor(), pour préserver les tirages.
const adjacency = [false, true].map(walls => Array.from({ length: 315 }, (_, id) => {
    const cell = { x: id % 15, y: Math.floor(id / 15) };
    return (Object.keys(vectors) as Direction[]).flatMap(direction => {
        const next = neighbor(cell, direction, walls);
        return next ? [index(next)] : [];
    });
}));
function flood(start: Cell, blocked: Cell[], walls: boolean): number[] {
    const seen = new Uint8Array(315);
    for (const cell of blocked) seen[index(cell)] = 1;
    const first = index(start);
    seen[first] = 1;
    const queue = [first];
    const neighbors = adjacency[walls ? 1 : 0];
    for (let i = 0; i < queue.length; i++) {
        const id = queue[i];
        if (id === undefined) continue;
        for (const next of neighbors?.[id] ?? []) {
            if (!seen[next]) { seen[next] = 1; queue.push(next); }
        }
    }
    return queue;
}
/** Plain grid reachability (portals are shortcuts, never the only way in). */
export function reachable(start: Cell, blocked: Cell[], walls: boolean): Cell[] {
    return flood(start, blocked, walls).map((id, i) => i === 0 ? start : { x: id % 15, y: Math.floor(id / 15) });
}
export interface State {
    segments: Cell[]; direction: Direction; apple: Cell; obstacles: Cell[];
    eaten: number; score: number; crystal: Cell | null; crystalUntil: number;
    /** Scissors token (halves the body), countdown and prey cadence; optional for older positions. */
    scissors?: Cell | null; timeLeft?: number; preyMoves?: number;
    /** Snake moves since the start: drives the sentries. */
    moves?: number;
}
export type Outcome = 'wall' | 'obstacle' | 'body' | 'gate' | 'patrol' | 'time' | 'full' | null;
export class Engine {
    specialUses = 1;
    specialArmed = false;
    specialMs = 0;
    /** Arm exactly one body crossing; walls, obstacles and closed gates remain lethal. */
    special(): boolean {
        if (this.status !== 'playing' || this.specialUses === 0) return false;
        this.specialUses--; this.specialArmed = true; this.specialMs = 800;
        return true;
    }
    advance(ms: number): void { this.step(ms); }
    level = 0;
    seed = 454;
    status: 'playing' | 'won' | 'lost' = 'playing';
    /** Why the last game ended, and the last mechanism event (for sound and HUD). */
    reason: Outcome = null;
    events: string[] = [];
    state: State = { segments: [], direction: 'right', apple: { x: 0, y: 0 }, obstacles: [], eaten: 0, score: 0, crystal: null, crystalUntil: 0, scissors: null, timeLeft: 0, preyMoves: 0, moves: 0 };
    private random = new Random(454);
    private queue: Direction[] = [];
    private remainder = 0;
    private movement = 0;
    private ticks = 0;
    private nextCrystal = 600;
    constructor(level = 0, seed = 454) { this.loadLevel(level, seed); }
    private reset(): void {
        this.specialUses = 1; this.specialArmed = false; this.specialMs = 0; this.reason = null; this.events = [];
        this.status = 'playing'; this.queue = []; this.remainder = 0; this.movement = 0; this.ticks = 0; this.nextCrystal = 600;
    }
    loadLevel(level: number, seed = 454): void {
        const d = difficulty(level), l = layout(level);
        this.level = level; this.seed = seed; this.random = new Random(seed); this.reset();
        this.state = { segments: [{ x: 7, y: 10 }, { x: 6, y: 10 }, { x: 5, y: 10 }], direction: 'right', apple: { x: 8, y: 10 }, obstacles: l.barriers.map(c => ({ ...c })), eaten: 0, score: 0, crystal: null, crystalUntil: 0, scissors: null, timeLeft: l.timeMs, preyMoves: 0, moves: 0 };
        // Mechanisms, their landing cells and the arrows' exits stay clear of seeded obstacles.
        const reserved = [...mechanismCells(level), ...l.portals.flatMap(p => [p.a, p.b]).flatMap(p => (Object.keys(vectors) as Direction[]).flatMap(v => neighbor(p, v, false) ?? [])),
            ...l.currents.flatMap(k => neighbor(k.cell, k.direction, false) ?? [])];
        const candidates: Cell[] = [];
        for (let y = 0; y < 21; y++) for (let x = 0; x < 15; x++) {
            if (Math.abs(y - 10) <= 2 && x >= 3 && x <= 11) continue;
            if (reserved.some(r => r.x === x && r.y === y) || this.state.obstacles.some(o => o.x === x && o.y === y)) continue;
            const pattern = d.pattern === 0 ? x === 1 || x === 13 || y === 1 || y === 19 : d.pattern === 1 ? x === 7 || y === 10 : d.pattern === 2 ? x % 4 < 2 && y % 5 < 2 : x % 4 === 1 && y % 6 !== 0;
            if (pattern) candidates.push({ x, y });
        }
        while (candidates.length && this.state.obstacles.length < d.obstacles) {
            const [candidate] = candidates.splice(Math.floor(this.random.next() * candidates.length), 1);
            if (!candidate) continue;
            const proposed = [...this.state.obstacles, candidate];
            if (flood(this.state.segments[0] ?? { x: 7, y: 10 }, proposed, d.walls).length === 315 - proposed.length) this.state.obstacles.push(candidate);
        }
        this.state.apple = this.spawn() ?? this.state.apple;
    }
    /** Restores a constructed position; subsequent outcomes use the ordinary rules. */
    loadState(state: State): void {
        this.reset();
        this.state = { scissors: null, timeLeft: layout(this.level).timeMs, preyMoves: 0, moves: 0, ...structuredClone(state) };
    }
    input(direction: Direction): void {
        const previous = this.queue.at(-1) ?? this.state.direction;
        const a = vectors[previous], b = vectors[direction];
        if (this.status !== 'playing' || this.queue.length >= 2 || previous === direction || (a.x + b.x === 0 && a.y + b.y === 0)) return;
        this.queue.push(direction);
    }
    sentries(): Cell[] { return layout(this.level).patrols.map(p => patrolAt(p, this.state.moves ?? 0)); }
    gateClosedAt(cell: Cell): boolean { return layout(this.level).gates.some(g => same(g.cell, cell) && !gateOpen(g, this.ticks)); }
    private occupied(c: Cell): boolean {
        const s = this.state;
        return s.segments.some(v => same(v, c)) || same(c, s.apple) || (!!s.crystal && same(c, s.crystal)) || (!!s.scissors && same(c, s.scissors)) || mechanismCells(this.level).some(m => same(m, c));
    }
    private spawn(): Cell | null {
        const head = this.state.segments[0];
        if (!head) return null;
        const free = reachable(head, [...this.state.obstacles, ...this.state.segments.slice(1)], difficulty(this.level).walls)
            .filter(c => !this.occupied(c));
        return free[Math.floor(this.random.next() * free.length)] ?? null;
    }
    private lose(reason: Outcome): void { this.status = 'lost'; this.reason = reason; }
    step(dtMs: number): void {
        if (!Number.isFinite(dtMs) || dtMs < 0) throw new RangeError('Temps invalide');
        if (this.status === 'playing') this.remainder += dtMs;
        const l = layout(this.level);
        while (this.remainder + 1e-8 >= 1000 / 60 && this.status === 'playing') {
            this.remainder -= 1000 / 60; this.ticks++;
            const remainingDodge = this.specialMs - 1000 / 60;
            this.specialMs = remainingDodge < 0.00000001 ? 0 : remainingDodge;
            if (l.timeMs) {
                const left = (this.state.timeLeft ?? 0) - 1000 / 60;
                this.state.timeLeft = left < 1e-7 ? 0 : left;
                if (!this.state.timeLeft) { this.lose('time'); break; }
            }
            if (this.state.crystal && this.ticks >= this.state.crystalUntil) this.state.crystal = null;
            if (this.ticks >= this.nextCrystal) {
                this.state.crystal = this.spawn(); this.state.crystalUntil = this.ticks + 300;
                this.nextCrystal = this.ticks + 600 + Math.floor(this.random.next() * 300);
            }
            this.movement += l.speed;
            if (this.movement + 1e-8 >= 60) { this.movement -= 60; this.move(); }
        }
        if (this.status !== 'playing') this.remainder = 0;
    }
    private move(): void {
        const head = this.state.segments[0];
        if (!head) return;
        this.events = [];
        const forced = currentAt(this.level, head);
        if (forced) this.state.direction = forced;
        else {
            // A turn queued before an arrow may now point backwards: drop it.
            while (this.queue[0] && this.queue[0] === opposite[this.state.direction]) this.queue.shift();
            this.state.direction = this.queue.shift() ?? this.state.direction;
        }
        const l = layout(this.level);
        const next = follow(this.level, head, this.state.direction);
        if (next && l.portals.length && !same(next, neighbor(head, this.state.direction, l.walls) ?? next)) this.events.push('portal');
        const grows = next !== null && same(next, this.state.apple);
        const body = grows ? this.state.segments : this.state.segments.slice(0, -1);
        if (!next) { this.lose('wall'); return; }
        if (this.state.obstacles.some(c => same(c, next))) { this.lose('obstacle'); return; }
        if (this.gateClosedAt(next)) { this.lose('gate'); return; }
        if (this.sentries().some(c => same(c, next))) { this.lose('patrol'); return; }
        if (body.some(c => same(c, next))) {
            if (!this.specialArmed) { this.lose('body'); return; }
            this.specialArmed = false; this.specialMs = 800;
        }
        this.state.segments.unshift(next);
        if (!grows) this.state.segments.pop();
        this.state.moves = (this.state.moves ?? 0) + 1;
        if (this.sentries().some(p => this.state.segments.some(c => same(c, p)))) { this.lose('patrol'); return; }
        if (currentAt(this.level, next)) this.events.push('current');
        if (this.state.crystal && same(next, this.state.crystal)) { this.state.score += 50 * (this.level + 1); this.state.crystal = null; this.events.push('crystal'); }
        if (this.state.scissors && same(next, this.state.scissors)) {
            this.state.segments.length = Math.max(3, Math.ceil(this.state.segments.length / 2));
            this.state.score += 5 * (this.level + 1); this.state.scissors = null; this.events.push('scissors');
        }
        if (grows) {
            this.state.eaten++; this.state.score += 10 * (this.level + 1); this.state.preyMoves = 0;
            if (this.state.eaten >= l.goal) { this.status = 'won'; return; }
            const apple = this.spawn(); if (apple) this.state.apple = apple; else { this.lose('full'); return; }
        } else if (l.prey) {
            this.state.preyMoves = (this.state.preyMoves ?? 0) + 1;
            if (this.state.preyMoves % l.prey === 0) this.flee();
        }
        if (l.scissors && !this.state.scissors && this.state.segments.length >= 10) this.state.scissors = this.spawn();
    }
    /** The prey steps to a free neighbour strictly farther from the head (ties by PRNG), or stays put. */
    private flee(): void {
        const s = this.state, head = s.segments[0], l = layout(this.level);
        if (!head) return;
        const span = (a: number, b: number, n: number) => { const d = Math.abs(a - b); return l.walls ? d : Math.min(d, n - d); };
        const distance = (c: Cell) => span(c.x, head.x, 15) + span(c.y, head.y, 21);
        const here = distance(s.apple);
        const options = (Object.keys(vectors) as Direction[]).flatMap(d => neighbor(s.apple, d, l.walls) ?? [])
            .filter(c => !s.obstacles.some(o => same(o, c)) && !this.occupied(c) && distance(c) > here);
        if (!options.length) return;
        const best = Math.max(...options.map(distance)), top = options.filter(c => distance(c) === best);
        const pick = top[Math.floor(this.random.next() * top.length)];
        if (pick) { s.apple = pick; this.events.push('flee'); }
    }
    snapshot() { return { specialUses: this.specialUses, specialArmed: this.specialArmed, specialMs: this.specialMs, ...structuredClone(this.state), level: this.level, seed: this.seed, status: this.status, reason: this.reason, queue: [...this.queue], ticks: this.ticks, movement: this.movement, remainder: Math.max(0, Math.round(this.remainder * 1e8) / 1e8), random: this.random.state, nextCrystal: this.nextCrystal }; }
}
