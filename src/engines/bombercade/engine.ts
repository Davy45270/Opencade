import { Random } from '../shared/random';
import { ids, type CharacterId } from '../../characters/model';
import { LEVELS, difficulty, layoutAt, type Mechanic } from './levels';
export { LEVELS, difficulty };
export type Direction = 'up' | 'right' | 'down' | 'left';
export const directions: readonly Direction[] = ['up', 'right', 'down', 'left'];
export const WIDTH = 11, HEIGHT = 13;
export const FIXED = 1000 / 60;
export interface Block { at: number; hp: number; kind: 'normal' | 'reinforced' | 'ice' | 'gold'; drop?: Power }
export type Power = 'range' | 'capacity' | 'speed' | 'special';
export interface Actor {
    id: number; character: CharacterId; at: number; from: number; travel: number; direction: Direction; queued: Direction | null;
    hearts: number; immune: number; shield: number; range: number; capacity: number; speed: number; charges: number;
    joy: number; hurt: number; think: number;
}
export interface Bomb { id: number; at: number; owner: number; character: CharacterId; range: number; fuse: number; slide: Direction | null }
export interface Fire { at: number; owner: number; character: CharacterId; left: number }
export interface Board { walls: number[]; blocks: Block[]; conveyors: { at: number; direction: Direction }[]; portals: number[] }
export interface Intent { direction: Direction | null; bomb: boolean }
export function neighbor(at: number, direction: Direction): number { return at + ({ up: -WIDTH, right: 1, down: WIDTH, left: -1 })[direction]; }
export function distance(a: number, b: number): number { return Math.abs(a % WIDTH - b % WIDTH) + Math.abs(Math.floor(a / WIDTH) - Math.floor(b / WIDTH)); }
const starts = [12, 130, 20, 122, 71];
export class Engine {
    level = 0; seed = 28; status: 'playing' | 'won' | 'lost' = 'playing';
    goldBroken = 0; pendingBomb = 0; ticks = 0; time = 0; score = 0; remainder = 0; nextBomb = 1; ring = 0;
    board: Board = { walls: [], blocks: [], conveyors: [], portals: [] };
    actors: Actor[] = []; bombs: Bomb[] = []; fires: Fire[] = []; pickups: { at: number; kind: Power }[] = [];
    private inTick = false;
    private tickWalls: Set<number> | null = null;
    private tickBlocks: Map<number, Block> | null = null;
    private tickDanger: Map<number, number> | null = null;
    private fixedForecast: Map<number, Bomb> | null = null;
    private slidingForecast: { key: string; ticks: Map<number, number> } | null = null;
    events: string[] = []; random = new Random(28);
    constructor(public character: CharacterId = 'panda') { this.loadLevel(0); }
    has(mechanic: Mechanic): boolean { return LEVELS[this.level]?.mechanics.includes(mechanic) ?? false; }
    loadLevel(index: number, seed = 28): void {
        const d = difficulty(index); this.level = index; this.seed = seed; this.random = new Random(seed);
        this.goldBroken = 0; this.pendingBomb = 0; this.status = 'playing'; this.ticks = 0; this.time = 0; this.score = 0; this.remainder = 0; this.nextBomb = 1; this.ring = 0;
        this.bombs = []; this.fires = []; this.pickups = []; this.events = [];
        this.board = { walls: [], blocks: [], conveyors: [], portals: [] };
        const safe = new Set(starts.flatMap(p => [p, ...directions.map(dir => neighbor(p, dir))]));
        for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
            const at = y * WIDTH + x;
            if (x === 0 || y === 0 || x === WIDTH - 1 || y === HEIGHT - 1 || (x % 2 === 0 && y % 2 === 0)) { this.board.walls.push(at); continue; }
            if (safe.has(at)) continue;
            const plan = index % 6;
            const authored = layoutAt(plan, x, y);
            if (authored || this.random.next() < d.density) {
                const kind = this.has('gold') && (x + y) % 7 === 0 ? 'gold' : this.has('ice') && (x + y) % 5 === 0 ? 'ice' : this.has('reinforced') && (x + y) % 3 === 0 ? 'reinforced' : 'normal';
                const powers: Power[] = this.has('special') ? ['range', 'capacity', 'speed', 'special'] : ['range', 'capacity', 'speed'];
                const drop = this.random.next() < d.drops ? powers[Math.floor(this.random.next() * powers.length)] : undefined;
                this.board.blocks.push({ at, kind, hp: kind === 'reinforced' ? 2 : 1, drop });
            }
        }
        if (this.has('conveyor')) for (const at of [37, 39, 103, 105]) { this.board.blocks = this.board.blocks.filter(b => b.at !== at); this.board.conveyors.push({ at, direction: at < 70 ? 'right' : 'left' }); }
        if (this.has('portal')) { this.board.portals = [34, 108]; this.board.blocks = this.board.blocks.filter(b => !this.board.portals.includes(b.at)); }
        const cast = [this.character, ...ids.filter(id => id !== this.character)];
        this.actors = Array.from({ length: d.opponents + 1 }, (_, id) => ({ id, character: cast[id] ?? 'dragon', at: starts[id] ?? 71, from: starts[id] ?? 71,
            travel: 0, direction: id ? 'up' : 'right', queued: null, hearts: id ? 1 : d.hearts, immune: 0, shield: 0,
            range: 2, capacity: 1, speed: 4, charges: 0, joy: 0, hurt: 0, think: 0 }));
    }
    get player(): Actor { const a = this.actors[0]; if (!a) throw new Error('Joueur absent'); return a; }
    free(at: number, actor?: Actor): boolean {
        return at >= 0 && at < WIDTH * HEIGHT && !(this.tickWalls ? this.tickWalls.has(at) : this.board.walls.includes(at)) && !(this.tickBlocks ? this.tickBlocks.has(at) : this.board.blocks.some(b => b.at === at))
            && !this.bombs.some(b => b.at === at && !(actor && actor.at === at && actor.travel === 0));
    }
    walkable(at: number, actor: Actor): boolean {
        return this.free(at) && !this.actors.some(a => a.id !== actor.id && a.hearts > 0 && (a.at === at || a.travel > 0 && a.from === at));
    }
    input(direction: Direction | null): void { if (this.status === 'playing') this.player.queued = direction; }
    blast(at: number, range: number, only?: Direction): number[] {
        const result = [at];
        for (const dir of only ? [only] : directions) {
            let p = at;
            for (let n = 0; n < range; n++) {
                p = neighbor(p, dir); if ((this.tickWalls ? this.tickWalls.has(p) : this.board.walls.includes(p)) || p < 0 || p >= WIDTH * HEIGHT) break;
                result.push(p); if (this.tickBlocks ? this.tickBlocks.has(p) : this.board.blocks.some(b => b.at === p)) break;
            }
        }
        return result;
    }
    danger(extra?: Bomb): Map<number, number> {
        if (this.inTick && !extra && this.tickDanger) return this.tickDanger;
        const bombs = extra ? [...this.bombs, extra] : this.bombs;
        if (bombs.some(b => b.slide)) {
            this.fixedForecast = null;
            // Forecast the bomb phase on a detached board, including collisions,
            // candy rebounds, chains and blocks removed by earlier explosions.
            const key = JSON.stringify([this.ticks, this.level, this.board.walls, this.board.blocks.map(b => [b.at, b.hp]),
                bombs.map(b => [b.id, b.at, b.range, b.slide, this.ticks + Math.ceil((b.fuse - .000001) / FIXED)]),
                this.actors.filter(a => a.hearts > 0).map(a => [a.at, a.travel > 0 ? a.from : -1])]);
            const merge = (ticks: Map<number, number>): Map<number, number> => {
                const result = new Map([...ticks].map(([at, tick]) => [at, Math.max(0, tick - this.ticks) * FIXED]));
                for (const f of this.fires) result.set(f.at, 0);
                if (this.inTick && !extra) this.tickDanger = result;
                return result;
            };
            if (this.slidingForecast?.key === key) return merge(this.slidingForecast.ticks);
            const map = new Map<number, number>();
            // Actors can vacate before impact (especially after a teleport).
            // Include both the occupied and vacated trajectories conservatively.
            for (const vacated of [false, true]) {
                const forecast = new Engine(this.character); forecast.restore(this.snapshot());
                forecast.bombs = structuredClone(bombs);
                const stops = new Map(bombs.filter(b => b.slide).map(b => [b.id, new Set([b.at])]));
                if (vacated) for (const a of forecast.actors) a.hearts = 0;
                for (let step = 1; forecast.bombs.length && step <= 180; step++) {
                    forecast.ticks++;
                    for (const b of [...forecast.bombs]) {
                        b.fuse -= FIXED;
                        if (b.slide && forecast.ticks % 5 === 0) {
                            const to = neighbor(b.at, b.slide);
                            if (forecast.free(to) && !forecast.actors.some(a => a.hearts && (a.at === to || a.travel > 0 && a.from === to))) b.at = to;
                            else if (forecast.has('candy')) b.slide = directions[(directions.indexOf(b.slide) + 2) % 4] ?? null;
                            else b.slide = null;
                        }
                    }
                    for (const b of forecast.bombs) stops.get(b.id)?.add(b.at);
                    forecast.fires = [];
                    // A moving actor may stop a sliding bomb at any intermediate cell.
                    // Cover every such cross, including after earlier blocks disappear.
                    if (forecast.bombs.some(b => b.fuse <= .000001)) {
                        const crosses = forecast.bombs.map(b => ({ bomb: b, cells: new Set(
                            [...(stops.get(b.id) ?? [b.at])].flatMap(at => forecast.blast(at, b.range))) }));
                        const triggered = new Set(forecast.bombs.filter(b => b.fuse <= .000001).map(b => b.id));
                        // Propagate early chains through every possible stopping position,
                        // not only the position in either detached trajectory.
                        for (let pass = 0; pass < crosses.length; pass++) for (const source of crosses) {
                            if (!triggered.has(source.bomb.id)) continue;
                            for (const target of crosses) if ([...(stops.get(target.bomb.id) ?? [target.bomb.at])].some(at => source.cells.has(at))) triggered.add(target.bomb.id);
                        }
                        for (const { bomb: b, cells } of crosses) if (triggered.has(b.id)) {
                            for (const cell of cells) map.set(cell, Math.min(map.get(cell) ?? Infinity, step * FIXED));
                        }
                    }
                    for (const b of [...forecast.bombs].sort((a, b) => a.id - b.id)) if (b.fuse <= .000001 && forecast.bombs.some(other => other.id === b.id)) forecast.explode(b);
                    for (const f of forecast.fires) map.set(f.at, Math.min(map.get(f.at) ?? Infinity, step * FIXED));
                }
            }
            this.slidingForecast = { key, ticks: new Map([...map].map(([at, time]) => [at, this.ticks + Math.round(time / FIXED)])) };
            return merge(this.slidingForecast.ticks);
        }
        if (this.inTick && !extra && this.fixedForecast) {
            const map = new Map([...this.fixedForecast].map(([at, source]) => [at, source.fuse]));
            for (const fire of this.fires) map.set(fire.at, 0);
            this.tickDanger = map; return map;
        }
        const times = bombs.map(b => b.fuse), sources = [...bombs];
        for (let pass = 0; pass < bombs.length; pass++) bombs.forEach((b, i) => {
            const cells = this.blast(b.at, b.range);
            bombs.forEach((other, j) => {
                if (cells.includes(other.at) && (times[i] ?? 0) < (times[j] ?? 0)) {
                    times[j] = times[i] ?? 0; sources[j] = sources[i] ?? b;
                }
            });
        });
        const map = new Map<number, number>();
        const forecast = new Map<number, Bomb>();
        bombs.forEach((b, i) => { for (const at of this.blast(b.at, b.range)) {
            if ((times[i] ?? 0) < (map.get(at) ?? Infinity)) { map.set(at, times[i] ?? 0); forecast.set(at, sources[i] ?? b); }
        } });
        if (this.inTick && !extra) this.fixedForecast = forecast;
        for (const fire of this.fires) map.set(fire.at, 0);
        if (this.inTick && !extra) this.tickDanger = map;
        return map;
    }
    /** Time-aware breadth first search. A refuge must remain safe for the whole fuse. */
    escape(actor: Actor, extra?: Bomb, variant = 0, forecast = this.danger(extra)): Direction[] | null {
        const order = variant ? [...directions.slice(variant), ...directions.slice(0, variant)] : directions;
        const danger = forecast, seen = new Set([actor.at]);
        const queue: { at: number; path: Direction[] }[] = [{ at: actor.at, path: [] }];
        for (let cursor = 0; cursor < queue.length; cursor++) {
            const node = queue[cursor]; if (!node) continue;
            if (!danger.has(node.at)) return node.path;
            for (const dir of order) {
                const entry = neighbor(node.at, dir), at = this.landing(entry, actor), arrival = (node.path.length + 1 + actor.travel) * 1000 / actor.speed;
                if (seen.has(at) || !this.walkable(entry, actor) || !this.walkable(at, actor) || extra?.at === at || extra?.at === entry || (danger.get(entry) ?? Infinity) <= arrival + 600 || (danger.get(at) ?? Infinity) <= arrival + 600) continue;
                seen.add(at); queue.push({ at, path: [...node.path, dir] });
            }
        }
        return null;
    }
    canBomb(actor: Actor): boolean {
        if (actor.hearts <= 0 || actor.travel > 0 || this.bombs.some(b => b.at === actor.at) || this.bombs.filter(b => b.owner === actor.id).length >= actor.capacity) return false;
        const fake: Bomb = { id: this.nextBomb, at: actor.at, owner: actor.id, character: actor.character, range: actor.range, fuse: 2500, slide: null };
        return this.escape(actor, fake) !== null;
    }
    place(actor = this.player, at = actor.at, bypass = false): boolean {
        if (this.status !== 'playing' || actor.hearts <= 0 || !this.free(at) || this.bombs.some(b => b.at === at) || (!bypass && (actor.travel > 0 || this.bombs.filter(b => b.owner === actor.id).length >= actor.capacity))) return false;
        this.tickDanger = null; this.fixedForecast = null;
        this.bombs.push({ id: this.nextBomb++, at, owner: actor.id, character: actor.character, range: actor.range, fuse: 2500, slide: null });
        this.events.push('place'); return true;
    }
    requestBomb(): void {
        if (this.status !== 'playing') return;
        if (this.player.travel > 0) this.pendingBomb = 500;
        else this.place();
    }
    special(actor = this.player): boolean {
        if (this.status !== 'playing' || !actor.charges || actor.travel > 0 || actor.hearts <= 0) return false;
        const front = neighbor(actor.at, actor.direction);
        switch (actor.character) {
            case 'panda': {
                let at = actor.at; for (let n = 0; n < 3; n++) { at = neighbor(at, actor.direction); if (!this.free(at)) break; this.place(actor, at, true); } break;
            }
            case 'pandaroux': { const bomb = this.bombs.find(b => b.at === front); if (bomb) bomb.slide = actor.direction; break; }
            case 'dragon': this.explode({ id: 0, at: actor.at, owner: actor.id, character: actor.character, range: 6, fuse: 0, slide: null }, actor.direction); break;
            case 'singe': actor.shield = 2000; break;
            case 'licorne': {
                const danger = this.danger(); let at = actor.at;
                for (let n = 0; n < 3; n++) { const next = neighbor(at, actor.direction); if (this.board.walls.includes(next)) break; at = next; }
                const candidates = Array.from({ length: WIDTH * HEIGHT }, (_, p) => p).filter(p => this.walkable(p, actor) && !danger.has(p) && distance(p, actor.at) <= 3);
                candidates.sort((a, b) => distance(a, at) - distance(b, at) || a - b);
                actor.at = candidates[0] ?? actor.at; actor.from = actor.at; break;
            }
        }
        actor.charges--; this.events.push('special'); return true;
    }
    private explode(bomb: Bomb, only?: Direction): void {
        this.tickDanger = null; this.fixedForecast = null;
        this.bombs = this.bombs.filter(b => b.id !== bomb.id);
        const cells = this.blast(bomb.at, bomb.range, only).filter(at => !only || at !== bomb.at);
        this.events.push('explosion');
        for (const at of cells) {
            this.pickups = this.pickups.filter(p => p.at !== at);
            const block = this.board.blocks.find(b => b.at === at);
            if (block) {
                const dx = at % WIDTH - bomb.at % WIDTH, dy = Math.floor(at / WIDTH) - Math.floor(bomb.at / WIDTH);
                const dir: Direction = dx ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up';
                const pushed = neighbor(at, dir);
                if (block.kind === 'ice' && this.free(pushed) && !this.actors.some(a => a.hearts > 0 && (a.at === pushed || a.travel > 0 && a.from === pushed))) { this.tickBlocks?.delete(block.at); block.at = pushed; this.tickBlocks?.set(pushed, block); this.events.push('slide'); }
                else if (--block.hp <= 0) {
                    if (block.kind === 'gold') this.goldBroken++;
                    this.board.blocks = this.board.blocks.filter(b => b !== block); this.tickBlocks?.delete(at); this.score += bomb.owner === 0 ? 10 : 0; this.events.push('block');
                    if (block.drop) this.pickups.push({ at, kind: block.drop });
                }
            }
            this.fires.push({ at, owner: bomb.owner, character: bomb.character, left: 500 });
        }
        const chained = this.bombs.filter(b => cells.includes(b.at)).sort((a, b) => a.id - b.id);
        for (const other of chained) if (this.bombs.some(b => b.id === other.id)) { this.events.push('chain'); this.explode(other); }
    }
    policy(actor: Actor = this.player, bold = false, variant = 0, forecast = this.danger()): Intent {
        const order = variant ? [...directions.slice(variant), ...directions.slice(0, variant)] : directions;
        if (actor.travel > 0) actor = { ...actor, at: this.landing(actor.at, actor) };
        const danger = forecast;
        if (danger.has(actor.at)) {
            const flee = this.escape(actor, undefined, variant, danger);
            return { direction: flee?.[0] ?? null, bomb: false };
        }
        const cells = this.blast(actor.at, actor.range);
        const useful = this.board.blocks.some(b => cells.includes(b.at)) || this.actors.some(a => (actor.id ? a.id === 0 : a.id !== 0) && a.hearts > 0 && cells.includes(a.at));
        if (useful && this.canBomb(actor.travel > 0 ? { ...actor, travel: 0 } : actor)) return { direction: null, bomb: true };
        const goals = this.pickups.map(p => p.at);
        const opponents = this.actors.filter(a => (actor.id ? a.id === 0 : a.id !== 0) && a.hearts > 0);
        const seen = new Set([actor.at]), queue: { at: number; first: Direction | null; steps: number }[] = [{ at: actor.at, first: null, steps: 0 }];
        let best: { direction: Direction | null; score: number } = { direction: null, score: Infinity };
        for (let cursor = 0; cursor < queue.length; cursor++) {
            const node = queue[cursor]; if (!node) continue;
            const target = Math.min(...goals.map(p => distance(node.at, p) - 3), ...opponents.map(a => distance(node.at, a.at)));
            const nodeBlast = this.blast(node.at, actor.range);
            const blocks = this.board.blocks.some(b => nodeBlast.includes(b.at));
            const gold = bold && actor.id === 0 && this.has('gold') && this.board.blocks.some(b => b.kind === 'gold' && nodeBlast.includes(b.at));
            const score = Math.min(target, gold ? -2 : blocks ? 4 : Infinity) + cursor * .002;
            if (node.first && score < best.score && (!danger.has(node.at) || this.escape({ ...actor, at: node.at, travel: actor.travel + node.steps }, undefined, 0, danger) !== null)) best = { direction: node.first, score };
            for (const dir of order) {
                const entry = neighbor(node.at, dir), at = this.landing(entry, actor);
                const arrival = (node.steps + 1 + actor.travel) * 1000 / actor.speed + 800;
                const safe = (p: number): boolean => !danger.has(p) || bold && (danger.get(p) ?? 0) > arrival;
                if (!seen.has(at) && this.walkable(entry, actor) && this.walkable(at, actor) && safe(entry) && safe(at)) { seen.add(at); queue.push({ at, first: node.first ?? dir, steps: node.steps + 1 }); }
            }
        }
        return { direction: best.direction, bomb: false };
    }
    landing(at: number, actor?: Actor): number {
        const free = (p: number): boolean => actor ? this.walkable(p, actor) : this.free(p);
        const portal = this.board.portals.indexOf(at);
        if (portal >= 0) { const to = this.board.portals[1 - portal]; if (to !== undefined && free(to)) at = to; }
        const belt = this.board.conveyors.find(c => c.at === at);
        if (belt && free(neighbor(at, belt.direction))) at = neighbor(at, belt.direction);
        return at;
    }
    private arrive(actor: Actor): void {
        actor.at = this.landing(actor.at, actor);
        const power = this.pickups.find(p => p.at === actor.at);
        if (power) {
            if (power.kind === 'range') actor.range = Math.min(6, actor.range + 1);
            if (power.kind === 'capacity') actor.capacity = Math.min(4, actor.capacity + 1);
            if (power.kind === 'speed') actor.speed = Math.min(6, actor.speed + 1);
            if (power.kind === 'special') actor.charges = 1;
            actor.joy = 700; this.pickups = this.pickups.filter(p => p !== power); if (!actor.id) this.score += 25; this.events.push('power');
        }
    }
    private running(): boolean { return this.status === 'playing'; }
    step(dtMs: number): void {
        if (!Number.isFinite(dtMs) || dtMs < 0) throw new RangeError('Temps');
        this.events = []; if (!this.running()) return;
        this.remainder += dtMs; this.fixedForecast = null;
        this.tickWalls = new Set(this.board.walls); this.tickBlocks = new Map(this.board.blocks.map(b => [b.at, b]));
        while (this.remainder + .000001 >= FIXED && this.running()) { this.remainder = Math.max(0, this.remainder - FIXED); this.tick(); }
        this.tickWalls = null; this.tickBlocks = null;
        if (this.remainder < .000001 || !this.running()) this.remainder = 0;
    }
    private tick(): void {
        this.inTick = true; this.tickDanger = null;
        this.pendingBomb = Math.max(0, this.pendingBomb - FIXED);
        this.ticks++; this.time = this.ticks * FIXED;
        let liveFires = 0;
        for (const fire of this.fires) if ((fire.left -= FIXED) > .000001) this.fires[liveFires++] = fire;
        this.fires.length = liveFires;
        for (const bomb of this.bombs) {
            bomb.fuse -= FIXED;
            if (bomb.slide && this.ticks % 5 === 0) {
                const to = neighbor(bomb.at, bomb.slide);
                if (this.free(to) && !this.actors.some(a => a.hearts && (a.at === to || a.travel > 0 && a.from === to))) bomb.at = to;
                else if (this.has('candy')) bomb.slide = directions[(directions.indexOf(bomb.slide) + 2) % 4] ?? null;
                else bomb.slide = null;
            }
        }
        if (this.bombs.some(b => b.fuse <= .000001)) for (const bomb of [...this.bombs].sort((a, b) => a.id - b.id)) if (bomb.fuse <= .000001 && this.bombs.some(b => b.id === bomb.id)) this.explode(bomb);
        for (const a of this.actors) {
            if (a.hearts <= 0) { a.hurt = Math.max(0, a.hurt - FIXED); continue; }
            a.immune = Math.max(0, a.immune - FIXED); a.shield = Math.max(0, a.shield - FIXED); a.joy = Math.max(0, a.joy - FIXED); a.hurt = Math.max(0, a.hurt - FIXED);
            a.think = Math.max(0, a.think - FIXED);
            if (a.travel > 0) { a.travel = Math.max(0, a.travel - FIXED * a.speed / 1000); if (a.travel < .000001) { a.travel = 0; this.arrive(a); } }
            if (a.id && a.travel === 0) {
                const next = a.queued ? neighbor(a.at, a.queued) : a.at;
                const danger = this.danger();
                const urgentThreat = danger.has(a.at) || danger.has(next) || danger.has(this.landing(next, a));
                if (a.think <= 0 || urgentThreat) {
                    const intent = this.policy(a); a.queued = intent.direction;
                    if (intent.bomb && this.random.next() < (LEVELS[this.level]?.aggression ?? 0)) this.place(a);
                    a.think = 1000 - this.level * 15;
                }
            }
            if (!a.id && a.travel === 0 && this.pendingBomb > 0) { this.place(a); this.pendingBomb = 0; }
            if (a.travel === 0 && a.queued) {
                const to = neighbor(a.at, a.queued);
                const pushed = this.bombs.find(b => b.at === to);
                if (pushed && this.has('candy')) pushed.slide = a.queued;
                if (this.walkable(to, a)) { a.direction = a.queued; a.from = a.at; a.at = to; a.travel = 1; }
            }
            const hit = this.fires.find(f => f.at === a.at || (a.travel > .5 && f.at === a.from));
            if (hit && a.immune < .000001 && a.shield < .000001) {
                a.hearts--; a.immune = 2000; a.hurt = 700; this.events.push(a.id === 0 ? 'life' : 'hit');
                if (a.hearts === 0 && hit.owner === 0 && a.id !== 0) this.score += 200;
            }
        }
        const deadline = LEVELS[this.level]?.deadline ?? 0;
        if (this.time >= deadline) {
            if (!this.has('sudden')) { this.player.hearts = 0; }
            else {
                const ring = Math.min(6, 1 + Math.floor((this.time - deadline) / 4000));
                this.fixedForecast = null;
                while (this.ring < ring) {
                    this.ring++;
                    for (let at = 0; at < WIDTH * HEIGHT; at++) {
                        const edge = Math.min(at % WIDTH, WIDTH - 1 - at % WIDTH, Math.floor(at / WIDTH), HEIGHT - 1 - Math.floor(at / WIDTH));
                        if (edge === this.ring) { if (!this.board.walls.includes(at)) this.board.walls.push(at); this.tickWalls?.add(at); for (const a of this.actors) if (a.at === at) a.hearts = 0; }
                    }
                    this.events.push('shrink');
                }
            }
        }
        if (this.player.hearts <= 0) { this.status = 'lost'; this.events.push('lost'); }
        else if (this.actors.slice(1).every(a => a.hearts <= 0) || (this.has('gold') && !this.board.blocks.some(b => b.kind === 'gold'))) {
            this.status = 'won'; this.score += Math.max(0, Math.floor((deadline - this.time) / 1000)); this.events.push('won');
        }
        this.inTick = false; this.tickDanger = null;
    }
    advance(ms: number): void { this.step(ms); }
    snapshot() {
        return structuredClone({ level: this.level, seed: this.seed, character: this.character, status: this.status, ticks: this.ticks, time: this.time, score: this.score,
            goldBroken: this.goldBroken, pendingBomb: this.pendingBomb, remainder: this.remainder, nextBomb: this.nextBomb, ring: this.ring, random: this.random.state, board: this.board,
            actors: this.actors, bombs: this.bombs, fires: this.fires, pickups: this.pickups });
    }
    restore(state: ReturnType<Engine['snapshot']>): void { const copy = structuredClone(state); const { random, ...rest } = copy; Object.assign(this, rest); this.random = new Random(random);
        this.slidingForecast = null; this.fixedForecast = null; this.tickDanger = null;
        this.tickWalls = null; this.tickBlocks = null; this.inTick = false;
    }
}
