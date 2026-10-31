import { ids, type CharacterId } from '../../characters/model';
import { Random } from '../shared/random';
import { levelAt, type Level } from './levels';
import { Terrain, WIDTH, HEIGHT } from './terrain';
export const FIXED_MS = 20, GRAVITY = 125;
export const WEAPONS = [
    { name: 'Galet sonore', radius: 34, damage: 62, bounce: 0, homing: 0, count: 18 },
    { name: 'Tige tonnante', radius: 44, damage: 72, bounce: 0, homing: 0, count: 3 },
    { name: 'Haleine braise', radius: 29, damage: 82, bounce: 0, homing: 0, count: 3 },
    { name: 'Vœu comète', radius: 30, damage: 58, bounce: 0, homing: 34, count: 3 },
    { name: 'Salto vibrant', radius: 38, damage: 66, bounce: 2, homing: 0, count: 3 },
    { name: 'Ronde rousse', radius: 49, damage: 54, bounce: 0, homing: 12, count: 3 },
] as const;
export type Weapon = 0 | 1 | 2 | 3 | 4 | 5;
export const signature: Record<CharacterId, Weapon> = { panda: 1, dragon: 2, licorne: 3, singe: 4, pandaroux: 5 };
export interface Unit {
    id: number; team: 0 | 1; hero: CharacterId; x: number; y: number; vx: number; vy: number;
    hp: number; fallY: number; ammo: number[];
}
export interface Projectile { x: number; y: number; vx: number; vy: number; age: number; bounces: number; weapon: Weapon; owner: number }
export interface Shot { angle: number; power: number; weapon: Weapon }
export interface Crate { x: number; y: number; kind: 'health' | 'ammo' }
export interface Rope { x: number; y: number; length: number }
export interface Blast { x: number; y: number; radius: number; time: number; weapon: Weapon }
export interface State {
    level: number; seed: number; rng: number; mode: 'solo' | 'duo'; config: Level;
    mask: number[]; material: number[]; hardness: number[]; structure: Terrain['structure'];
    units: Unit[]; active: number; turn: number; timer: number; wind: number; water: number;
    time: number; remainder: number; phase: 'aim' | 'flight' | 'settle'; settle: number;
    angle: number; power: number; weapon: Weapon; moveLeft: number; rope: Rope | null;
    projectile: Projectile | null; crates: Crate[]; blasts: Blast[]; status: 'playing' | 'won' | 'lost';
    winner: number | null; shots: number; destroyed: number; initialStructure: number; score: number;
}
export function clamp(n: number, a: number, b: number): number { return Math.max(a, Math.min(b, n)); }
export class Engine {
    config!: Level;
    terrain!: Terrain;
    random!: Random;
    level = 0; seed = 220; mode: 'solo' | 'duo' = 'solo';
    units: Unit[] = []; active = 0; turn = 0; timer = 25000; wind = 0; water = 606;
    time = 0; remainder = 0; phase: State['phase'] = 'aim'; settle = 0;
    angle = -.65; power = 150; weapon: Weapon = 0; moveLeft = 48; rope: Rope | null = null;
    projectile: Projectile | null = null; crates: Crate[] = []; blasts: Blast[] = [];
    status: State['status'] = 'playing'; winner: number | null = null; shots = 0; destroyed = 0;
    initialStructure = 0; score = 0; events: string[] = [];
    constructor(level = 0, seed = 220, mode: 'solo' | 'duo' = 'solo', hero: CharacterId = 'panda') { this.loadLevel(level, seed, mode, hero); }
    get playing(): boolean { return this.status === 'playing'; }
    get actor(): Unit { const a = this.units[this.active]; if (!a) throw new Error('Équipe vide'); return a; }
    loadLevel(level: number, seed = 220, mode: 'solo' | 'duo' = this.mode, hero: CharacterId = this.units[0]?.hero ?? 'panda'): void {
        this.config = levelAt(level); if (mode === 'duo') this.config.mission = 'duel'; this.terrain = new Terrain(this.config); this.random = new Random(seed);
        this.level = level; this.seed = seed; this.mode = mode; this.units = [];
        for (const team of [0, 1] as const) for (let i = 0; i < this.config.teams; i++) {
            const x = (team ? this.config.right : this.config.left) + (i - (this.config.teams - 1) / 2) * 18;
            const id = team ? ids[(level + i + 2) % ids.length] ?? 'dragon' : i === 0 ? hero : ids[(level + i) % ids.length] ?? 'singe';
            this.units.push({ id: this.units.length, team, hero: id, x, y: this.terrain.surface(x) - 8,
                vx: 0, vy: 0, hp: team && mode === 'solo' ? 72 + this.config.ai * 8 : 100, fallY: this.terrain.surface(x) - 8,
                ammo: WEAPONS.map((w, wi) => wi === 0 ? w.count + this.config.teams * 4 : wi === signature[id] ? w.count + (level > 19 ? 1 : 0) : 0) });
        }
        this.active = 0; this.turn = 0; this.timer = 25000; this.water = 606; this.time = 0; this.remainder = 0;
        this.phase = 'aim'; this.settle = 0; this.angle = -.65; this.power = 150; this.weapon = 0; this.moveLeft = 48;
        this.rope = null; this.projectile = null; this.crates = []; this.blasts = []; this.status = 'playing';
        this.winner = null; this.shots = 0; this.destroyed = 0; this.score = 0; this.events = [];
        this.initialStructure = this.terrain.structureCount(); this.rollWind();
    }
    private rollWind(): void { this.wind = Math.round((this.random.next() * 2 - 1) * this.config.wind); }
    aim(angle: number, power = this.power): void {
        if (!Number.isFinite(angle) || !Number.isFinite(power) || this.phase !== 'aim') return;
        this.angle = clamp(angle, -Math.PI + .08, -.08); this.power = clamp(power, 65, 245);
    }
    selectWeapon(weapon: Weapon): boolean {
        if (this.phase !== 'aim' || (this.actor.ammo[weapon] ?? 0) <= 0) return false;
        this.weapon = weapon; return true;
    }
    cycleWeapon(): void {
        for (let i = 1; i <= WEAPONS.length; i++) if (this.selectWeapon(((this.weapon + i) % WEAPONS.length) as Weapon)) return;
    }
    private ready(): boolean { return this.status === 'playing' && this.phase === 'aim' && this.actor.hp > 0; }
    move(direction: number): boolean {
        if (!this.ready() || this.moveLeft <= 0 || !Number.isFinite(direction)) return false;
        const d = Math.sign(direction) * Math.min(4, this.moveLeft), a = this.actor;
        const x = clamp(a.x + d, 8, WIDTH - 8);
        for (let rise = 0; rise <= 6; rise += 2) if (!this.terrain.solid(x, a.y + 5 - rise) && !this.terrain.solid(x, a.y - 5 - rise)) {
            a.x = x; a.y -= rise; this.moveLeft -= Math.abs(d); return true;
        }
        return false;
    }
    jump(): boolean {
        if (!this.ready()) return false;
        const a = this.actor;
        if (!this.rope && (!this.grounded(a) || a.vy < 0)) return false;
        this.rope = null; a.vy = -112; a.fallY = a.y; this.events.push('jump'); return true;
    }
    grapple(): boolean {
        if (!this.ready()) return false;
        if (this.rope) { this.rope = null; return true; }
        if (this.moveLeft < 12) return false;
        const a = this.actor;
        for (let s = 14; s < 150; s += 2) {
            const x = a.x + Math.cos(this.angle) * s, y = a.y + Math.sin(this.angle) * s;
            if (this.terrain.solid(x, y)) {
                this.rope = { x, y, length: s * .65 }; this.moveLeft -= 12; this.events.push('grapple'); return true;
            }
        }
        return false;
    }
    launch(shot: Shot = { angle: this.angle, power: this.power, weapon: this.weapon }): Projectile {
        const a = this.actor;
        return { x: a.x + Math.cos(shot.angle) * 12, y: a.y + Math.sin(shot.angle) * 12 - 3,
            vx: Math.cos(shot.angle) * shot.power, vy: Math.sin(shot.angle) * shot.power,
            age: 0, bounces: 0, weapon: shot.weapon, owner: a.id };
    }
    shoot(): boolean {
        if (!this.ready() || (this.actor.ammo[this.weapon] ?? 0) <= 0) return false;
        this.actor.ammo[this.weapon] = (this.actor.ammo[this.weapon] ?? 0) - 1;
        this.projectile = this.launch(); this.rope = null; this.phase = 'flight'; this.shots++; this.events.push('shot'); return true;
    }
    /** Shared by real flight, previews and AI. Substeps prevent tunnelling. */
    integrate(p: Projectile): 'flying' | 'impact' | 'outside' {
        const dt = FIXED_MS / 1000, w = WEAPONS[p.weapon];
        const owner = this.units[p.owner];
        if (w.homing) {
            const targets = this.units.filter(u => u.hp > 0 && u.team !== owner?.team);
            const target = targets.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
            if (target && p.age > 240) { const d = Math.hypot(target.x - p.x, target.y - p.y) || 1;
                p.vx += (target.x - p.x) / d * w.homing * dt; p.vy += (target.y - p.y) / d * w.homing * dt; }
        }
        p.vx += this.wind * .32 * dt; p.vy += GRAVITY * dt; p.age += FIXED_MS;
        const steps = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vy) * dt / 2));
        for (let i = 0; i < steps; i++) {
            const ox = p.x, oy = p.y;
            p.x += p.vx * dt / steps; p.y += p.vy * dt / steps;
            if (p.x < 0 || p.x >= WIDTH || p.y >= this.water || p.age >= 8000) return 'outside';
            if (this.units.some(u => u.hp > 0 && (u.id !== p.owner || p.age > 300) && Math.hypot(u.x - p.x, u.y - p.y) < 9)) return 'impact';
            if (this.terrain.solid(p.x, p.y)) {
                if (p.bounces < w.bounce) {
                    const wall = this.terrain.solid(p.x, oy);
                    p.x = ox; p.y = oy;
                    if (wall) p.vx *= -.7; else p.vy *= -.66;
                    p.bounces++; return 'flying';
                }
                return 'impact';
            }
        }
        return 'flying';
    }
    trace(shot: Shot, maxSteps = 400, collect = true): { x: number; y: number; result: string; points: { x: number; y: number }[] } {
        const p = this.launch(shot), points = [{ x: p.x, y: p.y }]; let result = 'flying';
        for (let i = 0; i < maxSteps && result === 'flying'; i++) { result = this.integrate(p); if (collect && i % 5 === 0) points.push({ x: p.x, y: p.y }); }
        return { x: p.x, y: p.y, result, points };
    }
    explode(x: number, y: number, weapon: Weapon): void {
        const w = WEAPONS[weapon]; this.destroyed += this.terrain.carve(x, y, w.radius);
        // Fire bores a second layer; leaves spread wide, ricochet keeps its rebound energy.
        if (weapon === 2) this.destroyed += this.terrain.carve(x, y, w.radius * .7);
        for (const u of this.units) {
            if (u.hp <= 0) continue;
            const d = Math.hypot(u.x - x, u.y - y);
            if (d < w.radius + 15) {
                u.hp = Math.max(0, u.hp - Math.round(w.damage * Math.max(.15, 1 - d / (w.radius + 15))));
                u.vx += (u.x < x ? -1 : 1) * (w.radius + 15 - d) * 1.4;
                u.vy = -Math.max(24, (w.radius + 15 - d) * 1.3); u.fallY = u.y;
            }
        }
        this.blasts.push({ x, y, weapon, radius: w.radius, time: this.time }); this.events.push('blast'); this.checkResult();
    }
    private grounded(u: Unit): boolean { return this.terrain.solid(u.x, u.y + 8) || this.terrain.solid(u.x - 4, u.y + 8) || this.terrain.solid(u.x + 4, u.y + 8); }
    private body(u: Unit): void {
        if (u.hp <= 0) return;
        const dt = FIXED_MS / 1000;
        if (this.grounded(u) && u.vy >= 0) {
            if (u.y - u.fallY > 45) { u.hp = Math.max(0, u.hp - Math.round((u.y - u.fallY - 45) * .7)); this.events.push('fall'); }
            u.vy = 0; u.fallY = u.y;
        } else { if (u.vy < 0) u.fallY = Math.min(u.fallY, u.y); u.vy += GRAVITY * dt; }
        const nx = clamp(u.x + u.vx * dt, 7, WIDTH - 7);
        if (!this.terrain.solid(nx, u.y) && !this.terrain.solid(nx, u.y + 5)) u.x = nx;
        else u.vx = 0;
        u.vx *= .94;
        const dy = u.vy * dt, steps = Math.max(1, Math.ceil(Math.abs(dy)));
        for (let i = 0; i < steps; i++) {
            const ny = u.y + dy / steps;
            if (dy > 0 && this.terrain.solid(u.x, ny + 7)) { u.vy = 0; break; }
            if (dy < 0 && this.terrain.solid(u.x, ny - 7)) { u.vy = 0; break; }
            u.y = ny;
        }
        if (u.y + 6 >= this.water || u.y > HEIGHT) { u.hp = 0; this.events.push('splash'); }
    }
    private checkResult(): void {
        if (this.status !== 'playing') return;
        const alive = [0, 1].map(team => this.units.some(u => u.team === team && u.hp > 0));
        const mission = this.config.mission;
        if (!alive[0]) { this.status = 'lost'; this.winner = 1; }
        else if ((mission === 'duel' || mission === 'target') && !alive[1] || mission === 'survive' && this.turn >= this.config.goal * 2
            || mission === 'structure' && this.terrain.structureCount() <= this.initialStructure * .2) { this.status = 'won'; this.winner = 0; }
        if (this.status !== 'playing') { this.score = this.status === 'won' ? Math.max(100, 3000 - this.turn * 40) : 0; this.events.push(this.status); }
    }
    endTurn(): void {
        if (this.status !== 'playing') return;
        const team = 1 - this.actor.team;
        let candidates = this.units.filter(u => u.hp > 0 && u.team === team);
        if (!candidates.length) candidates = this.units.filter(u => u.hp > 0);
        if (!candidates.length) { this.checkResult(); return; }
        this.turn++;
        this.active = (candidates[Math.floor(this.turn / 2) % candidates.length] ?? candidates[0])?.id ?? 0;
        this.timer = 25000; this.phase = 'aim'; this.weapon = 0; this.moveLeft = 48; this.rope = null; this.rollWind();
        this.angle = this.actor.team ? -2.4 : -.7;
        if (this.turn >= this.config.sudden) this.water = Math.max(250, this.water - 9);
        if (this.turn % 3 === 0) this.crates.push({ x: 24 + this.random.next() * 312, y: 110, kind: this.turn % 2 ? 'ammo' : 'health' });
        this.checkResult();
    }
    private fixed(): void {
        if (this.status !== 'playing') return;
        this.time += FIXED_MS;
        this.blasts = this.blasts.filter(b => this.time - b.time < 600);
        for (const u of this.units) this.body(u);
        if (this.rope) {
            const a = this.actor, r = this.rope;
            if (!this.terrain.solid(r.x, r.y)) this.rope = null;
            else { const d = Math.hypot(a.x - r.x, a.y - r.y); if (d > r.length) {
                const x = r.x + (a.x - r.x) / d * r.length, y = r.y + (a.y - r.y) / d * r.length;
                // Pull through free space only, never through a wall.
                const steps = Math.ceil(Math.hypot(x - a.x, y - a.y));
                const dx = (x - a.x) / steps, dy = (y - a.y) / steps;
                for (let i = 0; i < steps; i++) { if (this.terrain.solid(a.x + dx, a.y + dy - 6) || this.terrain.solid(a.x + dx, a.y + dy + 6)) break; a.x += dx; a.y += dy; }
                a.vy *= .7; a.fallY = a.y;
            } }
        }
        for (const c of this.crates) {
            if (!this.terrain.solid(c.x, c.y + 6)) c.y += 1.6;
            const u = this.units.find(u => u.hp > 0 && Math.hypot(u.x - c.x, u.y - c.y) < 18);
            if (u) { if (c.kind === 'health') u.hp = Math.min(100, u.hp + 30); else u.ammo[signature[u.hero]] = (u.ammo[signature[u.hero]] ?? 0) + 2; c.y = HEIGHT; this.events.push('bonus'); }
        }
        this.crates = this.crates.filter(c => c.y < this.water);
        this.checkResult(); if (!this.playing) return;
        if (this.projectile) {
            const p = this.projectile, result = this.integrate(p);
            if (result !== 'flying') {
                if (result === 'impact') this.explode(p.x, p.y, p.weapon);
                this.projectile = null; this.phase = 'settle'; this.settle = 0;
            }
        } else if (this.phase === 'settle') {
            this.settle += FIXED_MS;
            if (this.settle >= 800 && this.units.every(u => u.hp <= 0 || Math.abs(u.vy) < 1) || this.settle >= 4000) this.endTurn();
        } else {
            this.timer -= FIXED_MS;
            if (this.timer <= 0 || this.actor.hp <= 0) this.endTurn();
            else if (this.mode === 'solo' && this.actor.team === 1 && this.timer <= 24000) {
                if (this.config.mission === 'target') this.endTurn();
                else { const shot = chooseShot(this, this.config.ai); this.aim(shot.angle, shot.power); this.selectWeapon(shot.weapon); this.shoot(); }
            }
        }
    }
    step(ms: number): void {
        if (!Number.isFinite(ms) || ms < 0) return;
        this.remainder += ms;
        while (this.remainder >= FIXED_MS) { this.remainder -= FIXED_MS; this.fixed(); }
    }
    advance(ms: number): void { this.step(ms); }
    snapshot(): State {
        return { level: this.level, seed: this.seed, rng: this.random.state, mode: this.mode, config: { ...this.config },
            mask: Array.from(this.terrain.mask), material: Array.from(this.terrain.material), hardness: Array.from(this.terrain.hardness), structure: { ...this.terrain.structure },
            units: this.units.map(u => ({ ...u, ammo: [...u.ammo] })), active: this.active, turn: this.turn, timer: this.timer, wind: this.wind, water: this.water,
            time: this.time, remainder: this.remainder, phase: this.phase, settle: this.settle, angle: this.angle, power: this.power, weapon: this.weapon,
            moveLeft: this.moveLeft, rope: this.rope ? { ...this.rope } : null, projectile: this.projectile ? { ...this.projectile } : null,
            crates: this.crates.map(c => ({ ...c })), blasts: this.blasts.map(b => ({ ...b })), status: this.status, winner: this.winner,
            shots: this.shots, destroyed: this.destroyed, initialStructure: this.initialStructure, score: this.score };
    }
    restore(s: State): void {
        this.loadLevel(s.level, s.seed, s.mode);
        const { mask, material, hardness, structure, rng, ...fields } = JSON.parse(JSON.stringify(s)) as State;
        Object.assign(this, fields);
        this.random.state = rng; this.terrain.mask.set(mask); this.terrain.material.set(material); this.terrain.hardness.set(hardness); this.terrain.structure = structure;
    }
}
/** Full deterministic search uses the actual integrator, terrain and visible wind. No state changes. */
export function chooseShot(e: Engine, difficulty: 0 | 1 | 2 = 2, objective = true): Shot {
    const actor = e.actor, targets = e.units.filter(u => u.hp > 0 && u.team !== actor.team);
    let best: Shot = { angle: actor.team ? -2.4 : -.7, power: 150, weapon: 0 }, bestScore = -Infinity;
    const weapons = [0, signature[actor.hero]] as Weapon[];
    for (const weapon of weapons) {
        if ((actor.ammo[weapon] ?? 0) <= 0) continue;
        for (let degree = 8; degree <= 172; degree += 4) for (let power = 70; power <= 245; power += 10) {
            const shot = { angle: -degree * Math.PI / 180, power, weapon }, hit = e.trace(shot, 400, false);
            if (hit.result !== 'impact') continue;
            const w = WEAPONS[weapon];
            let score = -Math.min(...targets.map(u => Math.hypot(u.x - hit.x, u.y - hit.y)));
            for (const u of e.units.filter(u => u.hp > 0)) {
                const d = Math.hypot(u.x - hit.x, u.y - hit.y);
                const damage = d < w.radius + 15 ? w.damage * Math.max(.15, 1 - d / (w.radius + 15)) : 0;
                score += (u.team === actor.team ? -2.4 : 2) * damage;
            }
            if (objective && actor.team === 0 && e.config.mission === 'structure') {
                const r = e.terrain.structure;
                score = -Math.hypot(hit.x - (r.x + r.width / 2), hit.y - (r.y + r.height / 2)) + w.radius;
                if (Math.hypot(hit.x - actor.x, hit.y - actor.y) < w.radius + 20) score -= 180;
            }
            if (score > bestScore) { bestScore = score; best = shot; }
        }
    }
    // Error derives from public turn/seed, does not consume or inspect future RNG.
    const sign = (e.seed + e.turn) % 2 ? 1 : -1, error = [ .19, .065, 0 ][difficulty] ?? 0;
    return { ...best, angle: clamp(best.angle + sign * error, -Math.PI + .08, -.08), power: clamp(best.power + sign * error * 85, 65, 245) };
}
