import { LEVELS, type LevelDef } from './levels';
/**
 * Marmaille: a little troop walks straight ahead; the player hands out a limited number of roles so that
 * enough of them reach the exit. Pure and deterministic: no randomness, fixed ticks, grid terrain.
 */
export const COLS = 20;
export const ROWS = 22;
export const TICK_MS = 125;
/** Falling more than this many cells is fatal without a parachute. */
export const FALL_MAX = 5;
export const BUILD_STEPS = 5;
export const ROLES = ['block', 'build', 'dig', 'bash', 'float', 'climb'] as const;
export type Role = typeof ROLES[number];
export type Tile = ' ' | '#' | 'X' | '~';
export type State = 'walk' | 'fall' | 'block' | 'build' | 'dig' | 'bash' | 'climb' | 'saved' | 'dead';
export interface Kid {
    id: number;
    x: number;
    y: number;
    dir: 1 | -1;
    state: State;
    fall: number;
    work: number;
    steps: number;
    float: boolean;
    climber: boolean;
}
export type Status = 'playing' | 'won' | 'lost';
export interface Snapshot {
    level: number;
    tick: number;
    status: Status;
    kids: Kid[];
    spawned: number;
    saved: number;
    dead: number;
    roles: Record<Role, number>;
    tiles: string[];
    score: number;
    timeLeftMs: number;
}
const DIGGABLE = new Set<Tile>(['#']);
export class Engine {
    level = 0;
    seed = 0;
    tick = 0;
    status: Status = 'playing';
    kids: Kid[] = [];
    spawned = 0;
    saved = 0;
    dead = 0;
    roles: Record<Role, number> = { block: 0, build: 0, dig: 0, bash: 0, float: 0, climb: 0 };
    tiles: Tile[][] = [];
    events: string[] = [];
    private carry = 0;
    def: LevelDef = LEVELS[0] as LevelDef;
    constructor(level = 0, seed = 0) { this.loadLevel(level, seed); }
    loadLevel(level: number, seed = 0): void {
        const def = LEVELS[level];
        if (!def || !Number.isInteger(level)) throw new RangeError('Niveau invalide');
        this.def = def; this.level = level; this.seed = seed;
        this.tick = 0; this.status = 'playing'; this.kids = []; this.spawned = 0; this.saved = 0; this.dead = 0; this.carry = 0; this.events = [];
        this.roles = { block: 0, build: 0, dig: 0, bash: 0, float: 0, climb: 0, ...def.roles };
        this.tiles = Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => {
            const c = def.map[y]?.[x] ?? ' ';
            return (c === '#' || c === 'X' || c === '~' ? c : ' ');
        }));
    }
    tile(x: number, y: number): Tile {
        if (x < 0 || x >= COLS) return 'X';
        if (y < 0) return 'X';
        if (y >= ROWS) return ' ';
        return this.tiles[y]?.[x] ?? ' ';
    }
    solid(x: number, y: number): boolean { const t = this.tile(x, y); return t === '#' || t === 'X'; }
    /** Walls for a walker: terrain or a blocker standing there. */
    private wall(x: number, y: number, self: Kid): boolean {
        return this.solid(x, y) || this.kids.some(k => k !== self && k.state === 'block' && k.x === x && k.y === y);
    }
    get timeLeftMs(): number { return Math.max(0, this.def.seconds * 1000 - this.tick * TICK_MS); }
    get score(): number { return this.saved * 100 + (this.status === 'won' ? Math.floor(this.timeLeftMs / 1000) : 0); }
    /** Give a role to a kid. Ground roles need a walker on the ground; parachute and climber can be given anytime. */
    assign(id: number, role: Role): boolean {
        const k = this.kids.find(c => c.id === id);
        if (this.status !== 'playing' || !k || this.roles[role] <= 0 || k.state === 'saved' || k.state === 'dead') return false;
        if (role === 'float') { if (k.float) return false; k.float = true; }
        else if (role === 'climb') { if (k.climber) return false; k.climber = true; }
        else {
            // Ground roles need ground: a walker that has just stepped over the void is already falling.
            if (!this.solid(k.x, k.y + 1)) return false;
            if (k.state !== 'walk' && !(role !== 'block' && ['build', 'dig', 'bash'].includes(k.state))) return false;
            if (k.state === role) return false;
            k.state = role; k.work = 0; k.steps = 0;
        }
        this.roles[role]--;
        this.events.push('role');
        return true;
    }
    step(ms: number): void {
        if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Temps invalide');
        this.carry += ms;
        while (this.carry >= TICK_MS && this.status === 'playing') { this.carry -= TICK_MS; this.update(); }
    }
    advance(ms: number): void { this.step(ms); }
    /** One fixed tick: spawn, then every kid in id order. */
    update(): void {
        if (this.status !== 'playing') return;
        this.tick++;
        if (this.spawned < this.def.count && (this.tick - 1) % this.def.rate === 0) {
            this.kids.push({ id: this.spawned, x: this.def.spawn.x, y: this.def.spawn.y, dir: this.def.dir ?? 1, state: 'fall', fall: 0, work: 0, steps: 0, float: false, climber: false });
            this.spawned++;
        }
        for (const k of this.kids) this.move(k);
        const active = this.kids.filter(k => k.state !== 'saved' && k.state !== 'dead' && k.state !== 'block').length;
        const finished = this.spawned === this.def.count && active === 0;
        if (finished || this.timeLeftMs <= 0) {
            this.status = this.saved >= this.def.needed ? 'won' : 'lost';
            this.events.push(this.status);
        }
    }
    private die(k: Kid): void { k.state = 'dead'; this.dead++; this.events.push('chute'); }
    private arrive(k: Kid): boolean {
        if (k.x === this.def.exit.x && k.y === this.def.exit.y) { k.state = 'saved'; this.saved++; this.events.push('sauvé'); return true; }
        if (this.tile(k.x, k.y) === '~') { this.die(k); return true; }
        return false;
    }
    private move(k: Kid): void {
        if (k.state === 'saved' || k.state === 'dead' || k.state === 'block') return;
        if (k.state === 'climb') { this.climb(k); return; }
        // Gravity first: no ground below means falling, whatever the role (a digger falls into its own hole).
        if (!this.solid(k.x, k.y + 1)) {
            k.state = 'fall';
            k.y++; k.fall++;
            if (k.y >= ROWS) { this.die(k); return; }
            // A fatal fall stays fatal even onto the door: only a survivable fall (or a parachute) is saved in flight.
            if (k.fall <= FALL_MAX || k.float) this.arrive(k);
            else if (this.tile(k.x, k.y) === '~') this.die(k);
            return;
        }
        if (k.state === 'fall') {
            if (k.fall > FALL_MAX && !k.float) { this.die(k); return; }
            k.fall = 0; k.state = 'walk';
            if (this.arrive(k)) return;
        }
        k.fall = 0;
        if (k.state === 'build' || k.state === 'dig' || k.state === 'bash') {
            if (++k.work % 2) return;
            if (k.state === 'build') { this.build(k); return; }
            if (k.state === 'dig') { this.dig(k); return; }
            { this.bash(k); return; }
        }
        this.walk(k);
    }
    private walk(k: Kid): void {
        const nx = k.x + k.dir;
        if (!this.wall(nx, k.y, k)) { k.x = nx; this.arrive(k); return; }
        // A one-cell terrain step is climbed without help; a blocker always turns walkers back.
        if (this.solid(nx, k.y) && !this.wall(nx, k.y - 1, k) && !this.solid(k.x, k.y - 1)) { k.x = nx; k.y--; this.arrive(k); return; }
        // Climbers scale terrain only: a blocker turns them back like everyone else.
        if (k.climber && this.solid(nx, k.y) && !this.solid(k.x, k.y - 1)) { k.state = 'climb'; this.climb(k); return; }
        k.dir = k.dir === 1 ? -1 : 1;
    }
    private climb(k: Kid): void {
        const nx = k.x + k.dir;
        if (!this.solid(nx, k.y)) { k.x = nx; k.state = 'walk'; k.fall = 0; this.arrive(k); return; }
        if (this.solid(k.x, k.y - 1)) { k.dir = k.dir === 1 ? -1 : 1; k.state = 'fall'; k.fall = 0; return; }
        k.y--; this.arrive(k);
    }
    /** Lays one brick ahead at foot level and steps up onto it; five bricks, or until something is in the way. */
    private build(k: Kid): void {
        const nx = k.x + k.dir;
        if (k.steps >= BUILD_STEPS || this.solid(nx, k.y) || this.solid(nx, k.y - 1) || this.solid(k.x, k.y - 1)) { k.state = 'walk'; return; }
        const row = this.tiles[k.y]; if (row) row[nx] = '#';
        k.steps++; k.x = nx; k.y--; this.events.push('brique');
        if (k.steps >= BUILD_STEPS) k.state = 'walk';
    }
    /** Removes the earth below and sinks into it; stops on rock. */
    private dig(k: Kid): void {
        const t = this.tile(k.x, k.y + 1);
        if (!DIGGABLE.has(t)) { k.state = 'walk'; return; }
        const row = this.tiles[k.y + 1]; if (row) row[k.x] = ' ';
        k.y++; this.events.push('pioche');
        if (this.arrive(k)) return;
    }
    /** Removes the earth ahead and walks into the tunnel; stops when nothing is left to dig, turns back on rock. */
    private bash(k: Kid): void {
        const nx = k.x + k.dir, t = this.tile(nx, k.y);
        if (t === 'X') { k.state = 'walk'; k.dir = k.dir === 1 ? -1 : 1; return; }
        if (!DIGGABLE.has(t)) { k.state = 'walk'; this.walk(k); return; }
        const row = this.tiles[k.y]; if (row) row[nx] = ' ';
        k.x = nx; this.events.push('pioche');
        this.arrive(k);
    }
    snapshot(): Snapshot {
        return { level: this.level, tick: this.tick, status: this.status, kids: this.kids.map(k => ({ ...k })), spawned: this.spawned, saved: this.saved, dead: this.dead,
            roles: { ...this.roles }, tiles: this.tiles.map(r => r.join('')), score: this.score, timeLeftMs: this.timeLeftMs };
    }
}
