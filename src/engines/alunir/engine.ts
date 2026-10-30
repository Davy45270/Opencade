import { Random } from '../shared/random';
export function required<T>(value: T | undefined): T {
    if (value === undefined) throw new Error('Élément requis');
    return value;
}
export const STEP = 1000 / 60;
export const LIMITS = { vx: 0.6, vy: 1.2, angle: 10 * Math.PI / 180 };
export const LEVELS = Array.from({ length: 30 }, (_, i) => ({ name: `Alunir ${String(i + 1)}` }));
export interface Point { x: number; y: number }
export interface Pad { x: number; y: number; width: number; multiplier: number }
export interface Controls { thrust: boolean; left: boolean; right: boolean }
export function difficulty(level: number) {
    const n = Math.max(0, Math.min(29, Math.floor(level))), t = n / 29;
    return { width: 90 - 62 * t, relief: 20 + 70 * t, wind: 0.002 * t, gust: n >= 14 ? 0.001 * (n - 13) / 16 : 0, gravity: 0.018 + 0.006 * t, fuel: 950 - 200 * t, offset: 40 + 70 * t };
}
export function generate(level: number, seed: number) {
    const r = new Random(seed), d = difficulty(level);
    const center = 150 + 60 * r.next(), y = 510 + 30 * r.next();
    const pad: Pad = { x: center - d.width / 2, y, width: d.width, multiplier: 1 + Math.floor(level / 10) };
    const pads = [pad];
    const points: Point[] = [];
    for (let x = 0; x < pad.x; x += 24) points.push({ x, y: y - r.next() * d.relief });
    points.push({ x: pad.x, y }, { x: pad.x + d.width, y });
    for (let x = pad.x + d.width + 24; x < 360; x += 24) points.push({ x, y: y - r.next() * d.relief });
    points.push({ x: 360, y: y - r.next() * d.relief });
    return { points, pads };
}
export function windAt(level: number, seed: number, tick: number): number {
    const d = difficulty(level), r = new Random((seed + Math.imul(Math.floor(tick / 90), 7919)) >>> 0);
    return d.wind + (r.next() * 2 - 1) * d.gust;
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
    private remainder = 0;
    constructor() { this.loadLevel(0); }
    loadLevel(level: number, seed = 28): void {
        this.specialUses = 2; this.specialTicks = 0;
        this.level = Math.max(0, Math.min(29, Math.floor(level))); this.seed = seed >>> 0;
        this.terrain = generate(this.level, this.seed); const p = required(this.terrain.pads[0]);
        const d = difficulty(this.level), direction = new Random(this.seed ^ 0x51a7).next() < 0.5 ? -1 : 1;
        this.state = { x: p.x + p.width / 2 + direction * d.offset, y: 85, vx: 0, vy: 0, angle: 0, fuel: difficulty(this.level).fuel, score: 0, ticks: 0 };
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
    loadState(state: Partial<Engine['state']>): void { Object.assign(this.state, state); }
    snapshot() { return { specialUses: this.specialUses, specialTicks: this.specialTicks, ...this.state, level: this.level, seed: this.seed, status: this.status, remainder: Math.max(0, Math.round(this.remainder * 1e8) / 1e8), controls: { ...this.controls }, terrain: { points: this.terrain.points.map(p => ({ ...p })), pads: this.terrain.pads.map(p => ({ ...p })) } }; }
    step(dtMs: number): void {
        if (!Number.isFinite(dtMs) || dtMs < 0) throw new RangeError('Temps invalide');
        if (this.status !== 'playing') return;
        this.remainder += dtMs;
        while (this.remainder + 1e-8 >= STEP) { this.remainder = Math.max(0, this.remainder - STEP); this.tick(); if (this.finished()) { this.remainder = 0; break; } }
    }
    private finished(): boolean { return this.status !== 'playing'; }
    private tick(): void {
        const s = this.state, d = difficulty(this.level);
        if (this.specialTicks > 0) { s.angle = 0; this.specialTicks--; }
        else s.angle += (Number(this.controls.right) - Number(this.controls.left)) * 0.025;
        s.angle = Math.atan2(Math.sin(s.angle), Math.cos(s.angle));
        s.vx += windAt(this.level, this.seed, s.ticks); s.vy += d.gravity;
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
        // The upper and lateral screen edges are fatal walls, resolved before terrain.
        for (const p of body) {
            const times = [motion.x < 0 ? -p.x / motion.x : motion.x > 0 ? (360 - p.x) / motion.x : Infinity, motion.y < 0 ? -p.y / motion.y : Infinity];
            if (p.x < 0 || p.x > 360 || p.y < 0) { contact = 0; this.status = 'lost'; }
            for (const time of times) if (time >= 0 && time <= contact) { contact = time; this.status = 'lost'; }
        }
        // First landing: release rotation to recover a small touch overshoot.
        // Nine rotation ticks during 150 ms already exceed the 10° landing limit.
        // This only levels a nearby, aligned hull; it never brakes a fast descent.
        const pad = this.terrain.pads[0];
        if (!hit && this.status === 'playing' && this.level === 0 && pad && !this.controls.left && !this.controls.right
            && pad.y - s.y < 60 && pad.y - s.y > 12
            && s.x > pad.x + 12 && s.x < pad.x + pad.width - 12
            && Math.abs(s.angle) > LIMITS.angle && Math.abs(s.angle) <= 0.35)
            s.angle -= Math.sign(s.angle) * Math.min(0.025, Math.abs(s.angle));
        s.x += s.vx * contact; s.y += s.vy * contact; s.ticks++;
        if (hit && this.status === 'playing') {
            const shape = polygon(s.x, s.y, s.angle), min = Math.min(...shape.map(p => p.x)), max = Math.max(...shape.map(p => p.x));
            const pad = this.terrain.pads.find(p => min >= p.x - 1e-8 && max <= p.x + p.width + 1e-8 && Math.abs(Math.max(...shape.map(v => v.y)) - p.y) < 1e-6);
            const safe = pad && Math.abs(s.vx) <= LIMITS.vx + 1e-10 && s.vy <= LIMITS.vy + 1e-10 && Math.abs(s.angle) <= LIMITS.angle + 1e-10;
            this.status = safe ? 'won' : 'lost';
            if (safe) s.score = landingScore(s.fuel, s.x, pad, s.ticks);
        }
    }
}
/** Position/velocity controller: brake above the relief before final descent. */
export function pilot(e: Engine, controlMs = STEP): Controls {
    const s = e.state, p = required(e.terrain.pads[0]), d = difficulty(e.level);
    const dx = p.x + p.width / 2 - s.x;
    const acceleration = dx * 0.0008 - s.vx * 0.065 - windAt(e.level, e.seed, s.ticks);
    // Finish rotating before contact; keep the hull upright during the last metres.
    const target = p.y - s.y < 35 ? 0 : Math.max(-0.55, Math.min(0.55, Math.atan(acceleration / d.gravity)));
    const aligned = Math.abs(dx) < 5 && Math.abs(s.vx) < 0.15;
    const approachY = Math.min(...e.terrain.points.map(v => v.y)) - 60;
    const destination = aligned ? p.y - 12 : Math.min(p.y - 80, approachY);
    const speed = Math.max(-1, Math.min(1, (destination - s.y) * 0.025));
    return { thrust: s.vy > (aligned ? Math.max(0.35, speed) : speed), left: s.angle > target + 0.025 * controlMs / STEP / 2, right: s.angle < target - 0.025 * controlMs / STEP / 2 };
}
