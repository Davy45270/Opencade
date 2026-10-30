import { Random } from '../shared/random';
import { MINES, type Mine } from './levels';
export { MINES };
export type { Mine };
/** Pépites: dig through soil, collect nuggets, let boulders fall.
 * Pure, seeded, turn-based on a fixed tick clock. 12 × 16 cells.
 * Tiles: ' ' empty, '.' soil, '#' bedrock, '=' brick, 'o' boulder, '*' nugget,
 * 'E' exit, 'f' firefly (explodes to empty), 'b' moth (explodes to nuggets),
 * 'm' sorting wall (boulders through it become nuggets, nuggets become boulders),
 * 'a' moss (grows; enclosed it turns to nuggets, too large it turns to boulders),
 * 'w' water (spreads down and sideways into empty cells; it drowns the player),
 * 'x' dynamite (fixed; an object falling on it blows a 3 × 3 hole, bricks included),
 * 'g' big nugget (falls and rolls like a nugget, worth three). */
export const W = 12, H = 16;
export type Tile = ' ' | '.' | '#' | '=' | 'o' | '*' | 'E' | 'f' | 'b' | 'm' | 'a' | 'w' | 'x' | 'g';
export type Direction = 'up' | 'down' | 'left' | 'right';
export interface Cell { x: number; y: number }
const vectors: Record<Direction, Cell> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const turnLeft: Record<Direction, Direction> = { up: 'left', left: 'down', down: 'right', right: 'up' };
const turnRight: Record<Direction, Direction> = { up: 'right', right: 'down', down: 'left', left: 'up' };
export interface Enemy { x: number; y: number; kind: 'f' | 'b'; heading: Direction }
export interface State {
    grid: Tile[]; player: Cell; enemies: Enemy[]; falling: number[];
    nuggets: number; score: number; turns: number; timeLeft: number;
    /** Sorting wall: turns of activity left once a falling object first touches it (-1 = dormant). */
    sorting: number;
}
export type Reason = 'crushed' | 'caught' | 'blast' | 'time' | 'drown' | null;
export function mine(level: number): Mine {
    const m = Number.isInteger(level) ? MINES[level] : undefined;
    if (!m) throw new RangeError('Niveau invalide');
    return m;
}
export const index = (x: number, y: number): number => y * W + x;
export function parseMine(rows: readonly string[]): { grid: Tile[]; player: Cell; enemies: Enemy[] } {
    if (rows.length !== H || rows.some(r => r.length !== W)) throw new Error('Dimensions');
    const grid: Tile[] = [], enemies: Enemy[] = [], players: Cell[] = [];
    for (const [y, r] of rows.entries()) for (const [x, c] of Array.from(r).entries()) {
        if ((x === 0 || y === 0 || x === W - 1 || y === H - 1) && c !== '#') throw new Error('Bord ouvert');
        if (c === '@') { players.push({ x, y }); grid.push(' '); continue; }
        if (!' .#=o*Efbmawxg'.includes(c)) throw new Error('Symbole');
        if (c === 'f' || c === 'b') { enemies.push({ x, y, kind: c, heading: 'left' }); grid.push(' '); continue; }
        grid.push(c as Tile);
    }
    const player = players[0];
    if (!player || players.length !== 1 || grid.filter(t => t === 'E').length !== 1) throw new Error('Départ ou sortie');
    return { grid, player, enemies };
}
export const LEVELS = MINES.map((m, i) => ({ name: `${String(i + 1)}. ${m.name}` }));
export class Engine {
    level = 0; seed = 484;
    status: 'playing' | 'won' | 'lost' = 'playing';
    reason: Reason = null;
    /** Events of the last turn: 'dig', 'nugget', 'push', 'fall', 'blast', 'sort', 'moss', 'open'. */
    events: string[] = [];
    specialUses = 1; specialTurns = 0;
    state!: State;
    private random = new Random(484);
    private queue: Direction[] = [];
    private held: Direction | null = null;
    private remainder = 0; private frames = 0;
    constructor(level = 0, seed = 484) { this.loadLevel(level, seed); }
    loadLevel(level: number, seed = 484): void {
        const m = mine(level), p = parseMine(m.rows);
        this.level = level; this.seed = seed; this.random = new Random(seed); this.status = 'playing'; this.reason = null; this.events = [];
        this.specialUses = 1; this.specialTurns = 0; this.queue = []; this.held = null; this.remainder = 0; this.frames = 0;
        this.state = { grid: p.grid, player: p.player, enemies: p.enemies, falling: [], nuggets: 0, score: 0, turns: 0, timeLeft: m.seconds * 1000, sorting: -1 };
    }
    /** Restores a constructed position; later outcomes follow the ordinary rules. */
    loadState(state: State): void { this.state = structuredClone(state); this.status = 'playing'; this.reason = null; this.queue = []; this.held = null; this.remainder = 0; this.frames = 0; }
    get open(): boolean { return this.state.nuggets >= mine(this.level).goal; }
    /** One queued step (tap); at most two pending. */
    input(d: Direction): void { if (this.status === 'playing' && this.queue.length < 2) this.queue.push(d); }
    /** Held direction (keyboard or held button): repeats every turn until released. */
    hold(d: Direction | null): void { this.held = d; }
    /** Prop (étai): boulders, nuggets and creatures stand still for 12 turns. One per mine. */
    special(): boolean {
        if (this.status !== 'playing' || this.specialUses === 0) return false;
        this.specialUses = 0; this.specialTurns = 12; return true;
    }
    at(x: number, y: number): Tile { return x < 0 || y < 0 || x >= W || y >= H ? '#' : this.state.grid[index(x, y)] ?? '#'; }
    private set(x: number, y: number, t: Tile): void { this.state.grid[index(x, y)] = t; }
    private enemyAt(x: number, y: number): Enemy | undefined { return this.state.enemies.find(e => e.x === x && e.y === y); }
    private lose(reason: Reason): void { if (!this.over()) { this.status = 'lost'; this.reason = reason; } }
    /** Status read through a call: rules end the game from inside helper methods. */
    over(): boolean { return this.status !== 'playing'; }
    step(dtMs: number): void {
        if (!Number.isFinite(dtMs) || dtMs < 0) throw new RangeError('Temps invalide');
        if (this.status !== 'playing') return;
        this.remainder += dtMs;
        const period = mine(this.level).turnFrames;
        while (this.remainder + 1e-8 >= 1000 / 60 && !this.over()) {
            this.remainder -= 1000 / 60; this.frames++;
            const left = this.state.timeLeft - 1000 / 60; this.state.timeLeft = left < 1e-7 ? 0 : left;
            if (!this.state.timeLeft) { this.lose('time'); break; }
            if (this.frames >= period) { this.frames = 0; this.turn(); }
        }
        if (this.over()) this.remainder = 0;
    }
    advance(ms: number): void { this.step(ms); }
    /** One whole turn: the player acts, then the world. Public for exact solvers. */
    turn(): void {
        this.events = []; this.state.turns++;
        const d = this.queue.shift() ?? this.held;
        if (d) this.move(d);
        if (this.over()) return;
        // Contact is checked as soon as the player arrives, before the creatures move away.
        this.touchEnemies(); if (this.over()) return;
        if (this.specialTurns > 0) { this.specialTurns--; this.touchEnemies(); return; }
        this.physics(); if (this.over()) return;
        this.creatures(); if (this.over()) return;
        this.moss(); this.water(); if (this.over()) return;
        this.touchEnemies();
    }
    private move(d: Direction): void {
        const s = this.state, v = vectors[d], x = s.player.x + v.x, y = s.player.y + v.y, t = this.at(x, y);
        // Walking into a creature sets it off like any contact.
        const touched = this.enemyAt(x, y);
        if (touched) { this.blast(x, y, touched.kind === 'b' ? '*' : ' '); return; }
        if (t === ' ' || t === '.') { if (t === '.') this.events.push('dig'); this.set(x, y, ' '); s.player = { x, y }; return; }
        if (t === '*' || t === 'g') {
            const worth = t === 'g' ? 3 : 1, before = s.nuggets;
            this.set(x, y, ' '); s.player = { x, y }; s.nuggets += worth; s.score += 10 * worth * (this.level + 1); this.events.push('nugget');
            s.falling = s.falling.filter(i => i !== index(x, y));
            if (before < mine(this.level).goal && s.nuggets >= mine(this.level).goal) this.events.push('open');
            return;
        }
        if (t === 'o' && v.y === 0 && this.at(x + v.x, y) === ' ' && !this.enemyAt(x + v.x, y) && !s.falling.includes(index(x, y))) {
            this.set(x + v.x, y, 'o'); this.set(x, y, ' '); s.player = { x, y }; this.events.push('push'); return;
        }
        if (t === 'E' && this.open) {
            s.player = { x, y }; this.status = 'won';
            s.score += Math.floor(s.timeLeft / 1000) * (this.level + 1);
        }
    }
    /** Bottom-up, left-to-right scan; each object moves at most once per turn. */
    private physics(): void {
        const s = this.state, moved = new Set<number>(), falling: number[] = [];
        for (let y = H - 2; y >= 1; y--) for (let x = 1; x < W - 1; x++) {
            const i = index(x, y), t = this.at(x, y);
            if ((t !== 'o' && t !== '*' && t !== 'g') || moved.has(i)) continue;
            const wasFalling = s.falling.includes(i), below = this.at(x, y + 1);
            const fall = (nx: number, ny: number) => { this.set(x, y, ' '); this.set(nx, ny, t); moved.add(index(nx, ny)); falling.push(index(nx, ny)); };
            if (below === ' ' && !(s.player.x === x && s.player.y === y + 1)) {
                const enemy = this.enemyAt(x, y + 1);
                if (enemy) { if (wasFalling) { this.set(x, y, ' '); this.blast(x, y + 1, enemy.kind === 'b' ? '*' : ' '); } continue; }
                fall(x, y + 1); this.events.push('fall'); continue;
            }
            if (s.player.x === x && s.player.y === y + 1) { if (wasFalling) { this.lose('crushed'); return; } continue; }
            if (below === 'x' && wasFalling) { this.set(x, y, ' '); this.blast(x, y + 1, ' '); if (this.over()) return; continue; }
            if (below === 'm' && wasFalling) {
                if (s.sorting === -1) s.sorting = mine(this.level).sortTurns;
                this.set(x, y, ' ');
                if (s.sorting > 0 && this.at(x, y + 2) === ' ' && !this.enemyAt(x, y + 2) && !(s.player.x === x && s.player.y === y + 2)) { this.set(x, y + 2, t === 'o' ? '*' : 'o'); moved.add(index(x, y + 2)); falling.push(index(x, y + 2)); this.events.push('sort'); }
                continue;
            }
            if (below === 'o' || below === '*' || below === 'g' || below === '=') {
                for (const dx of [-1, 1]) {
                    if (this.at(x + dx, y) === ' ' && this.at(x + dx, y + 1) === ' ' && !this.enemyAt(x + dx, y) && !(s.player.x === x + dx && (s.player.y === y || s.player.y === y + 1))) { fall(x + dx, y); break; }
                }
            }
        }
        s.falling = falling;
        if (s.sorting > 0) s.sorting--;
    }
    private blast(cx: number, cy: number, into: ' ' | '*'): void {
        const s = this.state; this.events.push('blast');
        for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
            const t = this.at(x, y);
            if (t === '#' || t === 'E') continue;
            if (s.player.x === x && s.player.y === y) this.lose('blast');
            const other = this.enemyAt(x, y);
            if (other) s.enemies = s.enemies.filter(e => e !== other);
            this.set(x, y, into);
        }
    }
    /** Fireflies keep their left hand on the wall, moths their right. */
    private creatures(): void {
        const s = this.state;
        for (const e of [...s.enemies]) {
            if (!s.enemies.includes(e)) continue;
            const free = (d: Direction) => { const v = vectors[d], x = e.x + v.x, y = e.y + v.y; return this.at(x, y) === ' ' && !this.enemyAt(x, y); };
            const order = e.kind === 'f' ? [turnLeft[e.heading], e.heading, turnRight[e.heading], turnRight[turnRight[e.heading]]] : [turnRight[e.heading], e.heading, turnLeft[e.heading], turnLeft[turnLeft[e.heading]]];
            const d = order.find(free);
            if (!d) continue;
            const v = vectors[d]; e.x += v.x; e.y += v.y; e.heading = d;
        }
    }
    private moss(): void {
        const s = this.state, m = mine(this.level);
        if (!m.mossEvery) return;
        const cells = s.grid.flatMap((t, i) => t === 'a' ? [i] : []);
        if (!cells.length || s.turns % m.mossEvery !== 0) return;
        const room = cells.flatMap(i => (Object.values(vectors)).map(v => ({ x: i % W + v.x, y: Math.floor(i / W) + v.y })))
            .filter(c => (this.at(c.x, c.y) === ' ' || this.at(c.x, c.y) === '.') && !(c.x === s.player.x && c.y === s.player.y) && !this.enemyAt(c.x, c.y));
        if (!room.length) { for (const i of cells) s.grid[i] = '*'; this.events.push('moss'); return; }
        if (cells.length >= m.mossLimit) { for (const i of cells) s.grid[i] = 'o'; this.events.push('moss'); return; }
        const c = room[Math.floor(this.random.next() * room.length)];
        if (c) { this.set(c.x, c.y, 'a'); this.events.push('moss'); }
    }
    /** Every `waterEvery` turns, one empty cell next to the water (below first, never above) floods. */
    private water(): void {
        const s = this.state, m = mine(this.level);
        if (!m.waterEvery || s.turns % m.waterEvery !== 0) return;
        const frontier: { x: number; y: number }[] = [];
        s.grid.forEach((t, i) => {
            if (t !== 'w') return;
            const x = i % W, y = Math.floor(i / W);
            for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0]] as const) if (this.at(x + dx, y + dy) === ' ' && !this.enemyAt(x + dx, y + dy) && !frontier.some(c => c.x === x + dx && c.y === y + dy)) frontier.push({ x: x + dx, y: y + dy });
        });
        if (!frontier.length) return;
        const low = Math.max(...frontier.map(c => c.y)), choice = frontier.filter(c => c.y === low);
        const c = choice[Math.floor(this.random.next() * choice.length)];
        if (!c) return;
        this.set(c.x, c.y, 'w'); this.events.push('water');
        if (c.x === s.player.x && c.y === s.player.y) this.lose('drown');
    }
    private touchEnemies(): void {
        const s = this.state;
        for (const e of s.enemies) if (Math.abs(e.x - s.player.x) + Math.abs(e.y - s.player.y) <= 1) {
            this.blast(e.x, e.y, e.kind === 'b' ? '*' : ' '); if (this.over()) return;
        }
    }
    /** Exact copy, PRNG included (solvers branch on it). */
    copy(): Engine {
        const e = new Engine(this.level, this.seed);
        e.state = structuredClone(this.state); e.random = new Random(this.random.state); e.status = this.status; e.reason = this.reason;
        e.specialUses = this.specialUses; e.specialTurns = this.specialTurns; e.queue = [...this.queue]; e.held = this.held; e.frames = this.frames; e.remainder = this.remainder;
        return e;
    }
    snapshot() {
        return { ...structuredClone(this.state), level: this.level, seed: this.seed, status: this.status, reason: this.reason, open: this.open,
            specialUses: this.specialUses, specialTurns: this.specialTurns, queue: [...this.queue], held: this.held, frames: this.frames,
            remainder: Math.max(0, Math.round(this.remainder * 1e8) / 1e8), random: this.random.state };
    }
}
