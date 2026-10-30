import { Random } from '../shared/random';
export function required<T>(value: T | undefined): T {
    if (value === undefined) throw new Error('Élément requis');
    return value;
}
export const STEP = 1000 / 60;
export const LIMITS = { vx: 0.6, vy: 1.2, angle: 10 * Math.PI / 180 };
export { LEVELS } from './levels';
import { LEVELS, type Mechanic } from './levels';
import { LEVELS_107 } from './levels-107';
export interface Point { x: number; y: number }
export interface Pad { x: number; y: number; width: number; multiplier: number; role?: 'arrival' | 'service' }
export interface Controls { thrust: boolean; left: boolean; right: boolean }
export function difficulty(level: number) {
    const l = required(LEVELS[Math.max(0, Math.min(29, Math.floor(level)))]);
    return { width: l.width, relief: 20, wind: 0, gust: 0, gravity: 0.018, fuel: l.fuel, offset: Math.abs(l.spawn - l.x - l.width / 2) };
}
export function generate(level: number, seed: number) {
    const l = required(LEVELS[level]), r = new Random(seed);
    const pad: Pad = { x: l.x, y: l.y, width: l.width, multiplier: 1, role: 'arrival' };
    const pads = [pad];
    if (l.mechanics.includes('choix')) pads.push({ x: 35, y: l.y, width: 60, multiplier: 2, role: 'arrival' });
    if (l.mechanics.some(m => ['cargo', 'ravitaillement'].includes(m))) pads.push({ x: l.service[0] - 45, y: l.service[1], width: 90, multiplier: 1, role: 'service' });
    const points: Point[] = [{ x: 0, y: 570 + r.next() * 8 }];
    // Suspended docks leave the space beneath them navigable for return climbs.
    points.push({ x: 360, y: 570 + r.next() * 8 });
    return { points, pads };
}
/** Local fields have closed coordinate bounds and literal strengths. */
export function fieldAt(mechanics: readonly Mechanic[], x: number, y: number, tick: number) {
    const gravity = mechanics.includes('gravite') && x >= 110 && x <= 300 && y >= 180 && y <= 440 ? 0.009 : 0.018;
    const wind = mechanics.includes('tunnel') && y >= 240 && y <= 380 ? 0.0015 : 0;
    const lift = mechanics.includes('geyser') && x >= 130 && x <= 230 && y >= 300 && y <= 480 && tick % 240 < 180 ? 0.012 : 0;
    return { gravity, wind, lift };
}
export function movingOffset(tick: number): number {
    const phase = tick % 480;
    return phase < 240 ? phase * 0.05 : (480 - phase) * 0.05;
}
export function meteorAt(tick: number): Point {
    return { x: -100 + (tick % 600) * 1.2, y: 310 };
}
export function windAt(level: number, _seed: number, tick: number): number {
    return fieldAt(required(LEVELS[level]).mechanics, 180, 300, tick).wind;
}
/** Migration preserves the forces of pre-catalogue snapshots. */
function legacyField(level: number, seed: number, tick: number) {
    const t = level / 29, gust = level >= 14 ? 0.001 * (level - 13) / 16 : 0;
    const r = new Random((seed + Math.imul(Math.floor(tick / 90), 7919)) >>> 0);
    return { gravity: 0.018 + 0.006 * t, wind: 0.002 * t + (r.next() * 2 - 1) * gust, lift: 0 };
}
export function polygon(x: number, y: number, angle: number): Point[] {
    return [{ x: -7, y: 8 }, { x: 7, y: 8 }, { x: 6, y: -5 }, { x: 0, y: -10 }, { x: -6, y: -5 }].map(p => ({ x: x + 1.5 * (p.x * Math.cos(angle) - p.y * Math.sin(angle)), y: y + 1.5 * (p.x * Math.sin(angle) + p.y * Math.cos(angle)) }));
}
/** Swept SAT: exact first contact of a translating convex polygon and a segment. */
export function sweep(body: Point[], motion: Point, a: Point, b: Point): number | null {
    let enter = 0, leave = 1;
    const edges = body.map((p, i) => ({ x: required(body[(i + 1) % body.length]).x - p.x, y: required(body[(i + 1) % body.length]).y - p.y }));
    edges.push({ x: b.x - a.x, y: b.y - a.y });
    for (const edge of edges) {
        const axis = { x: -edge.y, y: edge.x }, dot = (p: Point): number => p.x * axis.x + p.y * axis.y;
        const values = body.map(dot), lo = Math.min(...values), hi = Math.max(...values);
        const low = Math.min(dot(a), dot(b)), high = Math.max(dot(a), dot(b)), velocity = dot(motion);
        if (Math.abs(velocity) < 1e-12) { if (hi < low || lo > high) return null; continue; }
        const t1 = (low - hi) / velocity, t2 = (high - lo) / velocity;
        enter = Math.max(enter, Math.min(t1, t2)); leave = Math.min(leave, Math.max(t1, t2));
        if (enter > leave) return null;
    }
    return enter;
}
export function landingScore(fuel: number, x: number, pad: Pad, ticks: number): number {
    const precision = 100 * Math.max(0, 1 - Math.abs(x - pad.x - pad.width / 2) / (pad.width / 2));
    return Math.round((fuel + precision + Math.max(0, 300 - ticks / 6)) * pad.multiplier);
}
export class Engine {
    specialUses = 2;
    specialTicks = 0;
    level = 0; seed = 28; status: 'playing' | 'won' | 'lost' = 'playing';
    terrain = generate(0, 28);
    state = { x: 180, y: 85, vx: 0, vy: 0, angle: 0, fuel: 950, score: 0, ticks: 0 };
    controls: Controls = { thrust: false, left: false, right: false };
    mission = { serviced: false, cargo: false, rescued: false, beacon: false, docked: -1, sliding: false };
    events: string[] = [];
    legacy = false;
    catalogueVersion: 107 | 108 = 108;
    plan() {
        const current = required(LEVELS[this.level]);
        return this.catalogueVersion === 107 ? { ...current, ...required(LEVELS_107[this.level]), route: [], beacon: [180, 350] as const, rescue: [90, 370] as const } : current;
    }
    private remainder = 0;
    has(mechanic: Mechanic): boolean { return !this.legacy && this.plan().mechanics.includes(mechanic); }
    private event(action: string): void { if (!this.events.includes(action)) this.events.push(action); }
    target(): Pad {
        if (!this.mission.serviced) {
            const service = this.terrain.pads.find(p => p.role === 'service');
            if (service) return service;
        }
        const l = this.plan();
        if (this.has('secours') && !this.mission.rescued) {
            const side = l.spawn >= l.rescue[0] ? 1 : -1;
            const staging = this.catalogueVersion !== 107 && Math.abs(this.state.y - l.rescue[1]) > 12;
            return { x: l.rescue[0] + (staging ? side * 50 : 0) - 20, y: l.rescue[1] + 12, width: 40, multiplier: 1 };
        }
        if (this.has('balise') && !this.mission.beacon) return { x: l.beacon[0] - 20, y: l.beacon[1] + 12, width: 40, multiplier: 1 };
        const gate = this.nextGate();
        if (gate) return { x: gate[0] - 20, y: gate[1] + 12, width: 40, multiplier: 1 };
        return required(this.terrain.pads[0]);
    }
    nextGate(): readonly [number, number] | undefined {
        if (this.legacy || this.catalogueVersion === 107) return undefined;
        return this.plan().route.find((_, i) => !this.events.includes('passage ' + String(i)));
    }
    obstacles(): [Point, Point][] {
        return this.has('grotte') ? [[{ x: 0, y: 250 }, { x: 360, y: 250 }], [{ x: 20, y: 250 }, { x: 20, y: 465 }], [{ x: 340, y: 250 }, { x: 340, y: 465 }]] : [];
    }
    constructor() { this.loadLevel(0); }
    loadLevel(level: number, seed = 28): void {
        this.specialUses = 2; this.specialTicks = 0;
        this.level = Math.max(0, Math.min(29, Math.floor(level))); this.seed = seed >>> 0;
        this.legacy = false; this.catalogueVersion = 108;
        this.terrain = generate(this.level, this.seed);
        const l = this.plan();
        this.state = { x: l.spawn, y: l.startY, vx: l.vx, vy: l.vy, angle: 0, fuel: l.fuel, score: 0, ticks: 0 };
        this.mission = { serviced: false, cargo: false, rescued: false, beacon: false, docked: -1, sliding: false };
        this.events = [];
        this.status = 'playing'; this.remainder = 0; this.input({ thrust: false, left: false, right: false });
    }
    input(controls: Controls): void { this.controls = { ...controls }; }
    special(): boolean {
        if (this.status !== 'playing' || this.specialUses === 0 || this.specialTicks > 0 || this.state.fuel < 30) return false;
        this.specialUses--; this.specialTicks = 60;
        this.state.fuel -= 30; this.state.angle = 0; this.state.vx *= 0.5;
        return true;
    }
    advance(ms: number): void { this.step(ms); }
    loadState(state: Partial<Engine['state']> & Partial<Pick<Engine, 'mission' | 'events' | 'terrain' | 'specialUses' | 'specialTicks' | 'status' | 'controls' | 'legacy' | 'catalogueVersion'>> & { remainder?: number; level?: number; seed?: number }): void {
        if (state.level !== undefined) this.level = Math.max(0, Math.min(29, Math.floor(state.level)));
        if (state.seed !== undefined) this.seed = state.seed >>> 0;
        for (const key of ['x', 'y', 'vx', 'vy', 'angle', 'fuel', 'score', 'ticks'] as const) {
            const value = state[key]; if (value !== undefined) this.state[key] = value;
        }
        if (state.catalogueVersion !== undefined) this.catalogueVersion = state.catalogueVersion;
        // Pass 107 included the arrival docks in the ground polyline (4+ points).
        // Pass 108 separated suspended docks from the ground (2 points).
        else if (state.terrain && state.mission) this.catalogueVersion = state.terrain.points.length > 2 ? 107 : 108;
        if (state.terrain && !state.mission) {
            this.legacy = true;
            this.mission = { serviced: false, cargo: false, rescued: false, beacon: false, docked: -1, sliding: false };
            this.events = [];
        }
        if (state.legacy !== undefined) this.legacy = state.legacy;
        if (state.mission) this.mission = { ...state.mission };
        if (state.events) this.events = [...state.events];
        if (state.terrain) this.terrain = { points: state.terrain.points.map(p => ({ ...p })), pads: state.terrain.pads.map(p => ({ ...p })) };
        if (!Number.isInteger(this.mission.docked) || this.mission.docked < -1 || this.mission.docked >= this.terrain.pads.length) { this.mission.docked = -1; this.mission.sliding = false; }
        if (state.specialUses !== undefined) this.specialUses = state.specialUses;
        if (state.specialTicks !== undefined) this.specialTicks = state.specialTicks;
        if (state.status) this.status = state.status;
        if (state.controls) this.input(state.controls);
        if (state.remainder !== undefined) this.remainder = state.remainder;
    }
    snapshot() { return { catalogueVersion: this.catalogueVersion, legacy: this.legacy, mission: { ...this.mission }, events: [...this.events], specialUses: this.specialUses, specialTicks: this.specialTicks, ...this.state, level: this.level, seed: this.seed, status: this.status, remainder: Math.max(0, Math.round(this.remainder * 1e8) / 1e8), controls: { ...this.controls }, terrain: { points: this.terrain.points.map(p => ({ ...p })), pads: this.terrain.pads.map(p => ({ ...p })) } }; }
    step(dtMs: number): void {
        if (!Number.isFinite(dtMs) || dtMs < 0) throw new RangeError('Temps invalide');
        if (this.status !== 'playing') return;
        this.remainder += dtMs;
        while (this.remainder + 1e-8 >= STEP) { this.remainder = Math.max(0, this.remainder - STEP); this.tick(); if (this.finished()) { this.remainder = 0; break; } }
    }
    private finished(): boolean { return this.status !== 'playing'; }
    private tick(): void {
        const s = this.state;
        if (this.has('mobile')) {
            const p = required(this.terrain.pads[0]), next = this.plan().x + movingOffset(s.ticks) * (this.catalogueVersion === 107 ? 1 : 4);
            const shift = next - p.x;
            for (const point of this.terrain.points) if (point.x === p.x) point.x = next; else if (point.x === p.x + p.width) point.x = next + p.width;
            if (this.mission.docked === 0) s.x += shift;
            p.x = next;
        }
        if (this.mission.docked >= 0) {
            const p = required(this.terrain.pads[this.mission.docked]);
            if (this.mission.sliding) {
                s.vx *= 0.94; s.x += s.vx; s.ticks++;
                if (s.x - 10.5 < p.x || s.x + 10.5 > p.x + p.width) { this.status = 'lost'; return; }
                if (Math.abs(s.vx) <= 0.02) { this.status = 'won'; s.score = landingScore(s.fuel, s.x, p, s.ticks); this.event('arreter:glace'); }
                return;
            }
            if (!this.controls.thrust) { s.ticks++; return; }
            this.mission.docked = -1; s.y -= 0.1; s.vy = -0.8;
            this.event('repartir');
        }
        const field = this.legacy ? legacyField(this.level, this.seed, s.ticks) : fieldAt(this.plan().mechanics, s.x, s.y, s.ticks);
        const l = this.plan();
        if (this.has('secours') && !this.mission.rescued && Math.hypot(s.x - l.rescue[0], s.y - l.rescue[1]) <= 28 && (this.catalogueVersion === 107 || (Math.abs(s.vx) >= 0.1 && Math.abs(s.vx) > Math.abs(s.vy)))) { this.mission.rescued = true; this.event('recueillir:secours'); }
        if (this.has('balise') && Math.hypot(s.x - l.beacon[0], s.y - l.beacon[1]) <= 38) { this.mission.beacon = true; this.event('survoler:balise'); }
        const gate = this.nextGate();
        if (gate && Math.hypot(s.x - gate[0], s.y - gate[1]) <= 22 &&
            (!this.has('geyser') || gate[0] < 130 || gate[0] > 230 || gate[1] < 300 || gate[1] > 480 || s.ticks % 240 >= 180) &&
            (!this.terrain.pads.some(p => p.role === 'service') || this.mission.serviced) &&
            (!this.has('balise') || this.mission.beacon) && (!this.has('secours') || this.mission.rescued)) {
            this.event('passage ' + String(l.route.indexOf(gate)));
        }
        if (this.specialTicks > 0) { s.angle = 0; this.specialTicks--; }
        else s.angle += (Number(this.controls.right) - Number(this.controls.left)) * 0.025;
        s.angle = Math.atan2(Math.sin(s.angle), Math.cos(s.angle));
        s.vx += field.wind; s.vy += field.gravity - field.lift;
        if (this.controls.thrust && s.fuel > 0) {
            const power = Math.min(1, s.fuel); s.fuel -= power;
            s.vx += Math.sin(s.angle) * 0.055 * power; s.vy -= Math.cos(s.angle) * 0.055 * power;
        }
        const body = polygon(s.x, s.y, s.angle), motion = { x: s.vx, y: s.vy };
        let contact = 1, hit = false;
        for (let i = 1; i < this.terrain.points.length; i++) {
            const time = sweep(body, motion, required(this.terrain.points[i - 1]), required(this.terrain.points[i]));
            if (time !== null && time <= contact) { contact = time; hit = true; }
        }
        const extra = [...this.obstacles(), ...this.terrain.pads.map(p => [{ x: p.x, y: p.y }, { x: p.x + p.width, y: p.y }] as [Point, Point])];
        for (const [a, b] of extra) {
            const time = sweep(body, motion, a, b);
            if (time !== null && time <= contact) { contact = time; hit = true; }
        }
        if (this.has('meteores')) {
            const meteor = meteorAt(s.ticks), next = meteorAt(s.ticks + 1);
            // Do not sweep the teleport at the end of the written trajectory.
            const velocity = next.x < meteor.x ? 1.2 : next.x - meteor.x;
            const time = sweep(body, { x: motion.x - velocity, y: motion.y }, { x: meteor.x, y: meteor.y - 8 }, { x: meteor.x, y: meteor.y + 8 });
            if (time !== null && time <= contact) { contact = time; this.status = 'lost'; }
        }
        // The upper and lateral screen edges are fatal walls, resolved before terrain.
        for (const p of body) {
            const times = [motion.x < 0 ? -p.x / motion.x : motion.x > 0 ? (360 - p.x) / motion.x : Infinity, motion.y < 0 ? -p.y / motion.y : Infinity];
            if (p.x < 0 || p.x > 360 || p.y < 0) { contact = 0; this.status = 'lost'; }
            for (const time of times) if (time >= 0 && time <= contact) { contact = time; this.status = 'lost'; }
        }
        s.x += s.vx * contact; s.y += s.vy * contact; s.ticks++;
        if (hit && this.status === 'playing') {
            const shape = polygon(s.x, s.y, s.angle), min = Math.min(...shape.map(p => p.x)), max = Math.max(...shape.map(p => p.x));
            const pad = this.terrain.pads.find(p => min >= p.x - 1e-8 && max <= p.x + p.width + 1e-8 && Math.abs(Math.max(...shape.map(v => v.y)) - p.y) < 1e-6);
            const safe = pad && Math.abs(s.vx) <= LIMITS.vx + 1e-10 && s.vy <= LIMITS.vy + 1e-10 && Math.abs(s.angle) <= LIMITS.angle + 1e-10;
            this.status = safe ? 'won' : 'lost';
            if (safe && pad.role === 'service') {
                this.status = 'playing'; this.mission.docked = this.terrain.pads.indexOf(pad); this.mission.serviced = true;
                s.vx = 0; s.vy = 0; s.angle = 0;
                if (this.has('ravitaillement')) { s.fuel = 1800; this.event('refaire:ravitaillement'); }
                if (this.has('cargo')) { this.mission.cargo = true; this.event('prendre:cargo'); }
            } else if (safe) {
                if (this.nextGate() || (this.terrain.pads.some(p => p.role === 'service') && !this.mission.serviced) || (this.has('balise') && !this.mission.beacon) || (this.has('secours') && !this.mission.rescued)) this.status = 'lost';
                else if (this.has('glace')) { this.status = 'playing'; this.mission.docked = this.terrain.pads.indexOf(pad); this.mission.sliding = true; this.event('glisser:glace'); }
                else s.score = landingScore(s.fuel, s.x, pad, s.ticks);
                if (this.has('choix')) this.event('choisir:choix');
                if (this.mission.cargo) this.event('livrer:cargo');
                if (this.mission.rescued) this.event('ramener:secours');
            }
        }
    }
}
/** Position/velocity controller: brake above the relief before final descent. */
export function pilot(e: Engine, controlMs = STEP): Controls {
    if (e.level === 0 || e.level === 9) return introductoryPilot(e, controlMs);
    const s = e.state, p = e.target();
    if (e.mission.docked >= 0) return { thrust: !e.mission.sliding, left: false, right: false };
    const field = e.legacy ? legacyField(e.level, e.seed, s.ticks) : fieldAt(required(LEVELS[e.level]).mechanics, s.x, s.y, s.ticks);
    const d = { gravity: field.gravity - field.lift };
    const transit = !e.legacy && p.role === undefined;
    const climb = !transit && p.y < s.y + 35 && Math.abs(p.x + p.width / 2 - s.x) > p.width / 2;
    const service = e.terrain.pads.find(pad => pad.role === 'service');
    const overService = e.mission.serviced && service && Math.abs(s.x - service.x - service.width / 2) < service.width / 2 + 18;
    const departing = overService && s.y > service.y - 40;
    const dx = (climb || departing ? s.x : p.x + p.width / 2) - s.x;
    const deckVelocity = e.has('mobile') && p === e.terrain.pads[0] ? (s.ticks % 480 < 240 ? 0.2 : -0.2) : 0;
    const acceleration = dx * 0.0005 - (s.vx - deckVelocity) * 0.1 - field.wind;
    // Finish rotating before contact; keep the hull upright during the last metres.
    const target = !transit && !climb && p.y - s.y < 30 && Math.abs(dx) < p.width / 2 - 15 ? 0 : Math.max(-0.4, Math.min(0.4, Math.atan(acceleration / Math.max(0.006, d.gravity))));
    const aligned = Math.abs(dx) < (deckVelocity ? 9 : 5) && Math.abs(s.vx - deckVelocity) < (deckVelocity ? 0.25 : 0.15) && Math.abs(s.angle) < (deckVelocity ? 0.175 : 0.1);
    const approachY = Math.min(s.y, p.y - 90);
    let destination = climb ? p.y - 55 : aligned ? p.y - 12 : Math.min(p.y - 80, approachY);
    if (transit) destination = p.y - 12;
    if (overService) destination = Math.min(destination, service.y - 80);
    if (e.has('grotte')) destination = Math.max(285, destination);
    if (e.has('meteores') && s.y < 290 && destination > 290) {
        const meteor = meteorAt(s.ticks);
        if (meteor.x > s.x - 140 && meteor.x < s.x + 50) destination = Math.min(destination, 265);
    }
    if (e.has('meteores') && s.y > 335 && destination < 335) {
        const meteor = meteorAt(s.ticks);
        if (meteor.x > s.x - 140 && meteor.x < s.x + 50) destination = Math.max(destination, 365);
    }
    const speed = Math.max(-1, Math.min(1, (destination - s.y) * 0.025));
    return { thrust: s.vy > (!transit && !climb && !overService && aligned && destination >= s.y ? Math.max(0.35, speed) : speed), left: s.angle > target + 0.025 * controlMs / STEP / 2, right: s.angle < target - 0.025 * controlMs / STEP / 2 };
}

/** Single beacon detours and the opening descent retain the held-button controller. */
function introductoryPilot(e: Engine, controlMs = STEP): Controls {
    const s = e.state, p = e.target();
    if (e.mission.docked >= 0) return { thrust: !e.mission.sliding, left: false, right: false };
    const field = e.legacy ? legacyField(e.level, e.seed, s.ticks) : fieldAt(required(LEVELS[e.level]).mechanics, s.x, s.y, s.ticks);
    const d = { gravity: field.gravity - field.lift };
    const needsBeacon = e.has('balise') && !e.mission.beacon && (e.mission.serviced || !e.terrain.pads.some(p => p.role === 'service'));
    const dx = (needsBeacon ? 180 : p.x + p.width / 2) - s.x;
    const acceleration = dx * 0.0008 - s.vx * 0.065 - field.wind;
    // Finish rotating before contact; keep the hull upright during the last metres.
    const target = p.y - s.y < 35 ? 0 : Math.max(-0.55, Math.min(0.55, Math.atan(acceleration / d.gravity)));
    const aligned = Math.abs(dx) < 5 && Math.abs(s.vx) < 0.15;
    const approachY = (e.mission.serviced || e.mission.rescued) ? 365 : Math.min(...e.terrain.points.map(v => v.y)) - 60;
    let destination = needsBeacon ? 350 : aligned ? p.y - 12 : Math.min(p.y - 80, approachY);
    if ((e.mission.serviced || e.mission.rescued) && s.y > 380 && Math.abs(dx) > 20) destination = 365;
    if (e.has('meteores') && s.y < 290) {
        const meteor = meteorAt(s.ticks);
        if (meteor.x > s.x - 140 && meteor.x < s.x + 50) destination = Math.min(destination, 265);
    }
    const speed = Math.max(-1, Math.min(1, (destination - s.y) * 0.025));
    return { thrust: s.vy > (aligned ? Math.max(0.35, speed) : speed), left: s.angle > target + 0.025 * controlMs / STEP / 2, right: s.angle < target - 0.025 * controlMs / STEP / 2 };
}
