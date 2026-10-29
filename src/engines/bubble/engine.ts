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
export interface Cell {
    row: number;
    col: number;
    color: Color;
    kind?: 'stone' | 'bomb' | 'ice' | 'star';
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
// A trace samples the same rest grid at many angles. Keep its geometry once.
const geometryCache = new WeakMap<Cell[], { length: number; drops: number; cells: {cell:Cell;p:Point}[]; occupied:Set<string>; shape:string }>();
const trajectoryCache = new Map<string,Map<number,Trajectory>>();
export class Engine {
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
        return this.grid.length ? [...new Set(this.grid.map(c => c.color))].sort((a, b) => a - b)
            : Array.from({ length: levelAt(this.level).colors }, (_, i) => i as Color);
    }
    setNext(color: Color): void {
        if (!this.availableColors().includes(color)) throw new Error('Invalid color');
        this.next = color;
    }
    /** Validated scenario loading, also useful to level editors. Does not alter shooting rules. */
    load(grid: Cell[], next: Color = 0, seed = this.seed): void {
        const seen = new Set<string>();
        for (const cell of grid) {
            if ((cell.kind !== undefined && !['stone', 'bomb', 'ice', 'star'].includes(cell.kind)) || (cell.ice !== undefined && (cell.kind !== 'ice' || ![1, 2].includes(cell.ice))) || !valid(cell.row, cell.col) || !Number.isInteger(cell.row) || !Number.isInteger(cell.col) || ![0, 1, 2, 3, 4, 5].includes(cell.color) || seen.has(key(cell)))
                throw new Error('Invalid grid');
            seen.add(key(cell));
        }
        if (!Number.isInteger(next) || !(grid.length ? grid.some(c => c.color === next) : next >= 0 && next < levelAt(this.level).colors))
            throw new Error('Invalid color');
        this.drops = 0;
        this.resolved = 0;
        this.seed = seed;
        this.random = new Random(seed);
        this.grid = grid.map(c => ({ ...c }));
        this.next = next;
        this.queued = this.color();
        this.score = 0;
        this.shots = 0;
        this.status = grid.some(c => c.row === ROWS - 1) ? 'lost' : 'playing';
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
            const reflects = reflectionTime < t;
            if (reflects)
                t = reflectionTime;
            const to = { x: from.x + direction.x * t, y: from.y + direction.y * t };
            segments.push({ from: { ...from }, to, direction: { ...direction }, bounce: reflects });
            length += t;
            if (!reflects) {
                const occupied = geometry.occupied;
                const candidates = hit ? neighbors(hit) : Array.from({ length: 9 }, (_, col) => ({ row: 0, col }));
                // Contact is on the struck bubble surface, not at the projectile center.
                const struck = hit ? center(hit, this.drops) : null;
                const contact = struck ? { x: struck.x + (to.x - struck.x) / (2 * CONTACT_SCALE), y: struck.y + (to.y - struck.y) / (2 * CONTACT_SCALE) } : to;
                const free = candidates.filter(c => {
                    if (occupied.has(key(c))) return false;
                    const p = center(c, this.drops);
                    // Only sockets facing the incoming ray; never snap behind the hit.
                    if (struck && ((p.x - struck.x) * direction.x + (p.y - struck.y) * direction.y > 1e-9 || p.y < struck.y - 1e-9)) return false;
                    // The short settling segment must not cross another bubble.
                    return geometry.cells.every(({cell:other,p:q}) => {
                        if (other === hit) return true;
                        const dx = p.x - to.x, dy = p.y - to.y;
                        const fraction = Math.max(0, Math.min(1, ((q.x - to.x) * dx + (q.y - to.y) * dy) / (dx * dx + dy * dy || 1)));
                        return Math.hypot(to.x + fraction * dx - q.x, to.y + fraction * dy - q.y) >= 2 * RADIUS * CONTACT_SCALE - 1e-9;
                    });
                }).sort((a, b) => distance(center(a, this.drops), contact) - distance(center(b, this.drops), contact) || a.row - b.row || a.col - b.col);
                const target = free[0];
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
        this.flight = { trajectory: this.trace(), elapsed: 0, color: this.next };
        this.shots++;
        return true;
    }
    advance(milliseconds: number): Resolution | null {
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
            const adjacent = (struck && struck.kind !== 'stone' && struck.kind !== 'ice' && struck.kind !== 'star' ? struck : undefined) ?? neighbors(target).map(n => this.grid.find(c => key(c) === key(n))).find(c => c && c.kind !== 'stone' && c.kind !== 'ice' && c.kind !== 'star');
            if (adjacent) target.color = adjacent.color;
        }
        this.grid.push(target);
        const connected = this.flood([target], c => c.color === target.color && c.kind !== 'stone' && c.kind !== 'ice' && c.kind !== 'star');
        const popped = connected.length >= 3 ? connected : [];
        // Bomb chains expand only one hex cell per bomb; stone and targets survive blasts.
        for (let i = 0; i < popped.length; i++) {
            const bomb = popped[i];
            if (bomb?.kind !== 'bomb') continue;
            for (const n of neighbors(bomb)) {
                const victim = this.grid.find(c => key(c) === key(n));
                if (victim && victim.kind !== 'stone' && victim.kind !== 'ice' && victim.kind !== 'star' && !popped.includes(victim)) popped.push(victim);
            }
        }
        for (const frozen of this.grid.filter(c => c.kind === 'ice')) {
            if (popped.some(c => neighbors(frozen).some(n => key(n) === key(c)))) {
                frozen.ice = (frozen.ice ?? 2) - 1;
                if (frozen.ice === 0) { delete frozen.kind; delete frozen.ice; }
            }
        }
        const removed = new Set(popped.map(key));
        this.grid = this.grid.filter(c => !removed.has(key(c)));
        const anchored = new Set(this.flood(this.grid.filter(c => c.row === 0), () => true).map(key));
        const fallen = popped.length ? this.grid.filter(c => !anchored.has(key(c))) : [];
        const falling = new Set(fallen.map(key));
        this.grid = this.grid.filter(c => !falling.has(key(c)));
        this.score += popped.length * 10 + fallen.length * 20;
        this.resolved++;
        const won = this.grid.length === 0 || (levelAt(this.level).mechanics?.includes('star') && !this.grid.some(c => c.kind === 'star'));
        if (!won && this.grid.length && this.shotsBeforeDrop === levelAt(this.level).interval && levelAt(this.level).interval > 0) this.drops++;
        this.status = won ? 'won' : this.grid.some(c => c.row === ROWS - 1 || center(c, this.drops).y + RADIUS >= LOSS_LINE) ? 'lost' : 'playing';
        if (this.grid.length) {
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
        return { mechanics: levelAt(this.level).mechanics ?? [], level: this.level, drops: this.drops, resolved: this.resolved, shotsBeforeDrop: this.shotsBeforeDrop, grid: this.grid.map(c => ({ ...c })), score: this.score, status: this.status, next: this.next, queued: this.queued, angle: this.angle, shots: this.shots, seed: this.seed, random: this.random.state, inFlight: this.flight !== null };
    }
}
