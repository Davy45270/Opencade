import { Random } from '../shared/random';
import { LEVELS, type Weapon } from './levels';
export { LEVELS, WEAPONS } from './levels';
export type { Weapon } from './levels';
export const SLOW_FACTOR = 0.35;
export interface ActiveWeapon { kind: Weapon; remaining: number }
export interface Pickup { kind: Weapon; x: number; y: number }
export interface Boss { hp: number; maxHp: number; phase: number; clock: number; exposed: boolean; pattern: number; x: number; y: number }
export const TICK = 1000 / 60, CANNON_Y = 552;
export interface Enemy { id: number; x: number; y: number; homeX: number; homeY: number; phase: 'entry' | 'formation' | 'dive'; age: number; curve: number; type: 'scout' | 'armor' | 'split' | 'sensor' | 'fragment' | 'shield' | 'miner' | 'fast' | 'spiral' | 'turret' | 'mirror' | 'burst'; hp: number; originX: number; originY: number; targetX: number; captured: boolean; facing?: number; clock?: number; slow?: number }
export interface Shot { x: number; y: number; owner: 'player' | 'enemy'; vx?: number; vy?: number; bounces?: number; radius?: number; pierce?: number; hitIds?: number[]; reflected?: boolean; mine?: number; turnY?: number; seeking?: boolean }
export interface State { enemies: Enemy[]; shots: Shot[]; cannon: number; target: number | null; move: -1 | 0 | 1; firing: boolean; ticks: number; lives: number; score: number; wave: number; cooldown: number; enemyTimer: number; diveTimer: number; invulnerable: number; double: number; fired: number; hits: number; nextId: number; weapons: ActiveWeapon[]; pickups: Pickup[]; heat: number; overheated: boolean; charge: number; beam: boolean; rescue: { x: number; y: number; hp: number } | null; boss: Boss | null }
export function difficulty(level: number) {
    if (!Number.isInteger(level) || level < 0 || level > 29) throw new RangeError('Niveau invalide');
    return { waves: 2 + Math.floor(4 * level / 29), count: 6 + Math.floor(6 * level / 29), diveRate: 0.3 + level * 0.02, diveSpeed: 180 + level * 3, fireRate: 0.4 + level * 0.025, enemySpeed: 120 + level * 2, amplitude: 12 + level / 2 };
}
export class Engine {
    level = 0; seed = 458; status: 'playing' | 'won' | 'lost' = 'playing'; state!: State; events: string[] = [];
    private random = new Random(458); private remainder = 0;
    constructor(level = 0, seed = 458) { this.loadLevel(level, seed); }
    get challenge(): boolean { return (this.level + 1) % 5 === 0; }
    loadLevel(level: number, seed = 458): void {
        difficulty(level); this.level = level; this.seed = seed; this.random = new Random(seed); this.remainder = 0; this.status = 'playing'; this.events = [];
        this.state = { enemies: [], shots: [], cannon: 180, target: null, move: 0, firing: false, ticks: 0, lives: 3, score: 0, wave: 0, cooldown: 0, enemyTimer: 2000, diveTimer: 3000, invulnerable: 0, double: 0, fired: 0, hits: 0, nextId: 0, weapons: [], pickups: [], heat: 0, overheated: false, charge: 0, beam: false, rescue: null, boss: null }; this.spawnWave();
    }
    loadState(state: State): void { this.state = Object.assign({ weapons: [], pickups: [], heat: 0, overheated: false, charge: 0, beam: false, rescue: null, boss: null }, structuredClone(state)); this.remainder = 0; this.status = 'playing'; this.events = []; }
    snapshot() { return { ...structuredClone(this.state), level: this.level, seed: this.seed, status: this.status, random: this.random.state, remainder: Math.max(0, Math.round(this.remainder * 1e8) / 1e8) }; }
    get config() { const level = LEVELS[this.level]; if (!level) throw new RangeError('Niveau invalide'); return level; }
    has(kind: Weapon): boolean { return this.state.weapons.some(w => w.kind === kind && w.remaining > 0); }
    equip(kind: Weapon): void {
        const s = this.state; s.double = 0;
        const old = s.weapons.find(w => w.kind === kind);
        if (old) old.remaining = 14000;
        else { if (s.weapons.length === 2) s.weapons.shift(); s.weapons.push({ kind, remaining: 14000 }); }
        this.events.push('bonus');
    }
    dronePositions(): { x: number; y: number }[] {
        return [0, Math.PI].map(offset => ({ x: this.state.cannon + Math.cos(this.state.ticks / 18 + offset) * 42, y: CANNON_Y + Math.sin(this.state.ticks / 18 + offset) * 32 }));
    }
    inWave(x: number, y: number): boolean { return this.has('slow') && Math.hypot(x - this.state.cannon, y - (CANNON_Y - 140)) <= 125; }
    private spawnWave(): void {
        const s = this.state, d = difficulty(this.level), c = this.config; s.wave++;
        const count = c.rest ? 4 : d.count;
        for (let i = 0; i < count; i++) {
            const f = c.formations[(i + s.wave - 1) % c.formations.length] ?? 'patrol';
            const type: Enemy['type'] = i === 0 ? 'sensor' : f === 'patrol' || f === 'rescue' || f === 'command' ? 'scout' : f === 'column' ? 'armor' : f;
            let homeX = 55 + (i % 6) * 50, homeY = 110 + Math.floor(i / 6) * 44;
            if (c.layout === 'wedge') { homeX = 180 + (i % 2 ? -1 : 1) * (25 + Math.floor(i / 2) * 23); homeY = 90 + Math.floor(i / 2) * 28; }
            if (c.layout === 'column') { homeX = 105 + (i % 2) * 150; homeY = 85 + Math.floor(i / 2) * 42; }
            if (c.layout === 'pincer') { homeX = i % 2 ? 290 : 70; homeY = 90 + Math.floor(i / 2) * 36; }
            if (c.layout === 'ring') { homeX = 180 + Math.cos(i * Math.PI * 2 / count) * 115; homeY = 180 + Math.sin(i * Math.PI * 2 / count) * 80; }
            s.enemies.push({ id: s.nextId++, x: homeX, y: -30, homeX, homeY, phase: 'entry', age: -i * 100, curve: (this.random.next() - 0.5) * 160, type, hp: type === 'armor' || type === 'turret' ? 2 : 1, originX: homeX, originY: -30, targetX: 180, captured: type === 'sensor', clock: 0 });
        }
        // Supplies can be collected before engaging; each carrier releases another.
        s.pickups.push({ kind: c.weapon, x: s.cannon, y: 470 });
        const support: Weapon = c.formations.includes('rescue') && c.weapon !== 'magnet' ? 'magnet' : c.weapon === 'beam' ? 'slow' : c.weapon === 'slow' ? 'beam' : c.weapon === 'drones' ? 'magnet' : 'drones';
        s.pickups.push({ kind: support, x: s.cannon, y: 370 });
        if (c.formations.includes('rescue')) s.rescue = { x: 180, y: 460, hp: 4 };
        if (c.boss && s.wave === d.waves) s.boss = { hp: c.boss === 6 ? 24 : 10, maxHp: c.boss === 6 ? 24 : 10, phase: 1, clock: 0, exposed: false, pattern: c.boss, x: 180, y: 65 };
        this.events.push('wave');
    }
    move(direction: -1 | 0 | 1): void { this.state.move = direction; this.state.target = null; }
    moveTo(x: number): void { if (Number.isFinite(x)) { this.state.target = Math.max(18, Math.min(342, x)); this.state.move = 0; } }
    holdFire(value: boolean): void {
        const s = this.state;
        if (this.status === 'playing' && !value && s.firing && this.has('charge') && s.charge >= 300) {
            const power = Math.min(1, s.charge / 1500);
            s.shots.push({ x: s.cannon, y: CANNON_Y - 18, owner: 'player', radius: 4 + power * 14, pierce: 1 + Math.floor(power * 4), hitIds: [] });
            s.fired++; this.events.push('fire');
        }
        if (!value) s.charge = 0;
        s.firing = value;
    }
    fire(): boolean {
        const s = this.state, available = 3 - s.shots.filter(p => p.owner === 'player').length;
        if (this.status !== 'playing' || s.cooldown > 1e-8 || available <= 0) return false;
        if (this.has('beam')) return false;
        const n = s.double > 0 ? Math.min(2, available) : 1;
        for (let i = 0; i < n; i++) s.shots.push({ x: s.cannon + (n === 2 ? i * 12 - 6 : 0), y: CANNON_Y - 16, owner: 'player', ...(this.has('bounce') ? { vx: 420, vy: -350, bounces: 2 } : {}) });
        s.fired += n; s.cooldown = 150; this.events.push('fire'); return true;
    }
    private damage(forced = false): void { const s = this.state; if (!forced && s.invulnerable > 1e-8) return; s.lives--; s.invulnerable = 1000; this.events.push('life'); if (!s.lives) this.status = 'lost'; }
    private strike(e: Enemy, damage = 1, vx = 0, vy = -600): boolean {
        const s = this.state;
        // The shield faces down by default. Only arrivals within its 90-degree front cone are blocked.
        const facing = e.facing ?? Math.PI / 2;
        const frontal = -(vx * Math.cos(facing) + vy * Math.sin(facing)) >= Math.hypot(vx, vy) * Math.SQRT1_2;
        if (e.type === 'shield' && (e.clock ?? 0) % 6000 < 5500 && frontal) { this.events.push('armor'); return false; }
        e.hp -= damage; s.hits++; this.events.push(e.hp > 0 ? 'armor' : 'enemy');
        if (e.hp <= 0) {
            s.enemies = s.enemies.filter(other => other !== e); s.score += e.phase === 'dive' ? 30 : 10;
            if (e.captured) { s.pickups.push({ kind: this.config.weapon, x: e.x, y: e.y }); this.events.push('bonus'); }
            if (e.type === 'split') for (const side of [-1, 1]) s.enemies.push({ ...e, id: s.nextId++, type: 'fragment', hp: 1, captured: false, phase: 'dive', age: 0, originX: e.x + side * 18, originY: e.y, targetX: Math.max(20, Math.min(340, s.cannon + side * 60)), curve: side * 80 });
        }
        return true;
    }
    private bossHit(piercing: boolean): void {
        const b = this.state.boss; if (!b) return;
        if (!b.exposed && !piercing) return;
        b.hp -= piercing ? 2 : 1; this.state.hits++;
        if (b.pattern === 6 && b.hp <= 12 && b.phase === 1) { b.phase = 2; b.clock = 0; this.events.push('phase'); }
        if (b.hp <= 0) { this.state.score += 200; this.state.boss = null; this.events.push('enemy'); }
    }
    private updateWeapons(): void {
        const s = this.state;
        for (const w of s.weapons) w.remaining = Math.max(0, w.remaining - TICK);
        s.weapons = s.weapons.filter(w => w.remaining > 0);
        s.beam = this.has('beam') && s.firing && !s.overheated;
        if (s.beam) { s.heat = Math.min(100, s.heat + 1.4); if (s.heat >= 100) s.overheated = true; }
        else { s.heat = Math.max(0, s.heat - 0.8); if (s.heat === 0) s.overheated = false; }
        if (!this.has('charge')) s.charge = 0;
        if (this.has('charge') && s.firing) s.charge = Math.min(1500, (Math.round(s.charge / TICK) + 1) * TICK);
        if (s.beam && s.ticks % 6 === 0) {
            s.fired++;
            const e = s.enemies.filter(e => e.y > 0 && e.y < CANNON_Y && Math.abs(e.x - s.cannon) < 16).sort((a,b) => b.y - a.y)[0];
            if (e) this.strike(e);
            else if (s.boss && Math.abs(s.boss.x - s.cannon) < 30) this.bossHit(false);
        }
        for (const p of s.pickups) { p.y += 2.5; if (Math.hypot(p.x - s.cannon, p.y - CANNON_Y) < 30) { this.equip(p.kind); p.y = 700; } }
        s.pickups = s.pickups.filter(p => p.y < 650);
    }
    private tick(): void {
        const s = this.state, d = difficulty(this.level); s.ticks++;
        for (const key of ['cooldown', 'invulnerable', 'double'] as const) s[key] = Math.max(0, s[key] - TICK);
        s.cannon = Math.max(18, Math.min(342, s.cannon + (s.target === null ? s.move * 5 : Math.sign(s.target - s.cannon) * Math.min(5, Math.abs(s.target - s.cannon)))));
        this.updateWeapons();
        if (s.firing) this.fire();
        s.diveTimer -= TICK;
        if (s.diveTimer <= 0) {
            const candidates = s.enemies.filter(e => e.phase === 'formation'), e = candidates[Math.floor(this.random.next() * candidates.length)];
            if (e) { e.phase = 'dive'; e.age = 0; e.originX = e.x; e.originY = e.y; e.targetX = s.cannon; this.events.push('dive'); }
            s.diveTimer = 1000 / d.diveRate;
        }
        for (const e of s.enemies) {
            const slow = this.inWave(e.x, e.y) ? (s.beam ? 0.2 : SLOW_FACTOR) : 1;
            e.slow = slow; e.age += TICK * slow; e.clock = (e.clock ?? 0) + TICK * slow;
            if (e.phase === 'entry') { const t = Math.max(0, Math.min(1, e.age / 1500)); e.x = e.homeX + Math.sin(t * Math.PI) * e.curve; e.y = -30 + (e.homeY + 30) * t; if (t === 1) { e.phase = 'formation'; e.age = 0; e.x = e.homeX; e.y = e.homeY; } }
            else if (e.phase === 'formation') { e.x = e.homeX + Math.sin(e.age / 1500) * d.amplitude; e.y = e.homeY; }
            else { const t = e.age / (1000 * 560 / d.diveSpeed); e.x = e.originX + (e.targetX - e.originX) * Math.min(1, t) + Math.sin(t * Math.PI * 2) * e.curve / 4; e.y = e.originY + t * 560; if (e.y > 620) { e.phase = 'entry'; e.age = 0; } }
            if (e.phase === 'formation') {
                if (e.type === 'fast') { e.x = e.homeX + Math.sin(e.age / 180) * 42; e.y = e.homeY + Math.cos(e.age / 300) * 24; }
                if (e.type === 'mirror') e.x = Math.max(20, Math.min(340, e.homeX + (s.cannon - 180) * 0.65));
                if (e.type === 'spiral') { const t = e.age / 900; e.x = e.homeX + Math.sin(t * 3) * Math.min(80, t * 18); e.y = e.homeY + t * 65; if (e.y > 610) { s.enemies = s.enemies.filter(other => other !== e); continue; } }
                if (e.type === 'miner' && e.clock >= 2200 && s.shots.filter(p => p.owner === 'enemy').length < 12) { e.clock = 0; s.shots.push({ x: e.x, y: e.y + 20, owner: 'enemy', vy: 35, mine: 1400 }); }
                if (e.type === 'burst' && e.clock >= 2100 && s.shots.filter(p => p.owner === 'enemy').length < 10) {
                    e.clock = 0; for (const vx of [-45, 0, 45]) s.shots.push({ x: e.x, y: e.y + 18, owner: 'enemy', vx, vy: 150 });
                }
                if (e.type === 'turret' && e.clock >= 2100 && s.shots.filter(p => p.owner === 'enemy').length < 10) {
                    e.clock = 0; s.shots.push({ x:e.x+18, y:e.y+10, owner:'enemy', vx:0, vy:150, seeking:true });
                }
            }
            if (Math.abs(e.x - s.cannon) < 22 && Math.abs(e.y - CANNON_Y) < 20) { this.damage(); if (e.type === 'spiral') s.enemies = s.enemies.filter(other => other !== e); }
        }
        s.enemyTimer -= TICK;
        if (s.enemyTimer <= 0) { const e = s.enemies[Math.floor(this.random.next() * s.enemies.length)]; if (!this.config.rest && e && e.y > 60 && s.shots.filter(p => p.owner === 'enemy').length < 8) s.shots.push({ x: e.x, y: e.y + 12, owner: 'enemy' }); s.enemyTimer = 1000 / d.fireRate; }
        const boss = s.boss;
        if (boss) {
            boss.clock += TICK; boss.exposed = boss.clock % 3000 >= 1800;
            const pattern = boss.phase === 2 ? 3 : boss.pattern;
            boss.x = 180 + Math.sin(boss.clock / (400 + pattern * 80)) * 105;
            if (s.ticks % (boss.phase === 2 ? 45 : 75) === 0) {
                const velocities = pattern === 1 ? [-90, 90] : pattern === 2 ? [-70, 0, 70] : pattern === 3 ? [(s.cannon - boss.x) * 0.5] : pattern === 4 ? [-100, -35, 35, 100] : pattern === 5 ? [-110, 0, 110] : [-80, 80];
                if (pattern === 2) s.shots.push({ x: s.cannon, y: boss.y+20, owner: 'enemy', vx: 0, vy: 45, mine: 1200 });
                else for (const vx of velocities) s.shots.push({ x: boss.x, y: boss.y + 20, owner: 'enemy', vx, vy: pattern === 5 ? 180 : 160, ...(pattern === 4 ? { turnY: 300 } : {}), ...(pattern === 5 ? { seeking: true } : {}) });
            }
        }
        const survivors: Shot[] = [];
        for (const p of s.shots) {
            const slow = p.owner === 'enemy' && this.inWave(p.x, p.y) ? (s.beam ? 0.2 : SLOW_FACTOR) : 1;
            if (p.owner === 'enemy' && this.has('magnet') && Math.hypot(p.x - s.cannon, p.y - CANNON_Y) < 145) {
                const target = s.enemies.filter(e => e.y > 0).sort((a,b) => Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
                const tx = target?.x ?? s.boss?.x ?? p.x, ty = target?.y ?? s.boss?.y ?? 0, length = Math.max(1, Math.hypot(tx-p.x,ty-p.y));
                p.owner = 'player'; p.reflected = true; p.mine = undefined; p.seeking = false; p.turnY = undefined; p.vx = (tx-p.x)/length*600; p.vy = (ty-p.y)/length*600;
            }
            if (p.owner === 'enemy' && p.seeking && p.y < 300) p.vx = Math.max(-110, Math.min(110, (s.cannon-p.x)*0.8));
            if (p.turnY !== undefined && p.y >= p.turnY) { p.vx = -(p.vx ?? 0); p.turnY = undefined; }
            const oldX = p.x, oldY = p.y;
            p.x += (p.vx ?? 0) / 60 * slow;
            p.y += (p.vy ?? (p.owner === 'player' ? -600 : d.enemySpeed)) / 60 * slow;
            if ((p.bounces ?? 0) > 0 && (p.x < 8 || p.x > 352)) { p.x = p.x < 8 ? 16 - p.x : 704 - p.x; p.vx = -(p.vx ?? 0); p.bounces = (p.bounces ?? 0) - 1; }
            if (p.owner === 'enemy' && this.has('drones') && this.dronePositions().some(drone => {
                const dx = p.x - oldX, dy = p.y - oldY, length = dx*dx+dy*dy;
                const t = length ? Math.max(0, Math.min(1, ((drone.x-oldX)*dx+(drone.y-oldY)*dy)/length)) : 0;
                return Math.hypot(oldX+t*dx-drone.x, oldY+t*dy-drone.y) <= 17;
            })) { this.events.push('intercept'); continue; }
            if (p.mine !== undefined) { p.mine -= TICK * slow; if (p.mine <= 0) { for (const vx of [-100, 0, 100]) survivors.push({ x: p.x, y: p.y, owner: 'enemy', vx, vy: 170 }); continue; } }
            if (p.owner === 'player') {
                const radius = p.radius ?? 2;
                const targets = s.enemies.filter(e => !p.hitIds?.includes(e.id) && Math.abs(e.x - p.x) < 14 + radius && Math.min(oldY, p.y) <= e.y + 14 + radius && Math.max(oldY, p.y) >= e.y - 14 - radius).sort((a,b) => b.y-a.y);
                let consumed = false;
                for (const e of targets) {
                    this.strike(e, 1, p.vx ?? 0, p.vy ?? -600);
                    (p.hitIds ??= []).push(e.id);
                    if ((p.pierce ?? 1) <= 1) { consumed = true; break; } p.pierce = (p.pierce ?? 1) - 1;
                }
                if (consumed) continue;
                if (s.boss && Math.abs(p.x-s.boss.x) < 32+radius && Math.min(oldY,p.y) <= s.boss.y+22 && Math.max(oldY,p.y) >= s.boss.y-22) { this.bossHit((p.pierce ?? 0) > 1 || !!p.reflected || (p.bounces !== undefined && p.bounces < 2)); continue; }
            } else {
                if (s.rescue && Math.abs(p.x-s.rescue.x) < 26 && oldY <= s.rescue.y+12 && p.y >= s.rescue.y-12) {
                    s.rescue.hp--; if (s.rescue.hp <= 0) { s.rescue = null; this.damage(true); this.events.push('rescue-lost'); } continue;
                }
                if (Math.abs(p.x - s.cannon) < 16 && oldY <= CANNON_Y + 12 && p.y >= CANNON_Y - 12) { this.damage(); continue; }
            }
            if (p.y > 0 && p.y < 640 && p.x > 0 && p.x < 360) survivors.push(p);
        }
        s.shots = survivors;
        if (!s.enemies.length && !s.boss && this.status === 'playing') { if (s.rescue) { s.score += s.rescue.hp * 50; this.events.push('rescue'); s.rescue = null; } if (s.wave < d.waves) this.spawnWave(); else { this.status = 'won'; if (this.challenge) s.score += Math.round(200 * Math.min(1, s.hits / Math.max(1, s.fired))); } }
    }
    step(dtMs: number): void { if (!Number.isFinite(dtMs) || dtMs < 0) throw new RangeError('Temps invalide'); this.events = []; if (this.status === 'playing') this.remainder += dtMs; while (this.remainder + 1e-8 >= TICK && this.status === 'playing') { this.remainder -= TICK; this.tick(); } if (this.status !== 'playing') this.remainder = 0; }
}
