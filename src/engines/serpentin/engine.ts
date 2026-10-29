import { Random } from '../shared/random';
export interface Cell { x: number; y: number }
export type Direction = 'up' | 'down' | 'left' | 'right';
const vectors: Record<Direction, Cell> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
export const same = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y;
const index = (c: Cell): number => c.y * 15 + c.x;
export function difficulty(level: number) {
    if (!Number.isInteger(level) || level < 0 || level > 29) throw new RangeError('Niveau invalide');
    return { speed: 6 + 10 * level / 29, goal: 8 + Math.floor(22 * level / 29), obstacles: Math.floor(40 * level / 29), pattern: Math.floor(level / 8), walls: level % 5 !== 4 };
}
export const LEVELS = Array.from({ length: 30 }, (_, i) => ({ name: `${['Lisière', 'Rayons', 'Archipel', 'Passages'][difficulty(i).pattern] ?? 'Passages'} ${String(i + 1)}` }));
export function neighbor(cell: Cell, direction: Direction, walls: boolean): Cell | null {
    const v = vectors[direction];
    const x = cell.x + v.x, y = cell.y + v.y;
    if (walls && (x < 0 || x >= 15 || y < 0 || y >= 21)) return null;
    return { x: (x + 15) % 15, y: (y + 21) % 21 };
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
export function reachable(start: Cell, blocked: Cell[], walls: boolean): Cell[] {
    return flood(start, blocked, walls).map((id, i) => i === 0 ? start : { x: id % 15, y: Math.floor(id / 15) });
}
export interface State {
    segments: Cell[]; direction: Direction; apple: Cell; obstacles: Cell[];
    eaten: number; score: number; crystal: Cell | null; crystalUntil: number;
}
export class Engine {
    level = 0;
    seed = 454;
    status: 'playing' | 'won' | 'lost' = 'playing';
    state: State = { segments: [], direction: 'right', apple: { x: 0, y: 0 }, obstacles: [], eaten: 0, score: 0, crystal: null, crystalUntil: 0 };
    private random = new Random(454);
    private queue: Direction[] = [];
    private remainder = 0;
    private movement = 0;
    private ticks = 0;
    private nextCrystal = 600;
    constructor(level = 0, seed = 454) { this.loadLevel(level, seed); }
    loadLevel(level: number, seed = 454): void {
        const d = difficulty(level);
        this.level = level; this.seed = seed; this.random = new Random(seed);
        this.status = 'playing'; this.queue = []; this.remainder = 0; this.movement = 0; this.ticks = 0; this.nextCrystal = 600;
        this.state = { segments: [{ x: 7, y: 10 }, { x: 6, y: 10 }, { x: 5, y: 10 }], direction: 'right', apple: { x: 8, y: 10 }, obstacles: [], eaten: 0, score: 0, crystal: null, crystalUntil: 0 };
        const candidates: Cell[] = [];
        for (let y = 0; y < 21; y++) for (let x = 0; x < 15; x++) {
            if (Math.abs(y - 10) <= 2 && x >= 3 && x <= 11) continue;
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
    loadState(state: State): void { this.state = structuredClone(state); this.status = 'playing'; this.queue = []; this.movement = 0; this.remainder = 0; this.ticks = 0; this.nextCrystal = 600; }
    input(direction: Direction): void {
        const previous = this.queue.at(-1) ?? this.state.direction;
        const a = vectors[previous], b = vectors[direction];
        if (this.status !== 'playing' || this.queue.length >= 2 || previous === direction || (a.x + b.x === 0 && a.y + b.y === 0)) return;
        this.queue.push(direction);
    }
    private spawn(): Cell | null {
        const head = this.state.segments[0];
        if (!head) return null;
        const free = reachable(head, [...this.state.obstacles, ...this.state.segments.slice(1)], difficulty(this.level).walls)
            .filter(c => !this.state.segments.some(s => same(s, c)) && !same(c, this.state.apple) && (!this.state.crystal || !same(c, this.state.crystal)));
        return free[Math.floor(this.random.next() * free.length)] ?? null;
    }
    step(dtMs: number): void {
        if (!Number.isFinite(dtMs) || dtMs < 0) throw new RangeError('Temps invalide');
        if (this.status === 'playing') this.remainder += dtMs;
        while (this.remainder + 1e-8 >= 1000 / 60 && this.status === 'playing') {
            this.remainder -= 1000 / 60; this.ticks++;
            if (this.state.crystal && this.ticks >= this.state.crystalUntil) this.state.crystal = null;
            if (this.ticks >= this.nextCrystal) {
                this.state.crystal = this.spawn(); this.state.crystalUntil = this.ticks + 300;
                this.nextCrystal = this.ticks + 600 + Math.floor(this.random.next() * 300);
            }
            this.movement += difficulty(this.level).speed;
            if (this.movement + 1e-8 >= 60) { this.movement -= 60; this.move(); }
        }
        if (this.status !== 'playing') this.remainder = 0;
    }
    private move(): void {
        this.state.direction = this.queue.shift() ?? this.state.direction;
        const head = this.state.segments[0];
        if (!head) return;
        const next = neighbor(head, this.state.direction, difficulty(this.level).walls);
        const grows = next !== null && same(next, this.state.apple);
        const body = grows ? this.state.segments : this.state.segments.slice(0, -1);
        if (!next || this.state.obstacles.some(c => same(c, next)) || body.some(c => same(c, next))) { this.status = 'lost'; return; }
        this.state.segments.unshift(next);
        if (!grows) this.state.segments.pop();
        if (this.state.crystal && same(next, this.state.crystal)) { this.state.score += 50 * (this.level + 1); this.state.crystal = null; }
        if (grows) {
            this.state.eaten++; this.state.score += 10 * (this.level + 1);
            if (this.state.eaten >= difficulty(this.level).goal) this.status = 'won';
            else { const apple = this.spawn(); if (apple) this.state.apple = apple; else this.status = 'lost'; }
        }
    }
    snapshot() { return { ...structuredClone(this.state), level: this.level, seed: this.seed, status: this.status, queue: [...this.queue], ticks: this.ticks, movement: this.movement, remainder: Math.max(0, Math.round(this.remainder * 1e8) / 1e8), random: this.random.state, nextCrystal: this.nextCrystal }; }
}
