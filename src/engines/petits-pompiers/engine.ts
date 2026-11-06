import { Random } from '../shared/random';
import type { CharacterId } from '../../characters/model';
import { LEVELS, WIDTH, HEIGHT, PICKUPS, adjacent, validateLevel, levelAt, type Level, type ObjectiveKind, type Tool } from './levels';
export { LEVELS, WIDTH, HEIGHT };
export const FIXED = 1000 / 60, TILE = 32, RELAXED_MARGIN = 3, FOLLOW_LIMIT = 4, GROWTH_SECONDS = 3;
export type Mode = 'detente' | 'defi';
export interface Intent { dx: number; dy: number; action: boolean; tool: boolean }
export const IDLE: Intent = { dx: 0, dy: 0, action: false, tool: false };
export const ABILITIES: Record<CharacterId, { speed: number; water: number; extra?: Tool }> = {
    panda: { speed: 100, water: 120 }, pandaroux: { speed: 135, water: 80, extra: 'ladder' },
    dragon: { speed: 110, water: 95, extra: 'axe' }, singe: { speed: 125, water: 85, extra: 'kit' },
    licorne: { speed: 105, water: 100, extra: 'megaphone' },
};
export interface Victim {
    id: number; at: number; x: number; y: number; kind: 'person' | 'animal'; species: 'person' | 'cat' | 'dog';
    injured: boolean; hidden: boolean; upper: boolean; following: boolean; saved: boolean; waypoint: number | null;
}
export interface Fire { at: number; intensity: number; units: number; idle?: number }
export type JobKind = 'spray' | 'foam' | 'refill' | 'pickup' | 'deposit' | 'heal' | 'break' | 'climb' | 'call';
export interface Job { kind: JobKind; target: number; remaining: number; elapsed: number }
export interface Event { type: JobKind | 'empty' | 'foam-empty' | 'extinguished' | 'spread' | 'hurt' | 'revealed' | 'rescued' | 'tool' | 'pickup-tool' | 'won' | 'lost' | 'ladder' | 'healed' | 'cleared' | 'climbed' | 'refilled' | 'carried' | 'following'; at: number; value?: number }
export interface Guide { type: ObjectiveKind | 'exit' | 'safe' | 'tool' | 'refill' | 'break' | 'ladder' | 'call'; at: number; tool?: Tool }
export function tileCenter(at: number): { x: number; y: number } { return { x: (at % WIDTH + .5) * TILE, y: (Math.floor(at / WIDTH) + .5) * TILE }; }
export function gridAt(x: number, y: number): number { return Math.floor(y / TILE) * WIDTH + Math.floor(x / TILE); }
export function distance(a: number, b: number): number { return Math.abs(a % WIDTH - b % WIDTH) + Math.abs(Math.floor(a / WIDTH) - Math.floor(b / WIDTH)); }
export class Engine {
    character: CharacterId;
    level: Level = levelAt(0); seed = 28; mode: Mode = 'detente'; random = new Random(28);
    tiles: string[] = []; fires: Fire[] = []; burned: number[] = []; victims: Victim[] = [];
    pickups: { at: number; tool: Tool }[] = []; ladders: number[] = [];
    player = { x: 0, y: 0, dx: 1, dy: 0, water: 120, hearts: 3, immune: 0, carried: -1 };
    tools: Tool[] = ['hose']; selected = 0; charges = 0; cooldown = 0; foamHeld = false;
    job: Job | null = null; events: Event[] = [];
    status: 'playing' | 'won' | 'lost' = 'playing'; ticks = 0; time = 0; remainder = 0; spreadClock = 0; growthClock = 0;
    initialFires = 0; heartsLost = 0; stars = 0;
    progress: Record<ObjectiveKind, number> = { extinguish: 0, rescue_person: 0, rescue_animal: 0, heal: 0 };
    intent: Intent = { ...IDLE }; previous: Intent = { ...IDLE };
    constructor(character: CharacterId = 'panda') { this.character = character; this.loadLevel(0); }
    loadLevel(level: Level | number, seed = 28, mode: Mode = 'detente'): void {
        const def = typeof level === 'number' ? levelAt(level) : level;
        const errors = validateLevel(def); if (errors.length) throw new Error(errors.join(', '));
        this.level = structuredClone(def); this.seed = seed; this.mode = mode; this.random = new Random(seed);
        this.tiles = Array.from(def.map.join('')); this.fires = []; this.burned = []; this.victims = []; this.pickups = []; this.ladders = [];
        const ability = ABILITIES[this.character];
        this.tools = ability.extra ? ['hose', ability.extra] : ['hose']; this.selected = 0; this.charges = 0; this.cooldown = 0; this.foamHeld = false;
        this.job = null; this.events = []; this.status = 'playing'; this.ticks = 0; this.time = 0; this.remainder = 0; this.spreadClock = 0; this.growthClock = 0;
        this.heartsLost = 0; this.stars = 0; this.progress = { extinguish: 0, rescue_person: 0, rescue_animal: 0, heal: 0 };
        this.intent = { ...IDLE }; this.previous = { ...IDLE };
        for (let at = 0; at < this.tiles.length; at++) {
            const c = this.tiles[at] ?? 'W';
            if (c === 'P') this.player = { ...tileCenter(at), dx: 1, dy: 0, water: ability.water, hearts: 3, immune: 0, carried: -1 };
            if (c === 'F') this.fires.push({ at, intensity: def.intensity, units: 0 });
            if ('VCIO?U'.includes(c)) this.victims.push({ id: this.victims.length, at, ...tileCenter(at), kind: 'CO'.includes(c) ? 'animal' : 'person', species: c === 'C' ? 'cat' : c === 'O' ? 'dog' : 'person', injured: c === 'I', hidden: c === '?', upper: c === 'U', following: false, saved: false, waypoint: null });
            const tool = PICKUPS[c]; if (tool) this.pickups.push({ at, tool });
            if ('PFVCIO?alkmf'.includes(c)) this.tiles[at] = c === 'F' ? 'H' : '.';
        }
        this.initialFires = this.fires.length;
    }
    get at(): number { return gridAt(this.player.x, this.player.y); }
    get equipped(): Tool { return this.tools[this.selected] ?? 'hose'; }
    has(tool: Tool): boolean { return this.tools.includes(tool); }
    input(intent: Intent): void {
        if (!Number.isFinite(intent.dx) || !Number.isFinite(intent.dy)) throw new RangeError('Direction');
        this.intent = { dx: Math.max(-1, Math.min(1, intent.dx)), dy: Math.max(-1, Math.min(1, intent.dy)), action: intent.action, tool: intent.tool };
    }
    solid(at: number): boolean { return at < 0 || at >= WIDTH * HEIGHT || 'W~TXbB#U'.includes(this.tiles[at] ?? 'W'); }
    flammable(at: number): boolean { return !this.burned.includes(at) && 'gHXbBT'.includes(this.tiles[at] ?? 'W'); }
    smoky(at: number): boolean { return this.level.smoke && this.fires.some(f => distance(f.at, at) <= 1); }
    private emit(type: Event['type'], at = this.at, value?: number): void { this.events.push({ type, at, ...(value === undefined ? {} : { value }) }); }
    private near(at: number): boolean { return distance(this.at, at) <= 1; }
    private start(kind: JobKind, target: number, seconds: number): void { this.job = { kind, target, remaining: seconds, elapsed: 0 }; this.emit(kind, ['pickup', 'heal', 'climb'].includes(kind) ? this.victims[target]?.at ?? this.at : target, ['pickup', 'heal', 'climb'].includes(kind) ? target : undefined); }
    private accessible(v: Victim): boolean { return !v.saved && !v.hidden && !v.upper && !v.following && v.id !== this.player.carried; }
    /** Contexts use stable victim/row-major order. A selected tool never suppresses a rescue. */
    private action(): void {
        if (this.job) return;
        this.foamHeld = false;
        const safe = this.tiles.indexOf('S');
        if (this.near(safe) && (this.player.carried >= 0 || this.victims.some(v => v.following && distance(v.at, safe) <= 2))) {
            this.start('deposit', safe, this.character === 'singe' ? .15 : .6); return;
        }
        const hurt = this.victims.find(v => this.accessible(v) && v.injured && this.near(v.at));
        if (hurt && this.has('kit')) { this.start('heal', hurt.id, .8); return; }
        // A person takes the firefighter's hand and follows (arbitrage 7-2430: the children walk, Inès rolls);
        // an animal is carried, one at a time.
        const followers = this.victims.filter(v => v.following).length;
        const victim = this.victims.find(v => this.accessible(v) && !v.injured && this.near(v.at) && (v.kind === 'person' ? followers < FOLLOW_LIMIT : this.player.carried < 0));
        if (victim) { this.start('pickup', victim.id, this.character === 'singe' ? .15 : .6); return; }
        const hydrant = this.tiles.findIndex((c, at) => c === 'R' && this.near(at));
        if (hydrant >= 0 && this.player.water < ABILITIES[this.character].water - .01) { this.start('refill', hydrant, 1.5); return; }
        const obstacle = this.tiles.findIndex((c, at) => 'XbB#'.includes(c) && this.near(at));
        if (obstacle >= 0 && (this.has('axe') || this.character === 'dragon' && 'X#'.includes(this.tiles[obstacle] ?? ''))) {
            this.start('break', obstacle, this.character === 'dragon' ? .3 : this.tiles[obstacle] === '#' ? 2 : 1); return;
        }
        const upper = this.victims.find(v => v.upper && !v.saved && this.near(v.at + WIDTH));
        if (upper && this.has('ladder') && this.victims.filter(v => v.following).length < FOLLOW_LIMIT) {
            if (!this.ladders.includes(upper.at)) { this.ladders.push(upper.at); this.emit('ladder', upper.at); }
            this.start('climb', upper.id, this.character === 'pandaroux' ? 1 : 2); return;
        }
        if (this.has('megaphone') && this.victims.some(v => !v.saved && !v.upper && v.kind === 'person' && !v.injured && v.id !== this.player.carried && (v.hidden || !v.following && this.victims.filter(other => other.following).length < FOLLOW_LIMIT && this.path(v.at, [this.at]) !== null) && distance(v.at, this.at) <= 4)) {
            this.start('call', this.at, .4); return;
        }
        if (this.equipped === 'foam') { this.shootFoam(); return; }
        if (!this.player.water) { this.emit('empty'); return; }
        this.start('spray', this.at, 1);
    }
    private shootFoam(): void {
        this.foamHeld = this.charges > 0;
        if (!this.charges) { this.emit('foam-empty'); return; }
        if (this.cooldown > 0) return;
        this.charges--; this.cooldown = .8; this.start('foam', this.at, .3);
    }
    private rescue(v: Victim): void {
        if (v.saved || v.injured) return;
        v.saved = true; v.following = false; v.waypoint = null; this.progress[v.kind === 'person' ? 'rescue_person' : 'rescue_animal']++;
        if (this.player.carried === v.id) this.player.carried = -1;
        this.emit('rescued', v.at, v.id);
    }
    private complete(job: Job): void {
        const victim = this.victims[job.target];
        if (job.kind === 'refill' && this.player.water > ABILITIES[this.character].water - .001) this.player.water = ABILITIES[this.character].water;
        if (job.kind === 'pickup' && victim && !victim.injured && victim.kind === 'person' && !victim.following) { victim.following = true; victim.waypoint = null; this.emit('following', victim.at, victim.id); }
        if (job.kind === 'pickup' && victim && !victim.injured && victim.kind === 'animal' && this.player.carried < 0) { this.player.carried = victim.id; this.emit('carried', victim.at, victim.id); }
        if (job.kind === 'heal' && victim?.injured) { victim.injured = false; this.progress.heal++; this.emit('healed', victim.at, victim.id); }
        if (job.kind === 'break' && 'XbB#'.includes(this.tiles[job.target] ?? 'W')) { this.tiles[job.target] = 'H'; this.emit('cleared', job.target); }
        // Down the ladder, the person stands at its foot and follows.
        if (job.kind === 'climb' && victim?.upper && this.ladders.includes(victim.at)) { victim.upper = false; victim.at += WIDTH; Object.assign(victim, tileCenter(victim.at)); victim.following = true; victim.waypoint = null; this.emit('climbed', victim.at, victim.id); }
        if (job.kind === 'refill') this.emit('refilled', job.target);
        if (job.kind === 'call') this.reassure(4);
        if (job.kind === 'deposit') {
            if (this.player.carried >= 0) { const carried = this.victims[this.player.carried]; if (carried) this.rescue(carried); }
            for (const v of this.victims) if (v.following && distance(v.at, job.target) <= 2) this.rescue(v);
        }
    }
    /** Breadth-first navigation shared by the arrow and the input-only pilot. */
    path(start: number, goals: readonly number[], gates = false, avoidSmoke = false): number[] | null {
        const queue = [start], parents = new Map<number, number>([[start, -1]]), goalSet = new Set(goals);
        for (let cursor = 0; cursor < queue.length; cursor++) {
            const at = queue[cursor]; if (at === undefined) continue;
            if (goalSet.has(at)) {
                const result: number[] = []; let p = at;
                while (p !== start) { result.unshift(p); p = parents.get(p) ?? start; }
                return result;
            }
            for (const p of adjacent(at)) if (!parents.has(p) && (!this.solid(p) || gates && 'XbB#'.includes(this.tiles[p] ?? 'W')) && (!avoidSmoke || !this.smoky(p) || goalSet.has(p))) { parents.set(p, at); queue.push(p); }
        }
        return null;
    }
    private reassure(radius: number): void {
        let count = this.victims.filter(v => v.following).length;
        for (const v of this.victims) {
            if (v.saved || v.upper || v.injured || v.kind !== 'person' || v.id === this.player.carried || distance(v.at, this.at) > radius) continue;
            if (v.hidden) { v.hidden = false; this.emit('revealed', v.at, v.id); }
            if (!v.following && count < FOLLOW_LIMIT && this.path(v.at, [this.at])) { v.following = true; count++; }
        }
    }
    private wet(units: number, range: number): void {
        const { dx, dy } = this.player;
        for (let n = 0; n <= range; n++) {
            const x = Math.floor(this.player.x / TILE) + dx * n, y = Math.floor(this.player.y / TILE) + dy * n;
            if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) break;
            const at = y * WIDTH + x, f = this.fires.find(f => f.at === at);
            if (f) {
                f.idle = 0; f.units += units;
                while (f.units + 1e-8 >= this.level.baseExtinguishUnits && f.intensity > 0) { f.units -= this.level.baseExtinguishUnits; f.intensity--; }
                if (f.intensity <= 0) { this.fires = this.fires.filter(other => other !== f); this.burned.push(at); this.progress.extinguish++; this.emit('extinguished', at); }
                break;
            }
            if (this.solid(at) && n > 0) break;
        }
    }
    private spread(): void {
        for (const f of [...this.fires]) {
            if (this.mode === 'detente' && this.fires.length >= this.initialFires + RELAXED_MARGIN) break;
            const candidates = adjacent(f.at).filter(at => this.flammable(at) && !this.fires.some(other => other.at === at));
            if (!candidates.length) continue;
            const at = candidates[Math.floor(this.random.next() * candidates.length)];
            if (at !== undefined) { this.fires.push({ at, intensity: Math.min(this.level.maxIntensity, 1), units: 0 }); this.emit('spread', at); }
        }
    }
    private canStand(x: number, y: number): boolean {
        const radius = TILE * .21;
        return [ [-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius] ].every(([dx, dy]) => {
            const px = x + (dx ?? 0), py = y + (dy ?? 0);
            return px >= 0 && py >= 0 && px < WIDTH * TILE && py < HEIGHT * TILE && !this.solid(gridAt(px, py));
        });
    }
    private tick(): void {
        const dt = FIXED / 1000; this.ticks++; this.time += FIXED;
        this.player.immune = Math.max(0, this.player.immune - dt); this.cooldown = Math.max(0, this.cooldown - dt);
        const i = this.intent;
        if (i.tool && !this.previous.tool) { this.selected = (this.selected + 1) % this.tools.length; this.emit('tool', this.at, this.selected); }
        if (!this.job && (i.dx || i.dy)) {
            if (Math.abs(i.dx) >= Math.abs(i.dy)) { this.player.dx = Math.sign(i.dx); this.player.dy = 0; }
            else { this.player.dx = 0; this.player.dy = Math.sign(i.dy); }
        }
        if (!i.action || this.equipped !== 'foam') this.foamHeld = false;
        if (i.action && !this.previous.action) this.action();
        else if (i.action && this.foamHeld && !this.job && this.cooldown <= 0) this.shootFoam();
        this.previous = { ...i };
        if (this.job) {
            const job = this.job; job.remaining -= dt; job.elapsed += dt;
            if (job.kind === 'spray' && i.action) job.remaining = Math.max(job.remaining, dt);
            if (job.kind === 'refill') this.player.water = Math.min(ABILITIES[this.character].water, this.player.water + 80 * dt);
            if (job.kind === 'spray') {
                const amount = Math.min(this.player.water, 24 * dt); this.player.water = Math.max(0, this.player.water - amount);
                this.wet(amount * (this.character === 'panda' ? 1 : .9), this.character === 'panda' ? 4 : 3);
                if (this.player.water <= 1e-8) { this.player.water = 0; job.remaining = 0; this.emit('empty'); }
            }
            if (job.kind === 'foam') this.wet(60 * dt, 1);
            if (job.remaining <= 1e-8) { this.complete(job); this.job = null; }
        } else {
            const length = Math.hypot(i.dx, i.dy), carrying = this.player.carried >= 0 && this.character !== 'singe' ? .72 : 1;
            const speed = ABILITIES[this.character].speed * carrying * (this.smoky(this.at) ? .65 : 1) * (this.tiles[this.at] === 's' ? .7 : 1);
            if (length) {
                const x = this.player.x + i.dx / length * speed * dt, y = this.player.y + i.dy / length * speed * dt;
                if (this.canStand(x, this.player.y)) this.player.x = x;
                if (this.canStand(this.player.x, y)) this.player.y = y;
            }
        }
        for (const pickup of [...this.pickups]) if (pickup.at === this.at) {
            if (!this.has(pickup.tool)) this.tools.push(pickup.tool);
            if (pickup.tool === 'foam') this.charges += 6;
            this.pickups = this.pickups.filter(p => p !== pickup); this.emit('pickup-tool', pickup.at);
        }
        if (this.character === 'licorne') this.reassure(3);
        let leader = { x: this.player.x, y: this.player.y };
        for (const v of this.victims) {
            if (v.id === this.player.carried) { v.x = this.player.x; v.y = this.player.y; v.at = this.at; }
            if (!v.following || v.saved) continue;
            const leadAt = gridAt(leader.x, leader.y);
            if (Math.hypot(v.x - leader.x, v.y - leader.y) > TILE * .6) {
                if (v.waypoint === null) {
                    const route = this.path(v.at, [leadAt]);
                    if (route) v.waypoint = route[0] ?? leadAt;
                }
                if (v.waypoint !== null) {
                    const target = tileCenter(v.waypoint);
                    const dx = target.x - v.x, dy = target.y - v.y, d = Math.hypot(dx, dy), amount = Math.min(d, 92 * dt);
                    if (d) { v.x += dx / d * amount; v.y += dy / d * amount; v.at = gridAt(v.x, v.y); }
                    if (amount >= d - 1e-8) v.waypoint = null;
                }
            }
            leader = v;
        }
        if (this.mode === 'defi') {
            this.growthClock = (this.growthClock + dt) % GROWTH_SECONDS;
            for (const f of this.fires) {
                f.idle = (f.idle ?? 0) + dt;
                if (f.idle + 1e-8 >= GROWTH_SECONDS) {
                    f.idle -= GROWTH_SECONDS;
                    f.intensity = Math.min(this.level.maxIntensity, f.intensity + 1);
                }
            }
        }
        if (this.level.spreadIntervalSeconds > 0) {
            this.spreadClock += dt;
            const interval = this.level.spreadIntervalSeconds / (this.mode === 'defi' ? 2 : 1);
            if (this.spreadClock + 1e-8 >= interval) { this.spreadClock -= interval; this.spread(); }
        }
        if (this.mode === 'defi' && this.smoky(this.at) && this.player.immune <= 0) { this.player.hearts--; this.heartsLost++; this.player.immune = 2; this.emit('hurt'); }
        if (this.mode === 'defi' && (this.time >= this.level.seconds * 1000 || this.player.hearts <= 0)) { this.status = 'lost'; this.emit('lost'); }
        else if (this.objectivesDone() && this.tiles[this.at] === 'E') {
            this.status = 'won'; this.stars = Math.min(3, 1 + Number(!this.heartsLost) + Number(!this.fires.length || this.mode === 'defi' && this.time <= this.level.seconds * 700)); this.emit('won');
        }
    }
    step(milliseconds = FIXED): void {
        if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new RangeError('Durée');
        this.events = []; this.remainder += milliseconds;
        while (this.remainder + 1e-8 >= FIXED && this.status === 'playing') { this.remainder -= FIXED; this.tick(); }
        if (this.status !== 'playing') this.remainder = 0;
    }
    objectivesDone(): boolean { return (Object.entries(this.level.objectives) as [ObjectiveKind, number][]).every(([kind, n]) => this.progress[kind] >= n); }
    /** Returns an actionable prerequisite, even when the final target is behind a gate. */
    nextObjective(): Guide {
        const safe = this.tiles.indexOf('S');
        if (this.player.carried >= 0 || this.victims.some(v => v.following && !v.saved)) return { type: 'safe', at: safe };
        const foam = this.pickups.find(p => p.tool === 'foam');
        if (foam) return { type: 'tool', at: foam.at, tool: foam.tool };
        const fire = [...this.fires].sort((a, b) => distance(this.at, a.at) - distance(this.at, b.at) || a.at - b.at)[0];
        if (fire) {
            const needed = Math.min(this.level.baseExtinguishUnits, fire.intensity * this.level.baseExtinguishUnits - fire.units) / (this.character === 'panda' ? 1 : .9);
            if (this.player.water + 1e-8 < needed && !(this.equipped === 'foam' && this.charges)) return { type: 'refill', at: this.tiles.indexOf('R') };
            return { type: 'extinguish', at: fire.at };
        }
        const victim = this.victims.find(v => !v.saved);
        if (victim) {
            const tool: Tool | undefined = victim.upper ? 'ladder' : victim.injured ? 'kit' : victim.hidden ? 'megaphone' : undefined;
            if (tool && !this.has(tool) && !(tool === 'megaphone' && this.character === 'licorne')) {
                const pickup = this.pickups.find(p => p.tool === tool); if (pickup) return { type: 'tool', at: pickup.at, tool };
            }
            const target = victim.upper ? victim.at + WIDTH : victim.at;
            const goals = victim.upper ? [target] : adjacent(target).filter(at => !this.solid(at) || 'XbB#'.includes(this.tiles[at] ?? 'W'));
            if (!this.path(this.at, goals)) {
                const route = this.path(this.at, goals, true), gate = route?.find(at => 'XbB#'.includes(this.tiles[at] ?? 'W'));
                if (gate !== undefined) {
                    if (!this.has('axe') && this.character !== 'dragon') { const pickup = this.pickups.find(p => p.tool === 'axe'); if (pickup) return { type: 'tool', at: pickup.at, tool: 'axe' }; }
                    return { type: 'break', at: gate };
                }
            }
            return { type: victim.upper ? 'ladder' : victim.injured ? 'heal' : victim.hidden ? 'call' : victim.kind === 'person' ? 'rescue_person' : 'rescue_animal', at: target };
        }
        return { type: 'exit', at: this.tiles.indexOf('E') };
    }
    /** Serializable full simulation state; also the scene's read-only automation hook. */
    snapshot() {
        return structuredClone({ character: this.character, level: this.level, seed: this.seed, mode: this.mode, random: this.random.state,
            tiles: this.tiles, fires: this.fires, burned: this.burned, victims: this.victims, pickups: this.pickups, ladders: this.ladders,
            player: this.player, tools: this.tools, selected: this.selected, charges: this.charges, cooldown: this.cooldown, foamHeld: this.foamHeld,
            job: this.job, events: this.events, status: this.status, ticks: this.ticks, time: this.time, remainder: this.remainder,
            spreadClock: this.spreadClock, growthClock: this.growthClock, initialFires: this.initialFires, heartsLost: this.heartsLost, stars: this.stars,
            progress: this.progress, intent: this.intent, previous: this.previous, nextObjective: this.nextObjective() });
    }
}
