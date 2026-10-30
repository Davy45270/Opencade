import { Random } from '../shared/random';
export { Random } from '../shared/random';
import { generateLevel, levelAt } from './levels';
/** Pure deterministic geometry and rules. Coordinates are in logical pixels. */
export const RADIUS = 20;
// Effective center separation: 85% of the full diameter lets gap shots through.
export const CONTACT_SCALE = 0.85;
export const LOSS_LINE = 455;
export const WIDTH = 360;
export const ROWS = 13;
export const ROW_STEP = Math.sqrt(3) * RADIUS;
export const ORIGIN = { x: 180, y: 570 };
export type Color = 0 | 1 | 2 | 3 | 4 | 5;
export const KINDS = ['stone', 'bomb', 'ice', 'star', 'leaf', 'crystal', 'prism'] as const;
export type Kind = typeof KINDS[number];
/** Ordinary, bomb and leaf bubbles match and give their colour; the others never do. */
export function matchable(cell: Pick<Cell, 'kind'>): boolean {
    return cell.kind === undefined || cell.kind === 'bomb' || cell.kind === 'leaf';
}
/** Bomb blasts and leaf sweeps destroy anything but stone, ice, stars and fixed crystals. */
function breakable(cell: Pick<Cell, 'kind'>): boolean {
    return cell.kind !== 'stone' && cell.kind !== 'ice' && cell.kind !== 'star' && cell.kind !== 'crystal';
}
export interface Cell {
    row: number;
    col: number;
    color: Color;
    kind?: Kind;
    ice?: number;
}
export interface Point {
    x: number;
    y: number;
}
export interface Segment {
    from: Point;
    to: Point;
    direction: Point;
    bounce: boolean;
}
export interface Trajectory {
    segments: Segment[];
    target: Cell | null;
    length: number;
    struck?: Cell | null;
}
export type Status = 'playing' | 'won' | 'lost';
export interface Resolution {
    popped: Cell[];
    fallen: Cell[];
    attached: Cell | null;
}
/** Odd-row offset coordinates; drops translate y only, never row parity. */
export function center(cell: Pick<Cell, 'row' | 'col'>, drops = 0): Point {
    return { x: RADIUS + cell.col * 2 * RADIUS + (cell.row % 2) * RADIUS, y: RADIUS + (cell.row + drops) * ROW_STEP };
}
const CELL_KEYS = Array.from({length:ROWS},(_,row)=>Array.from({length:9},(_,col)=>`${String(row)}:${String(col)}`));
export function key(cell: Pick<Cell, 'row' | 'col'>): string {
    return CELL_KEYS[cell.row]?.[cell.col] ?? `${String(cell.row)}:${String(cell.col)}`;
}
export function valid(row: number, col: number): boolean {
    return row >= 0 && row < ROWS && col >= 0 && col < (row % 2 ? 8 : 9);
}
const NEIGHBOR_CACHE = new Map<string, readonly { row: number; col: number }[]>();
export function neighbors(cell: Cell): readonly {
    row: number;
    col: number;
}[] {
    const cached = NEIGHBOR_CACHE.get(key(cell));
    if (cached) return cached;
    const left = cell.col - (cell.row % 2 ? 0 : 1);
    const right = left + 1;
    const result = Object.freeze([
        { row: cell.row - 1, col: left }, { row: cell.row - 1, col: right },
        { row: cell.row, col: cell.col - 1 }, { row: cell.row, col: cell.col + 1 },
        { row: cell.row + 1, col: left }, { row: cell.row + 1, col: right },
    ].filter(c => valid(c.row, c.col)).map(c => Object.freeze(c)));
    if (valid(cell.row, cell.col)) NEIGHBOR_CACHE.set(key(cell), result);
    return result;
}
function distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}
/** Largest distance from a hex cell centre to any point of its cell (circumradius). */
export const CELL_REACH = 2 * RADIUS / Math.sqrt(3);
/**
 * Classic hex snapping: the projectile stops where it touches, then settles in the free
 * grid cell whose centre is nearest to its own centre; ties go to the upper, then leftmost
 * cell. At first contact that cell always touches the struck bubble (or the ceiling), so it
 * hangs by construction; B-SNAP-01 checks it rather than filtering for it.
 */
export function snap(at: Point, occupied: ReadonlySet<string>, drops = 0): { row: number; col: number } | null {
    const approx = Math.round((at.y - RADIUS) / ROW_STEP - drops);
    let best: { row: number; col: number } | null = null, bestDistance = Infinity;
    for (let row = Math.max(0, approx - 2); row <= Math.min(ROWS - 1, approx + 2); row++) {
        for (let col = 0; col < (row % 2 ? 8 : 9); col++) {
            const cell = { row, col };
            if (occupied.has(key(cell))) continue;
            const d = distance(center(cell, drops), at);
            if (d < bestDistance - 1e-9) { best = cell; bestDistance = d; }
        }
    }
    return best;
}
// A trace samples the same rest grid at many angles. Keep its geometry once.
const geometryCache = new WeakMap<Cell[], { length: number; drops: number; cells: {cell:Cell;p:Point}[]; occupied:Set<string>; shape:string }>();
const trajectoryCache = new Map<string,Map<number,Trajectory>>();
export class Engine {
    specialUses = 1;
    specialArmed = false;
    specialMs = 0;
    /** Arm the next shot; its first eligible struck group supplies the colour. */
    special(): boolean {
        if (this.status !== 'playing' || this.flight || this.specialUses === 0) return false;
        this.specialUses--; this.specialArmed = true; this.specialMs = 800;
        return true;
    }
    level = 0;
    get rainbow(): boolean { return !!levelAt(this.level).mechanics?.includes('rainbow') && this.shots % 3 === 0; }
    get bumpers(): { x: number; top: number; bottom: number }[] {
        return levelAt(this.level).mechanics?.includes('bumper') ? [{ x: 100, top: 290, bottom: 380 }, { x: 260, top: 290, bottom: 380 }] : [];
    }
    drops = 0;
    resolved = 0;
    get shotsBeforeDrop(): number | null {
        const n = levelAt(this.level).interval;
        return n ? n - this.resolved % n : null;
    }
    loadLevel(index: number, seed = levelAt(index).seed): void {
        levelAt(index);
        this.level = index;
        this.seed = seed;
        this.restart();
    }
    grid: Cell[] = [];
    score = 0;
    status: Status = 'playing';
    next: Color = 0;
    queued: Color = 0;
    angle = 0;
    shots = 0;
    random: Random;
    flight: {
        trajectory: Trajectory;
        elapsed: number;
        color: Color;
    } | null = null;
    last: Resolution = { popped: [], fallen: [], attached: null };
    constructor(public seed = levelAt(0).seed, source?: Engine) {
        this.random = new Random(seed);
        if (source) {
            if (source.flight) throw new Error('Cannot copy during flight');
            // Exact rest-state copy for deterministic lookahead; mutable cells and RNG are isolated.
            Object.assign(this, source, { grid: source.grid.map(c => ({ ...c })), random: this.random });
            this.random.state = source.random.state;
        } else this.restart();
    }
    restart(): void {
        this.random = new Random(this.seed);
        this.specialUses = 1; this.specialArmed = false; this.specialMs = 0;
        this.drops = 0;
        this.resolved = 0;
        this.grid = [];
        this.score = 0;
        this.shots = 0;
        this.angle = 0;
        this.status = 'playing';
        this.flight = null;
        this.last = { popped: [], fallen: [], attached: null };
        this.grid = generateLevel(this.level, this.seed);
        this.next = this.color();
        this.queued = this.color();
    }
    private color(): Color {
        const colors = this.availableColors();
        return colors[Math.floor(this.random.next() * colors.length)] ?? 0;
    }
    private availableColors(): Color[] {
        // Crystals and prisms carry no colour of their own: never deal a colour only they hold.
        const present = [...new Set(this.grid.filter(c => c.kind !== 'crystal' && c.kind !== 'prism').map(c => c.color))].sort((a, b) => a - b);
        return present.length ? present : Array.from({ length: levelAt(this.level).colors }, (_, i) => i as Color);
    }
    setNext(color: Color): void {
        if (!this.availableColors().includes(color)) throw new Error('Invalid color');
        this.next = color;
    }
    /** Validated scenario loading, also useful to level editors. Does not alter shooting rules. */
    load(grid: Cell[], next: Color = 0, seed = this.seed): void {
        const seen = new Set<string>();
        for (const cell of grid) {
            if ((cell.kind !== undefined && !(KINDS as readonly string[]).includes(cell.kind)) || (cell.ice !== undefined && (cell.kind !== 'ice' || ![1, 2].includes(cell.ice))) || !valid(cell.row, cell.col) || !Number.isInteger(cell.row) || !Number.isInteger(cell.col) || ![0, 1, 2, 3, 4, 5].includes(cell.color) || seen.has(key(cell)))
                throw new Error('Invalid grid');
            seen.add(key(cell));
        }
        // Same dealing rule as the PRNG: crystal and prism colours are never offered to the launcher.
        const dealable = grid.filter(c => c.kind !== 'crystal' && c.kind !== 'prism');
        if (!Number.isInteger(next) || !(dealable.length ? dealable.some(c => c.color === next) : next >= 0 && next < levelAt(this.level).colors))
            throw new Error('Invalid color');
        this.specialUses = 1; this.specialArmed = false; this.specialMs = 0;
        this.drops = 0;
        this.resolved = 0;
        this.seed = seed;
        this.random = new Random(seed);
        this.grid = grid.map(c => ({ ...c }));
        this.next = next;
        this.queued = this.color();
        this.score = 0;
        this.shots = 0;
        this.status = grid.some(c => c.row === ROWS - 1 && c.kind !== 'crystal') ? 'lost' : 'playing';
        this.angle = 0;
        this.flight = null;
        this.last = { popped: [], fallen: [], attached: null };
    }
    aim(angle: number): void {
        if (Number.isFinite(angle))
            this.angle = Math.max((10 - 90) * Math.PI / 180, Math.min((170 - 90) * Math.PI / 180, angle));
    }
    swap(): boolean {
        if (this.flight || this.status !== 'playing') return false;
        [this.next, this.queued] = [this.queued, this.next];
        return true;
    }
    trace(angle = this.angle): Trajectory {
        const shape = `${String(this.drops)}:${JSON.stringify(this.bumpers)}:${this.grid.map(key).join(';')}`;
        let geometry = geometryCache.get(this.grid);
        if (!geometry || geometry.length !== this.grid.length || geometry.drops !== this.drops || geometry.shape !== shape) {
            geometry = {length:this.grid.length,drops:this.drops,cells:this.grid.map(cell=>({cell,p:center(cell,this.drops)})),occupied:new Set(this.grid.map(key)),shape};
            geometryCache.set(this.grid,geometry);
        }
        let paths = trajectoryCache.get(geometry.shape);
        if (!paths) {
            paths = new Map();
            if (trajectoryCache.size >= 256) {
                const oldest = trajectoryCache.keys().next().value;
                if (oldest !== undefined) trajectoryCache.delete(oldest);
            }
            trajectoryCache.set(geometry.shape,paths);
        }
        const copy = (path:Trajectory):Trajectory => ({...path,
            segments:path.segments.map(s=>({...s,from:{...s.from},to:{...s.to},direction:{...s.direction}})),
            target:path.target ? {...path.target,color:this.next} : null,
            struck:path.struck ? this.grid.find(c=>key(c) === key(path.struck as Cell)) ?? null : null});
        const cached = paths.get(angle);
        if (cached) return copy(cached);
        const finish = (path:Trajectory):Trajectory => { paths.set(angle,path); return copy(path); };
        let from: Point = { ...ORIGIN };
        let direction = { x: Math.sin(angle), y: -Math.cos(angle) };
        const segments: Segment[] = [];
        let length = 0;
        for (let bounce = 0; bounce < 20; bounce++) {
            const wall = direction.x > 0 ? WIDTH - RADIUS : RADIUS;
            const wallTime = Math.abs(direction.x) < 1e-10 ? Infinity : (wall - from.x) / direction.x;
            let t = (RADIUS + this.drops * ROW_STEP - from.y) / direction.y;
            let hit: Cell | null = null;
            for (const {cell,p} of geometry.cells) {
                const dx = from.x - p.x, dy = from.y - p.y;
                const b = dx * direction.x + dy * direction.y;
                const discriminant = b * b - (dx * dx + dy * dy - (2 * RADIUS * CONTACT_SCALE) ** 2);
                if (discriminant <= 0)
                    continue;
                const candidate = -b - Math.sqrt(discriminant);
                if (candidate >= -1e-7 && candidate < t) {
                    t = Math.max(0, candidate);
                    hit = cell;
                }
            }
            let reflectionTime = wallTime;
            for (const bumper of this.bumpers) {
                const candidate = (bumper.x - from.x) / direction.x;
                const y = from.y + candidate * direction.y;
                if (candidate > 0.000001 && candidate < reflectionTime && y >= bumper.top && y <= bumper.bottom) reflectionTime = candidate;
            }
            // A wall reached at the same instant as a contact or the ceiling does not bounce (no zero-length segment).
            const reflects = reflectionTime < t - 1e-7;
            if (reflects)
                t = reflectionTime;
            const to = { x: from.x + direction.x * t, y: from.y + direction.y * t };
            segments.push({ from: { ...from }, to, direction: { ...direction }, bounce: reflects });
            length += t;
            if (!reflects) {
                const target = snap(to, geometry.occupied, this.drops);
                return finish({ segments, length, struck: hit, target: target ? { ...target, color: this.next } : null });
            }
            from = to;
            direction = { x: -direction.x, y: direction.y };
        }
        return finish({ segments, length, target: null });
    }
    private rainbowShot = false;
    shoot(): boolean {
        if (this.status !== 'playing' || this.flight)
            return false;
        this.rainbowShot = this.rainbow;
        const trajectory = this.trace();
        const struck = trajectory.struck;
        if (this.specialArmed && struck && matchable(struck)) {
            if (trajectory.target) trajectory.target.color = struck.color;
            this.specialMs = 800;
        }
        this.specialArmed = false;
        this.flight = { trajectory, elapsed: 0, color: trajectory.target?.color ?? this.next };
        this.shots++;
        return true;
    }
    advance(milliseconds: number): Resolution | null { return this.step(milliseconds); }
    step(milliseconds: number): Resolution | null {
        if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new RangeError('Temps invalide');
        this.specialMs = Math.max(0, this.specialMs - milliseconds);
        if (!this.flight)
            return null;
        this.flight.elapsed += Math.max(0, milliseconds);
        if (this.flight.elapsed * 0.75 < this.flight.trajectory.length)
            return null;
        const target = this.flight.trajectory.target;
        const struck = this.flight.trajectory.struck;
        this.flight = null;
        if (!target) {
            this.status = 'lost';
            return this.last = { popped: [], fallen: [], attached: null };
        }
        if (this.rainbowShot) {
            const adjacent = (struck && matchable(struck) ? struck : undefined) ?? neighbors(target).map(n => this.grid.find(c => key(c) === key(n))).find(c => c && matchable(c));
            if (adjacent) target.color = adjacent.color;
        }
        this.grid.push(target);
        // Prisms are wild: they join any colour group and pass it on.
        const connected = this.flood([target], c => (c.color === target.color && matchable(c)) || c.kind === 'prism');
        const popped = connected.length >= 3 ? connected : [];
        // Chain reactions: a bomb blasts its six neighbours, a leaf sweeps its whole row;
        // stone, ice, stars and crystals survive both, and new bombs/leaves chain on.
        for (let i = 0; i < popped.length; i++) {
            const source = popped[i];
            if (source?.kind !== 'bomb' && source?.kind !== 'leaf') continue;
            const victims = source.kind === 'bomb'
                ? neighbors(source).map(n => this.grid.find(c => key(c) === key(n)))
                : this.grid.filter(c => c.row === source.row);
            for (const victim of victims) if (victim && breakable(victim) && !popped.includes(victim)) popped.push(victim);
        }
        for (const frozen of this.grid.filter(c => c.kind === 'ice')) {
            if (popped.some(c => neighbors(frozen).some(n => key(n) === key(c)))) {
                frozen.ice = (frozen.ice ?? 2) - 1;
                if (frozen.ice === 0) { delete frozen.kind; delete frozen.ice; }
            }
        }
        const removed = new Set(popped.map(key));
        this.grid = this.grid.filter(c => !removed.has(key(c)));
        // Row 0 and fixed crystals hold everything attached to them; crystals never fall.
        const anchored = new Set(this.flood(this.grid.filter(c => c.row === 0 || c.kind === 'crystal'), () => true).map(key));
        const fallen = popped.length ? this.grid.filter(c => !anchored.has(key(c))) : [];
        const falling = new Set(fallen.map(key));
        this.grid = this.grid.filter(c => !falling.has(key(c)));
        this.score += popped.length * 10 + fallen.length * 20;
        this.resolved++;
        const won = this.grid.every(c => c.kind === 'crystal') || (levelAt(this.level).mechanics?.includes('star') && !this.grid.some(c => c.kind === 'star'));
        if (!won && this.grid.length && this.shotsBeforeDrop === levelAt(this.level).interval && levelAt(this.level).interval > 0) this.drops++;
        this.status = won ? 'won' : this.grid.some(c => c.kind !== 'crystal' && (c.row === ROWS - 1 || center(c, this.drops).y + RADIUS >= LOSS_LINE)) ? 'lost' : 'playing';
        if (this.grid.some(c => c.kind !== 'crystal')) {
            this.next = this.queued;
            if (!this.availableColors().includes(this.next)) this.next = this.color();
            this.queued = this.color();
        }
        this.last = { popped, fallen, attached: target };
        return this.last;
    }
    private flood(starts: Cell[], accept: (cell: Cell) => boolean): Cell[] {
        const cells = new Map(this.grid.map(c => [key(c), c]));
        const found = new Map<string, Cell>();
        const queue = [...starts];
        for (let i = 0; i < queue.length; i++) {
            const cell = queue[i];
            if (!cell || found.has(key(cell)) || !accept(cell))
                continue;
            found.set(key(cell), cell);
            for (const neighbor of neighbors(cell)) {
                const next = cells.get(key(neighbor));
                if (next && !found.has(key(next)))
                    queue.push(next);
            }
        }
        return [...found.values()];
    }
    projectile(): Point | null {
        if (!this.flight)
            return null;
        let travel = this.flight.elapsed * 0.75;
        for (const s of this.flight.trajectory.segments) {
            const length = distance(s.from, s.to);
            if (travel <= length)
                return { x: s.from.x + s.direction.x * travel, y: s.from.y + s.direction.y * travel };
            travel -= length;
        }
        return this.flight.trajectory.segments.at(-1)?.to ?? null;
    }
    snapshot() {
        return { specialUses: this.specialUses, specialArmed: this.specialArmed, specialMs: this.specialMs, mechanics: levelAt(this.level).mechanics ?? [], level: this.level, drops: this.drops, resolved: this.resolved, shotsBeforeDrop: this.shotsBeforeDrop, grid: this.grid.map(c => ({ ...c })), score: this.score, status: this.status, next: this.next, queued: this.queued, angle: this.angle, shots: this.shots, seed: this.seed, random: this.random.state, inFlight: this.flight !== null };
    }
}
