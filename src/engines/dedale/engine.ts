import { Random } from '../shared/random';
export const WIDTH = 19, HEIGHT = 23, TICK = 1000 / 60;
export type Direction = 'up' | 'left' | 'down' | 'right';
export type Mode = 'scatter' | 'chase';
export const PRIORITY: readonly Direction[] = ['up', 'left', 'down', 'right'];
const vectors: Record<Direction, readonly [number, number]> = { up: [0, -1], left: [-1, 0], down: [0, 1], right: [1, 0] };
export const opposite: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
export interface Cell { x: number; y: number }
export interface Actor extends Cell { direction: Direction }
export interface Wisp extends Actor { kind: 'tracker' | 'seer' | 'roamer' | 'shy'; returning: boolean; wait: number }
export interface State {
    maze: boolean[]; seeds: number[]; suns: number[]; hero: Actor; wisps: Wisp[];
    requested: Direction; score: number; lives: number; ticks: number; heroClock: number; wispClock: number;
    vulnerable: number; chain: number; mode: Mode; phase: number; modeTime: number; schedule: number[]; grace: number;
}
export function difficulty(level: number) {
    if (!Number.isInteger(level) || level < 0 || level > 29) throw new RangeError('Niveau invalide');
    return { wispRatio: 0.75 + 0.3 * level / 29, vulnerableMs: 8000 - 7000 * level / 29, chaseMs: 12000 + 18000 * level / 29, loopCount: 8 + Math.floor(24 * level / 29) };
}
export const LEVELS = Array.from({ length: 30 }, (_, i) => ({ name: `Dédale ${String(i + 1)}` }));
export const index = (c: Cell): number => c.y * WIDTH + c.x;
export const cell = (i: number): Cell => ({ x: i % WIDTH, y: Math.floor(i / WIDTH) });
export const HOME: Cell = { x: 9, y: 11 }, START: Cell = { x: 9, y: 17 };
export function neighbor(maze: readonly boolean[], c: Cell, direction: Direction): Cell | undefined {
    const [dx, dy] = vectors[direction]; let x = c.x + dx; const y = c.y + dy;
    if (y === 11 && (x < 0 || x >= WIDTH)) x = (x + WIDTH) % WIDTH;
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT || !maze[y * WIDTH + x]) return undefined;
    return { x, y };
}
export function branching(maze: readonly boolean[]): number {
    let vertices = 0, edges = 0;
    for (let i = 0; i < maze.length; i++) if (maze[i]) {
        vertices++;
        for (const d of ['right', 'down'] as const) if (neighbor(maze, cell(i), d)) edges++;
    }
    return edges - vertices + 1;
}
export function generate(level: number, random: Random): boolean[] {
    const maze = Array<boolean>(WIDTH * HEIGHT).fill(false), stack: Cell[] = [{ x: 1, y: 1 }]; maze[20] = true;
    while (stack.length) {
        const c = stack[stack.length - 1]; if (!c) break;
        const options = PRIORITY.map(d => { const [dx, dy] = vectors[d]; return { x: c.x + 2 * dx, y: c.y + 2 * dy }; }).filter(p => p.x > 0 && p.x < WIDTH - 1 && p.y > 0 && p.y < HEIGHT - 1 && !maze[index(p)]);
        const next = options[Math.floor(random.next() * options.length)];
        if (!next) { stack.pop(); continue; }
        maze[index(next)] = true; maze[index({ x: (c.x + next.x) / 2, y: (c.y + next.y) / 2 })] = true; stack.push(next);
    }
    // Raccorder chaque cul-de-sac à un voisin de l'arbre : aucun follet n'est piégé.
    for (let y = 1; y < HEIGHT - 1; y += 2) for (let x = 1; x < WIDTH - 1; x += 2) {
        const c = { x, y };
        if (PRIORITY.filter(d => neighbor(maze, c, d)).length > 1) continue;
        const options = PRIORITY.filter(d => { const [dx, dy] = vectors[d]; return !maze[index({ x: x + dx, y: y + dy })] && x + 2 * dx > 0 && x + 2 * dx < WIDTH - 1 && y + 2 * dy > 0 && y + 2 * dy < HEIGHT - 1; });
        const d = options[Math.floor(random.next() * options.length)];
        if (d) { const [dx, dy] = vectors[d]; maze[index({ x: x + dx, y: y + dy })] = true; }
    }
    const walls: number[] = [];
    for (let y = 1; y < HEIGHT - 1; y++) for (let x = 1; x < WIDTH - 1; x++) if ((x % 2 !== y % 2) && !maze[y * WIDTH + x]) walls.push(y * WIDTH + x);
    for (let n = 0; n < difficulty(level).loopCount && walls.length; n++) { const i = Math.floor(random.next() * walls.length), wall = walls.splice(i, 1)[0]; if (wall !== undefined) maze[wall] = true; }
    maze[11 * WIDTH] = maze[11 * WIDTH + 18] = true;
    return maze;
}
const corners: readonly Cell[] = [{ x: 1, y: 1 }, { x: 17, y: 1 }, { x: 17, y: 21 }, { x: 1, y: 21 }];
const distance = (a: Cell, b: Cell): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export function target(s: State, w: Wisp): Cell {
    if (w.returning) return HOME;
    const corner = corners[['tracker', 'seer', 'roamer', 'shy'].indexOf(w.kind)] ?? HOME;
    if (s.mode === 'scatter') return corner;
    if (w.kind === 'tracker') return s.hero;
    if (w.kind === 'seer') { const [dx, dy] = vectors[s.hero.direction]; return { x: s.hero.x + dx * 3, y: s.hero.y + dy * 3 }; }
    if (w.kind === 'roamer') return Math.floor(s.ticks * TICK / 4000) % 2 ? corner : s.hero;
    return distance(w, s.hero) < 36 ? corner : s.hero;
}
export function choose(s: State, w: Wisp): Direction | undefined {
    const candidates = PRIORITY.filter(d => d !== opposite[w.direction] && neighbor(s.maze, w, d));
    const aim = target(s, w), flee = s.vulnerable > 0 && !w.returning;
    const distances = new Map<number, number>();
    if (w.returning) {
        const queue = [HOME]; distances.set(index(HOME), 0);
        for (let i = 0; i < queue.length; i++) {
            const c = queue[i]; if (!c) continue;
            for (const d of PRIORITY) { const p = neighbor(s.maze, c, d); if (p && !distances.has(index(p))) { distances.set(index(p), (distances.get(index(c)) ?? 0) + 1); queue.push(p); } }
        }
    }
    return candidates.sort((a, b) => {
        const pa = neighbor(s.maze, w, a), pb = neighbor(s.maze, w, b);
        if (w.returning && pa && pb) return (distances.get(index(pa)) ?? Infinity) - (distances.get(index(pb)) ?? Infinity);
        return pa && pb ? (distance(pa, aim) - distance(pb, aim)) * (flee ? -1 : 1) : 0;
    })[0];
}
function wisps(): Wisp[] { return (['tracker', 'seer', 'roamer', 'shy'] as const).map((kind, i) => ({ ...HOME, kind, direction: 'up', returning: false, wait: 2500 + i * 1800 })); }
export class Engine {
    level = 0; seed = 459; state!: State; status: 'playing' | 'won' | 'lost' = 'playing'; events: string[] = [];
    private remainder = 0; private random = new Random(459);
    constructor(level = 0, seed = 459) { this.loadLevel(level, seed); }
    loadLevel(level: number, seed = 459): void {
        const d = difficulty(level); this.level = level; this.seed = seed; this.random = new Random((seed + level * 7919) >>> 0); this.remainder = 0; this.status = 'playing'; this.events = [];
        const maze = generate(level, new Random(seed)), suns = corners.map(index);
        this.state = { maze, suns: [...suns], seeds: maze.flatMap((open, i) => open && !suns.includes(i) ? [i] : []), hero: { ...START, direction: 'left' }, requested: 'left', wisps: wisps(), score: 0, lives: 3, ticks: 0, heroClock: 0, wispClock: 0, vulnerable: 0, chain: 0, mode: 'scatter', phase: 0, modeTime: 0, schedule: Array.from({ length: 8 }, (_, i) => i % 2 ? d.chaseMs + Math.floor(this.random.next() * 1000) : 8000 + Math.floor(this.random.next() * 1000)), grace: 1800 };
    }
    loadState(state: State): void { this.state = structuredClone(state); this.remainder = 0; this.status = 'playing'; this.events = []; }
    input(d: Direction): void { this.state.requested = d; }
    snapshot() { return { ...structuredClone(this.state), level: this.level, seed: this.seed, status: this.status, random: this.random.state, remainder: Math.max(0, Math.round(this.remainder * 1e8) / 1e8) }; }
    private collect(): void {
        const s = this.state, pos = index(s.hero), at = s.seeds.indexOf(pos), sun = s.suns.indexOf(pos);
        if (at >= 0) { s.seeds.splice(at, 1); s.score += 10; this.events.push('seed'); }
        if (sun >= 0) { s.suns.splice(sun, 1); s.score += 50; s.vulnerable = difficulty(this.level).vulnerableMs; s.chain = 0; this.events.push('sun'); }
        if (!s.seeds.length && !s.suns.length) this.status = 'won';
    }
    private collision(beforeHero?: Cell, beforeWisps?: readonly Cell[]): boolean {
        const s = this.state;
        for (const [i, w] of s.wisps.entries()) if (!w.returning && w.wait <= 0 && (index(w) === index(s.hero) || (beforeHero && beforeWisps?.[i] && index(w) === index(beforeHero) && index(s.hero) === index(beforeWisps[i])))) {
            if (s.vulnerable > 0) { s.score += 200 * 2 ** Math.min(3, s.chain++); w.returning = true; this.events.push('wisp'); }
            else if (s.grace <= 0) {
                s.lives--; this.events.push('life');
                if (!s.lives) this.status = 'lost';
                s.hero = { ...START, direction: 'left' }; s.requested = 'left'; s.wisps = wisps(); s.heroClock = s.wispClock = 0; s.grace = 1800; s.vulnerable = s.chain = 0; s.mode = 'scatter'; s.phase = 0; s.modeTime = 0; return true;
            }
        } return false;
    }
    private tick(): void {
        const s = this.state, d = difficulty(this.level); s.ticks++;
        const beforeHero = { ...s.hero }, beforeWisps = s.wisps.map(w => ({ ...w }));
        const wispsDue = s.wispClock + TICK + 1e-8 >= 1000 / (6 * d.wispRatio);
        s.grace = Math.max(0, s.grace - TICK); s.vulnerable = Math.max(0, s.vulnerable - TICK);
        s.modeTime += TICK;
        if (s.modeTime + 1e-8 >= (s.schedule[s.phase] ?? d.chaseMs)) {
            s.modeTime = 0; s.phase++; s.mode = s.mode === 'scatter' ? 'chase' : 'scatter';
            for (const w of s.wisps) w.direction = opposite[w.direction]; this.events.push('mode');
        }
        for (const w of s.wisps) w.wait = Math.max(0, w.wait - TICK);
        s.heroClock += TICK;
        if (s.heroClock + 1e-8 >= 1000 / 6) {
            s.heroClock -= 1000 / 6;
            if (neighbor(s.maze, s.hero, s.requested)) s.hero.direction = s.requested;
            const next = neighbor(s.maze, s.hero, s.hero.direction);
            if (next) { Object.assign(s.hero, next); this.events.push('move'); }
            this.collect();
            if ((!wispsDue && this.collision()) || this.status !== 'playing') return;
        }
        s.wispClock += TICK;
        if (s.wispClock + 1e-8 >= 1000 / (6 * d.wispRatio)) {
            s.wispClock -= 1000 / (6 * d.wispRatio);
            for (const w of s.wisps) {
                if (w.wait > 0) continue;
                if (w.returning && index(w) === index(HOME)) { w.returning = false; w.wait = 2000; continue; }
                const direction = choose(s, w);
                if (direction) { const next = neighbor(s.maze, w, direction); if (next) { Object.assign(w, next); w.direction = direction; } }
            }
            this.collision(beforeHero, beforeWisps);
        }
    }
    step(dtMs: number): void {
        if (!Number.isFinite(dtMs) || dtMs < 0) throw new RangeError('Temps invalide');
        this.events = []; if (this.status === 'playing') this.remainder += dtMs;
        while (this.remainder + 1e-8 >= TICK && this.status === 'playing') { this.remainder -= TICK; this.tick(); }
        if (this.status !== 'playing') this.remainder = 0;
    }
}
