import { Random } from '../shared/random';
export const TICK = 1000 / 60, CANNON_Y = 552;
export interface Enemy { id: number; x: number; y: number; homeX: number; homeY: number; phase: 'entry' | 'formation' | 'dive'; age: number; curve: number; type: 'scout' | 'armor' | 'split' | 'sensor' | 'fragment'; hp: number; originX: number; originY: number; targetX: number; captured: boolean }
export interface Shot { x: number; y: number; owner: 'player' | 'enemy' }
export interface State { enemies: Enemy[]; shots: Shot[]; cannon: number; target: number | null; move: -1 | 0 | 1; firing: boolean; ticks: number; lives: number; score: number; wave: number; cooldown: number; enemyTimer: number; diveTimer: number; invulnerable: number; double: number; fired: number; hits: number; nextId: number }
export function difficulty(level: number) {
    if (!Number.isInteger(level) || level < 0 || level > 29) throw new RangeError('Niveau invalide');
    return { waves: 2 + Math.floor(4 * level / 29), count: 6 + Math.floor(6 * level / 29), diveRate: 0.3 + level * 0.02, diveSpeed: 180 + level * 3, fireRate: 0.4 + level * 0.025, enemySpeed: 120 + level * 2, armor: level / 100, split: level / 140, amplitude: 12 + level / 2 };
}
export const LEVELS = Array.from({ length: 30 }, (_, i) => ({ name: `Essaim ${String(i + 1)}${(i + 1) % 5 === 0 ? ' · Défi' : ''}` }));
export class Engine {
    level = 0; seed = 458; status: 'playing' | 'won' | 'lost' = 'playing'; state!: State; events: string[] = [];
    private random = new Random(458); private remainder = 0;
    constructor(level = 0, seed = 458) { this.loadLevel(level, seed); }
    get challenge(): boolean { return (this.level + 1) % 5 === 0; }
    loadLevel(level: number, seed = 458): void {
        difficulty(level); this.level = level; this.seed = seed; this.random = new Random(seed); this.remainder = 0; this.status = 'playing'; this.events = [];
        this.state = { enemies: [], shots: [], cannon: 180, target: null, move: 0, firing: false, ticks: 0, lives: 3, score: 0, wave: 0, cooldown: 0, enemyTimer: 2000, diveTimer: 3000, invulnerable: 0, double: 0, fired: 0, hits: 0, nextId: 0 }; this.spawnWave();
    }
    loadState(state: State): void { this.state = structuredClone(state); this.remainder = 0; this.status = 'playing'; this.events = []; }
    snapshot() { return { ...structuredClone(this.state), level: this.level, seed: this.seed, status: this.status, random: this.random.state, remainder: Math.max(0, Math.round(this.remainder * 1e8) / 1e8) }; }
    private spawnWave(): void {
        const s = this.state, d = difficulty(this.level); s.wave++;
        for (let i = 0; i < d.count; i++) {
            const roll = this.random.next(), type = i === 0 ? 'sensor' : roll < d.armor ? 'armor' : roll < d.armor + d.split ? 'split' : 'scout';
            const homeX = 55 + (i % 6) * 50, homeY = 110 + Math.floor(i / 6) * 44;
            s.enemies.push({ id: s.nextId++, x: homeX, y: -30, homeX, homeY, phase: 'entry', age: -i * 100, curve: (this.random.next() - 0.5) * 160, type, hp: type === 'armor' ? 2 : 1, originX: homeX, originY: -30, targetX: 180, captured: type === 'sensor' });
        } this.events.push('wave');
    }
    move(direction: -1 | 0 | 1): void { this.state.move = direction; this.state.target = null; }
    moveTo(x: number): void { if (Number.isFinite(x)) { this.state.target = Math.max(18, Math.min(342, x)); this.state.move = 0; } }
    holdFire(value: boolean): void { this.state.firing = value; }
    fire(): boolean {
        const s = this.state, available = 3 - s.shots.filter(p => p.owner === 'player').length;
        if (this.status !== 'playing' || s.cooldown > 1e-8 || available <= 0) return false;
        const n = s.double > 0 ? Math.min(2, available) : 1;
        for (let i = 0; i < n; i++) s.shots.push({ x: s.cannon + (n === 2 ? i * 12 - 6 : 0), y: CANNON_Y - 16, owner: 'player' });
        s.fired += n; s.cooldown = 150; this.events.push('fire'); return true;
    }
    private damage(): void { const s = this.state; if (s.invulnerable > 1e-8) return; s.lives--; s.invulnerable = 1000; this.events.push('life'); if (!s.lives) this.status = 'lost'; }
    private tick(): void {
        const s = this.state, d = difficulty(this.level); s.ticks++;
        for (const key of ['cooldown', 'invulnerable', 'double'] as const) s[key] = Math.max(0, s[key] - TICK);
        s.cannon = Math.max(18, Math.min(342, s.cannon + (s.target === null ? s.move * 5 : Math.sign(s.target - s.cannon) * Math.min(5, Math.abs(s.target - s.cannon)))));
        if (s.firing) this.fire();
        s.diveTimer -= TICK;
        if (s.diveTimer <= 0) {
            const candidates = s.enemies.filter(e => e.phase === 'formation'), e = candidates[Math.floor(this.random.next() * candidates.length)];
            if (e) { e.phase = 'dive'; e.age = 0; e.originX = e.x; e.originY = e.y; e.targetX = s.cannon; this.events.push('dive'); }
            s.diveTimer = 1000 / d.diveRate;
        }
        for (const e of s.enemies) {
            e.age += TICK;
            if (e.phase === 'entry') { const t = Math.max(0, Math.min(1, e.age / 1500)); e.x = e.homeX + Math.sin(t * Math.PI) * e.curve; e.y = -30 + (e.homeY + 30) * t; if (t === 1) { e.phase = 'formation'; e.age = 0; e.x = e.homeX; e.y = e.homeY; } }
            else if (e.phase === 'formation') { e.x = e.homeX + Math.sin(s.ticks / 90) * d.amplitude; e.y = e.homeY; }
            else { const t = e.age / (1000 * 560 / d.diveSpeed); e.x = e.originX + (e.targetX - e.originX) * Math.min(1, t) + Math.sin(t * Math.PI * 2) * e.curve / 4; e.y = e.originY + t * 560; if (e.y > 620) { e.phase = 'entry'; e.age = 0; } }
            if (Math.abs(e.x - s.cannon) < 22 && Math.abs(e.y - CANNON_Y) < 20) this.damage();
        }
        s.enemyTimer -= TICK;
        if (s.enemyTimer <= 0) { const e = s.enemies[Math.floor(this.random.next() * s.enemies.length)]; if (!this.challenge && e && e.y > 60 && s.shots.filter(p => p.owner === 'enemy').length < 8) s.shots.push({ x: e.x, y: e.y + 12, owner: 'enemy' }); s.enemyTimer = 1000 / d.fireRate; }
        const survivors: Shot[] = [];
        for (const p of s.shots) {
            const y = p.y + (p.owner === 'player' ? -600 : d.enemySpeed) / 60;
            if (p.owner === 'player') {
                const e = s.enemies.filter(e => Math.abs(e.x - p.x) < 16 && Math.min(p.y, y) <= e.y + 14 && Math.max(p.y, y) >= e.y - 14).sort((a, b) => b.y - a.y)[0];
                if (e) { s.hits++; e.hp--; this.events.push(e.hp ? 'armor' : 'enemy'); if (e.hp <= 0) {
                    s.enemies = s.enemies.filter(other => other !== e); s.score += e.phase === 'dive' ? 30 : 10;
                    if (e.captured) { s.double = 8000; this.events.push('bonus'); }
                    if (e.type === 'split') for (const side of [-1, 1]) s.enemies.push({ ...e, id: s.nextId++, type: 'fragment', hp: 1, captured: false, phase: 'dive', age: 0, originX: e.x + side * 18, originY: e.y, targetX: Math.max(20, Math.min(340, s.cannon + side * 60)), curve: side * 80 });
                } continue; }
            } else if (Math.abs(p.x - s.cannon) < 16 && p.y <= CANNON_Y + 12 && y >= CANNON_Y - 12) { this.damage(); continue; }
            if (y > 30 && y < 640) survivors.push({ ...p, y });
        }
        s.shots = survivors;
        if (!s.enemies.length && this.status === 'playing') { if (s.wave < d.waves) this.spawnWave(); else { this.status = 'won'; if (this.challenge) s.score += Math.round(200 * s.hits / Math.max(1, s.fired)); } }
    }
    step(dtMs: number): void { if (!Number.isFinite(dtMs) || dtMs < 0) throw new RangeError('Temps invalide'); this.events = []; if (this.status === 'playing') this.remainder += dtMs; while (this.remainder + 1e-8 >= TICK && this.status === 'playing') { this.remainder -= TICK; this.tick(); } if (this.status !== 'playing') this.remainder = 0; }
}
