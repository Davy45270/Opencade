import { Random } from '../shared/random';
export const TICK = 1000 / 60;
export const SHIELD_Y = 488;
export const CANNON_Y = 588;
export interface Point { x: number; y: number }
export interface Probe extends Point { id: number; row: number; column: number; hp: number }
export interface Shot extends Point { owner: 'player' | 'enemy' }
export interface Comet extends Point { direction: 1 | -1 }
export interface State {
    probes: Probe[]; shots: Shot[]; shields: Point[]; comet: Comet | null;
    cannon: number; direction: 1 | -1; initialCount: number; lives: number; score: number;
    enemyTimer: number; cometTimer: number; cooldown: number; invulnerable: number;
    move: -1 | 0 | 1; target: number | null; firing: boolean; ticks: number;
}
export function difficulty(level: number) {
    if (!Number.isInteger(level) || level < 0 || level > 29) throw new RangeError('Niveau invalide');
    return {
        speed: 18 + 24 * level / 29, fireRate: 0.7 + 1.3 * level / 29,
        rows: 3 + Math.floor(2 * level / 29), columns: 6 + Math.floor(3 * level / 29),
        startY: 96 + 70 * level / 29, armor: level < 9 ? 0 : 0.15 + 0.25 * (level - 9) / 20,
        patternTier: Math.min(3, Math.floor(level / 8)), enemySpeed: 145 + 65 * level / 29,
        shotLimit: level < 14 ? 1 : 2,
    };
}
export const LEVELS = Array.from({ length: 30 }, (_, i) => ({ name: `Orbite ${String(i + 1)}` }));
export function shields(): Point[] {
    const cells: Point[] = [];
    for (const origin of [28, 108, 208, 288]) for (let y = 0; y < 7; y++) for (let x = 0; x < 11; x++) {
        if (y < 2 && (x < 2 - y || x > 8 + y) || y > 3 && x >= 4 && x <= 6) continue;
        cells.push({ x: origin + x * 4, y: SHIELD_Y + y * 4 });
    }
    return cells;
}
export class Engine {
    level = 0;
    seed = 457;
    status: 'playing' | 'won' | 'lost' = 'playing';
    state!: State;
    events: string[] = [];
    private random = new Random(457);
    private remainder = 0;
    constructor(level = 0, seed = 457) { this.loadLevel(level, seed); }
    loadLevel(level: number, seed = 457): void {
        const d = difficulty(level);
        this.level = level; this.seed = seed; this.random = new Random(seed); this.remainder = 0; this.status = 'playing'; this.events = [];
        const pattern = Math.floor(this.random.next() * (d.patternTier + 1));
        const probes: Probe[] = [];
        for (let row = 0; row < d.rows; row++) for (let column = 0; column < d.columns; column++) {
            const center = (d.columns - 1) / 2, distance = Math.abs(column - center);
            const offset = pattern === 1 ? distance * 9 : pattern === 2 ? (column % 2) * 14 : pattern === 3 ? (distance < 1 ? 18 : distance > center - 1 ? 22 : 0) + row * distance * 2 : 0;
            probes.push({ id: probes.length, row, column, x: 180 + (column - center) * 30, y: d.startY + row * 30 + offset, hp: this.random.next() < d.armor ? 2 : 1 });
        }
        this.state = { probes, shots: [], shields: shields(), comet: null, cannon: 180, direction: 1, initialCount: probes.length, lives: 3, score: 0, enemyTimer: this.enemyDelay(), cometTimer: 5000, cooldown: 0, invulnerable: 0, move: 0, target: null, firing: false, ticks: 0 };
    }
    /** Charge une position construite ; toutes les règles restent actives. */
    loadState(state: State): void { this.state = structuredClone(state); this.status = 'playing'; this.remainder = 0; this.events = []; }
    snapshot() { return { ...structuredClone(this.state), level: this.level, seed: this.seed, status: this.status, random: this.random.state, remainder: Math.max(0, Math.round(this.remainder * 1e8) / 1e8) }; }
    speed(): number { return difficulty(this.level).speed * (1 + 2 * (1 - this.state.probes.length / Math.max(1, this.state.initialCount))); }
    move(direction: -1 | 0 | 1): void { if (this.status === 'playing') { this.state.move = direction; this.state.target = null; } }
    moveTo(x: number): void { if (this.status === 'playing' && Number.isFinite(x)) { this.state.target = Math.max(16, Math.min(344, x)); this.state.move = 0; } }
    holdFire(held: boolean): void { this.state.firing = held; }
    fire(): boolean {
        const s = this.state;
        if (this.status !== 'playing' || s.cooldown > 1e-8 || s.shots.filter(shot => shot.owner === 'player').length >= difficulty(this.level).shotLimit) return false;
        s.shots.push({ x: s.cannon, y: CANNON_Y - 15, owner: 'player' }); s.cooldown = 180; this.events.push('fire'); return true;
    }
    bottomProbes(): Probe[] {
        const columns = new Map<number, Probe>();
        for (const probe of this.state.probes) { const previous = columns.get(probe.column); if (!previous || probe.y > previous.y) columns.set(probe.column, probe); }
        return [...columns.values()].sort((a, b) => a.column - b.column);
    }
    private enemyDelay(): number { return 1000 / difficulty(this.level).fireRate * (0.75 + this.random.next() * 0.5); }
    private enemyFire(): void {
        const candidates = this.bottomProbes();
        const probe = candidates[Math.floor(this.random.next() * candidates.length)];
        if (probe && this.state.shots.filter(s => s.owner === 'enemy').length < 12) this.state.shots.push({ x: probe.x, y: probe.y + 12, owner: 'enemy' });
    }
    private cometAttempt(): void {
        const s = this.state;
        const roll = this.random.next();
        if (roll >= 0.22 || s.comet || s.probes.some(p => p.y - 11 < 78)) return;
        const direction = this.random.next() < 0.5 ? 1 : -1;
        s.comet = { x: direction === 1 ? -16 : 376, y: 56, direction }; this.events.push('comet');
    }
    private tick(): void {
        const s = this.state, d = difficulty(this.level);
        s.ticks++; s.cooldown = Math.max(0, s.cooldown - TICK); s.invulnerable = Math.max(0, s.invulnerable - TICK);
        if (s.target !== null) s.cannon += Math.sign(s.target - s.cannon) * Math.min(Math.abs(s.target - s.cannon), 260 / 60);
        else s.cannon = Math.max(16, Math.min(344, s.cannon + s.move * 260 / 60));
        if (s.firing) this.fire();
        const dx = s.direction * this.speed() / 60;
        const min = Math.min(...s.probes.map(p => p.x - 11)), max = Math.max(...s.probes.map(p => p.x + 11));
        const edge = min + dx < 12 || max + dx > 348;
        const actual = edge ? s.direction > 0 ? 348 - max : 12 - min : dx;
        for (const p of s.probes) { p.x += actual; if (edge) p.y += 18; }
        if (edge) { s.direction = s.direction === 1 ? -1 : 1; this.events.push('edge'); }
        if (s.probes.some(p => p.y + 11 >= SHIELD_Y)) { this.status = 'lost'; return; }
        s.enemyTimer -= TICK;
        if (s.enemyTimer <= 1e-8) { this.enemyFire(); s.enemyTimer = this.enemyDelay(); }
        s.cometTimer -= TICK;
        if (s.cometTimer <= 1e-8) { this.cometAttempt(); s.cometTimer += 5000; }
        if (s.comet) { s.comet.x += s.comet.direction * 95 / 60; if (s.comet.x < -28 || s.comet.x > 388) s.comet = null; }
        const survivors: Shot[] = [];
        for (const shot of s.shots) {
            const nextY = shot.y + (shot.owner === 'player' ? -480 : d.enemySpeed) / 60;
            const hits: { y: number; distance: number; apply: () => void }[] = [];
            const hit = (x: number, y: number, w: number, h: number, apply: () => void): void => {
                if (Math.abs(shot.x - x) > w / 2 + 1.5) return;
                const low = y - h / 2 - 3, high = y + h / 2 + 3;
                if (Math.max(shot.y, nextY) < low || Math.min(shot.y, nextY) > high) return;
                hits.push({ y, distance: Math.max(0, shot.owner === 'player' ? shot.y - high : low - shot.y), apply });
            };
            for (const cell of s.shields) hit(cell.x + 2, cell.y + 2, 4, 4, () => { s.shields = s.shields.filter(c => c !== cell); this.events.push('shield'); });
            if (shot.owner === 'player') {
                for (const p of s.probes) hit(p.x, p.y, 22, 22, () => {
                    p.hp--; this.events.push(p.hp > 0 ? 'armor' : 'probe');
                    if (p.hp <= 0) { s.probes = s.probes.filter(probe => probe !== p); s.score += (d.rows - p.row) * 10 * (this.level + 1); }
                });
                const comet = s.comet;
                if (comet) hit(comet.x, comet.y, 28, 14, () => { s.comet = null; s.score += 150 * (this.level + 1); this.events.push('bonus'); });
            } else hit(s.cannon, CANNON_Y, 26, 20, () => {
                if (s.invulnerable <= 0) { s.lives--; s.invulnerable = 1200; this.events.push('life'); if (s.lives <= 0) this.status = 'lost'; }
            });
            hits.sort((a, b) => a.distance - b.distance);
            if (hits[0]) hits[0].apply();
            else if (nextY >= 32 && nextY <= 630) survivors.push({ ...shot, y: nextY });
        }
        s.shots = survivors;
        if (this.status === 'playing' && !s.probes.length) this.status = 'won';
    }
    step(dtMs: number): void {
        if (!Number.isFinite(dtMs) || dtMs < 0) throw new RangeError('Temps invalide');
        this.events = [];
        if (this.status === 'playing') this.remainder += dtMs;
        while (this.remainder + 1e-8 >= TICK && this.status === 'playing') { this.remainder -= TICK; this.tick(); }
        if (this.status !== 'playing') this.remainder = 0;
    }
}
