import { Random } from '../shared/random';
import { stage, formation, type Mechanic } from './campaign';
export const TICK = 1000 / 60;
export const SHIELD_Y = 488;
export const CANNON_Y = 588;
export interface Point { x: number; y: number }
export interface Probe extends Point { id: number; row: number; column: number; hp: number; kind?: 'rotor' | 'split' | 'stealth' | 'repair' | 'fragment'; maxHp?: number }
export interface Shot extends Point { owner: 'player' | 'enemy'; vx?: number; deflected?: boolean; curved?: boolean }
export interface Comet extends Point { direction: 1 | -1 }
export interface Boss extends Point { hp: number; maxHp: number; phase: number; motif: number }
export interface State {
    swarm?: boolean; asteroids?: Point[]; wells?: Point[]; satellite?: (Point & { hp: number }) | null; boss?: Boss | null;
    probes: Probe[]; shots: Shot[]; shields: Point[]; comet: Comet | null;
    cannon: number; direction: 1 | -1; initialCount: number; lives: number; score: number;
    enemyTimer: number; cometTimer: number; cooldown: number; invulnerable: number;
    move: -1 | 0 | 1; target: number | null; firing: boolean; ticks: number;
}
/**
 * Fleet size grows by chapter so late waves feel bigger, not only faster: 3×5 to learn,
 * 3×6, then 4×6 from level 10 and 4×7 from level 20 (levels 22 and 29: six columns). Breathers keep two rows; guardians
 * keep four escort columns (three rows), and the final guardian brings 4×5.
 */
export function fleet(level: number): { rows: number; columns: number } {
    const s = stage(level);
    if (s.boss) return level === 29 ? { rows: 4, columns: 5 } : { rows: 3, columns: 4 };
    // Level 29 already stacks the spiral swarm, repairers and stealth: it keeps the classic 3×6 line
    // (a wider or deeper fleet lost the seed-457 pilot replay).
    if (level === 28) return { rows: 3, columns: 6 };
    // Level 22 opens the allied satellite: six columns, so the escort fight stays readable (a 4×7 fleet lost the burst pilot).
    const columns = level < 3 ? 5 : level < 19 || level === 21 ? 6 : 7;
    return { rows: s.rest ? 2 : level < 9 ? 3 : 4, columns };
}
export function difficulty(level: number) {
    if (!Number.isInteger(level) || level < 0 || level > 29) throw new RangeError('Niveau invalide');
    return {
        speed: 18 + 24 * level / 29, fireRate: (0.7 + 1.3 * level / 29) * (stage(level).rest ? 0.6 : 1),
        ...fleet(level),
        armor: level < 9 ? 0 : 0.15 + 0.25 * (level - 9) / 20,
        enemySpeed: 145 + 65 * level / 29,
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
/** First overlap of a swept point with a rectangle, as a fraction of one tick. */
function contactTime(x: number, y: number, dx: number, dy: number, rx: number, ry: number): number | null {
    if ((x > rx && x + dx > rx) || (x < -rx && x + dx < -rx)
        || (y > ry && y + dy > ry) || (y < -ry && y + dy < -ry)) return null;
    let enter = 0, exit = 1;
    for (const [offset, velocity, radius] of [[x, dx, rx], [y, dy, ry]] as const) {
        if (velocity === 0) { if (Math.abs(offset) > radius) return null; }
        else {
            const a = (-radius - offset) / velocity, b = (radius - offset) / velocity;
            enter = Math.max(enter, Math.min(a, b)); exit = Math.min(exit, Math.max(a, b));
        }
    }
    return enter <= exit ? enter : null;
}
export class Engine {
    level = 0;
    seed = 457;
    status: 'playing' | 'won' | 'lost' = 'playing';
    state!: State;
    events: string[] = [];
    specialUses = 1; specialTicks = 0;
    private random = new Random(457);
    private remainder = 0;
    constructor(level = 0, seed = 457) { this.loadLevel(level, seed); }
    loadLevel(level: number, seed = 457): void {
        this.specialUses = 1; this.specialTicks = 0;
        const d = difficulty(level);
        this.level = level; this.seed = seed; this.random = new Random(seed); this.remainder = 0; this.status = 'playing'; this.events = [];
        const c = stage(this.level);
        const probes: Probe[] = [];
        const rows = d.rows, columns = d.columns;
        const kinds = c.mechanics.filter((m): m is 'rotor' | 'split' | 'stealth' | 'repair' => ['rotor', 'split', 'stealth', 'repair'].includes(m))
            // Keep healers behind the front-row stealth escort in mixed kits.
            .sort((a, b) => Number(a === 'stealth') - Number(b === 'stealth'));
        const spacing = Math.min(4, Math.floor(rows * columns / Math.max(1, kinds.length)));
        for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
            const id = probes.length, point = formation(c.form, row, column, columns);
            const kind = id % spacing === 0 ? kinds[Math.floor(id / spacing) % Math.max(1, kinds.length)] : undefined;
            const hp = kind === 'repair' ? 2 : this.random.next() < d.armor ? 2 : 1;
            probes.push({ id, row, column, ...point, hp, maxHp: hp, ...(kind ? { kind } : {}) });
        }
        this.state = { probes, shots: [], shields: shields(), comet: null, cannon: 180, direction: 1, initialCount: probes.length, lives: 3, score: 0, enemyTimer: this.enemyDelay(), cometTimer: 5000, cooldown: 0, invulnerable: 0, move: 0, target: null, firing: false, ticks: 0,
            swarm: c.mechanics.includes('spiral'),
            asteroids: c.mechanics.includes('asteroid') ? [{ x: 116, y: 330 }, { x: 244, y: 370 }] : [],
            wells: c.mechanics.includes('gravity') ? [{ x: 180, y: 350 }] : [],
            satellite: c.mechanics.includes('satellite') ? { x: 180, y: 550, hp: 4 } : null,
            boss: c.boss ? { x: 180, y: 80, hp: c.boss === 6 ? 12 : 5, maxHp: c.boss === 6 ? 12 : 5, phase: 1, motif: c.boss } : null,
        };
    }
    /** Charge une position construite ; toutes les règles restent actives. */
    loadState(state: State & { specialUses?: number; specialTicks?: number;  }): void {
        this.specialUses = state.specialUses ?? 1; this.specialTicks = state.specialTicks ?? 0; this.state = structuredClone(state);
        for (const key of ['specialUses', 'specialTicks', 'lightPath', 'reserve']) Reflect.deleteProperty(this.state, key); this.status = 'playing'; this.remainder = 0; this.events = []; }
    snapshot() { return { ...structuredClone(this.state), ...(this.specialUses === 1 ? {} : { specialUses: this.specialUses, specialTicks: this.specialTicks }), level: this.level, seed: this.seed, status: this.status, random: this.random.state, remainder: Math.max(0, Math.round(this.remainder * 1e8) / 1e8) }; }
    has(mechanic: Mechanic): boolean { return stage(this.level).mechanics.includes(mechanic); }
    visible(p: Probe): boolean { return p.kind !== 'stealth' || (this.state.ticks + p.id * 13) % 150 < 95; }
    rotorClosed(p: Probe): boolean { return p.kind === 'rotor' && (this.state.ticks + p.id * 11) % 120 < 45; }
    bossOpen(): boolean { return this.state.ticks % 150 >= 55; }
    speed(): number { return difficulty(this.level).speed * (1 + 2 * (1 - Math.min(1, this.state.probes.length / Math.max(1, this.state.initialCount)))); }
    move(direction: -1 | 0 | 1): void { if (this.status === 'playing') { this.state.move = direction; this.state.target = null; } }
    moveTo(x: number): void { if (this.status === 'playing' && Number.isFinite(x)) { this.state.target = Math.max(16, Math.min(344, x)); this.state.move = 0; } }
    holdFire(held: boolean): void { this.state.firing = held; }
    special(): boolean {
        if (this.status !== 'playing' || this.specialUses === 0) return false;
        this.specialUses = 0; this.specialTicks = 90;
        this.state.cooldown = Math.ceil(this.state.cooldown / TICK) * TICK / 2;
        this.events.push('special'); return true;
    }
    advance(ms: number): void { this.step(ms); }
    fire(): boolean {
        const s = this.state;
        if (this.status !== 'playing' || s.cooldown > 1e-8 || s.shots.filter(shot => shot.owner === 'player').length >= difficulty(this.level).shotLimit * (this.specialTicks > 0 ? 2 : 1)) return false;
        s.shots.push({ x: s.cannon, y: CANNON_Y - 15, owner: 'player' });
        // The ordinary 180 ms gate fires every ceil(180/TICK) simulation ticks.
        // Keep its historical cadence; halve that real period and carry the
        // fractional tick during Rafale instead of rounding each shot upward.
        s.cooldown = this.specialTicks > 0 ? Math.min(0, s.cooldown) + Math.ceil(180 / TICK) * TICK / 2 : 180; this.events.push('fire'); return true;
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
        const cooling = s.cooldown > 1e-8;
        s.ticks++; s.cooldown = cooling && this.specialTicks > 0 && s.firing ? Math.max(-TICK, s.cooldown - TICK) : Math.max(0, s.cooldown - TICK); s.invulnerable = Math.max(0, s.invulnerable - TICK);
        if (s.target !== null) s.cannon += Math.sign(s.target - s.cannon) * Math.min(Math.abs(s.target - s.cannon), 260 / 60);
        else s.cannon = Math.max(16, Math.min(344, s.cannon + s.move * 260 / 60));
        if (s.firing) this.fire();
        if (this.specialTicks > 0) this.specialTicks--;
        const boss = s.boss;
        if (boss) {
            boss.x = 180 + Math.sin(s.ticks / (boss.phase === 2 ? 48 : 85)) * 110;
            if (s.ticks % (boss.phase === 2 ? 72 : 120) === 0) {
                const aimed = (s.cannon - boss.x) * 0.35;
                const velocities = boss.motif === 1 ? [-80, 80]
                    : boss.motif === 2 ? [aimed]
                    : boss.motif === 3 ? [-65, 0, 65]
                    : boss.motif === 4 ? [s.ticks % 240 === 0 ? -100 : 100, 0]
                    : boss.motif === 5 ? [Math.sin(s.ticks / 60) * 110, Math.cos(s.ticks / 60) * 110]
                    : boss.phase === 2 ? [-90, aimed, 90] : [-65, 0, 65];
                for (const vx of velocities) s.shots.push({ x: boss.x, y: boss.y + 16, vx, owner: 'enemy' });
                this.events.push('boss-fire');
            }
        }
        if (s.satellite) {
            s.satellite.x = 180 + Math.sin(s.ticks / 100) * 55;
            if (s.ticks % 360 === 0) {
                const p = this.bottomProbes()[0];
                if (p) { s.shots.push({ x: s.satellite.x, y: p.y + 15, owner: 'enemy' }); this.events.push('satellite-threat'); }
            }
        }
        if (s.ticks % 150 === 0) for (const p of s.probes) if (p.kind === 'repair') {
            const target = s.probes.find(other => other !== p && other.hp < (other.maxHp ?? other.hp) && Math.hypot(other.x - p.x, other.y - p.y) < 110);
            if (target) { target.hp++; this.events.push('repair'); }
        }
        if (s.probes.some(p => p.kind === 'stealth' && (s.ticks + p.id * 13) % 150 === 95)) this.events.push('stealth-hide');
        const dx = s.direction * this.speed() / 60;
        const min = Math.min(...s.probes.map(p => p.x - 11)), max = Math.max(...s.probes.map(p => p.x + 11));
        const edge = min + dx < 12 || max + dx > 348;
        const actual = edge ? s.direction > 0 ? 348 - max : 12 - min : dx;
        for (const p of s.probes) {
            p.x += actual;
            if (edge) p.y += 18;
            if (s.swarm) {
                p.x += Math.sin(s.ticks / 32 + p.row) * 0.35;
                p.y += Math.cos(s.ticks / 32 + p.column) * 0.2;
                if (s.ticks % 60 === 0) this.events.push('spiral');
            }
        }
        if (edge) { s.direction = s.direction === 1 ? -1 : 1; this.events.push('edge'); }
        if (s.probes.some(p => p.y + 11 >= SHIELD_Y)) { this.status = 'lost'; return; }
        s.enemyTimer -= TICK;
        if (s.enemyTimer <= 1e-8) { this.enemyFire(); s.enemyTimer = this.enemyDelay(); }
        s.cometTimer -= TICK;
        if (s.cometTimer <= 1e-8) { this.cometAttempt(); s.cometTimer += 5000; }
        if (s.comet) { s.comet.x += s.comet.direction * 95 / 60; if (s.comet.x < -28 || s.comet.x > 388) s.comet = null; }
        // Canonical order also breaks simultaneous-contact ties independently of insertion.
        s.shots.sort((a, b) => a.x - b.x || a.y - b.y
            || (a.owner === b.owner ? 0 : a.owner === 'enemy' ? -1 : 1) || (a.vx ?? 0) - (b.vx ?? 0)
            || Number(Boolean(a.deflected)) - Number(Boolean(b.deflected)) || Number(Boolean(a.curved)) - Number(Boolean(b.curved)));
        const consumed = new Set<Shot>();
        const contacts: { time: number; order: number; valid: () => boolean; apply: () => void }[] = [];
        const paths = s.shots.map(shot => ({ shot, x: shot.x, y: shot.y, dx: 0, dy: (shot.owner === 'player' ? -480 : d.enemySpeed) / 60 }));
        for (const path of paths) {
            const { shot } = path;
            for (const well of s.wells ?? []) if (Math.abs(shot.y - well.y) < 100) {
                shot.vx = Math.max(-90, Math.min(90, (shot.vx ?? 0) + (well.x - shot.x) * 0.012));
                if (!shot.curved && Math.abs(shot.vx) > 0.001) { shot.curved = true; this.events.push('gravity'); }
            }
            for (const rock of s.asteroids ?? []) if (!shot.deflected && Math.hypot(shot.x - rock.x, shot.y - rock.y) < 24) {
                shot.vx = shot.x < rock.x ? -110 : 110; shot.deflected = true; this.events.push('deflect');
            }
            path.dx = (shot.vx ?? 0) / 60;
        }
        // Only cells inside a swept shot's bounding box can make contact.
        // Keep canonical ordering for every possible hit, including tie breaks.
        const bounds = paths.map(path => ({
            left: Math.min(path.x, path.x + path.dx), right: Math.max(path.x, path.x + path.dx),
            top: Math.min(path.y, path.y + path.dy), bottom: Math.max(path.y, path.y + path.dy),
        }));
        const cells = s.shields.filter(cell => bounds.some(box => {
            const x = cell.x + 2, y = cell.y + 2;
            return x + 3.5 >= box.left && x - 3.5 <= box.right
                && y + 5 >= box.top && y - 5 <= box.bottom;
        })).sort((a, b) => a.y - b.y || a.x - b.x);
        const probes = [...s.probes].sort((a, b) => a.id - b.id);
        for (const path of paths) {
            const { shot } = path;
            const endX = shot.x + path.dx;
            const hit = (x: number, y: number, w: number, h: number, apply: () => void, valid = () => true): void => {
                const time = contactTime(path.x - x, path.y - y, path.dx, path.dy, w / 2 + 1.5, h / 2 + 3);
                if (time === null) return;
                contacts.push({ time, order: contacts.length, valid: () => !consumed.has(shot) && valid(), apply: () => { consumed.add(shot); apply(); } });
            };
            for (const cell of cells) hit(cell.x + 2, cell.y + 2, 4, 4, () => { s.shields = s.shields.filter(c => c !== cell); this.events.push('shield'); }, () => s.shields.includes(cell));
            if (shot.owner === 'player') {
                for (const other of paths) if (other.shot.owner === 'enemy') {
                    // Swept relative motion: both projectiles travel during the tick.
                    const time = contactTime(path.x - other.x, path.y - other.y, path.dx - other.dx, path.dy - other.dy, 5.5, 8);
                    const enemy = other.shot;
                    if (time !== null) contacts.push({ time, order: contacts.length,
                        valid: () => !consumed.has(shot) && !consumed.has(enemy),
                        apply: () => {
                            consumed.add(shot); consumed.add(enemy); this.events.push('intercept');
                            if (s.satellite && other.y > 400 && Math.abs(other.x - s.satellite.x) < 40) this.events.push('satellite-cover');
                        } });
                }
                for (const p of probes) if (this.visible(p)) hit(p.x, p.y, 22, 22, () => {
                    if (this.rotorClosed(p)) { this.events.push('rotor-block'); return; }
                    p.hp--; this.events.push(p.hp > 0 ? 'armor' : 'probe');
                    if (p.hp <= 0) { s.probes = s.probes.filter(probe => probe !== p);
                        if (p.kind === 'split') {
                            const id = Math.max(p.id, ...s.probes.map(probe => probe.id)) + 1;
                            for (const side of [-1, 1]) s.probes.push({ ...p, id: id + (side === 1 ? 1 : 0), column: id + (side === 1 ? 1 : 0), x: p.x + side * 14, y: p.y - 8, hp: 1, maxHp: 1, kind: 'fragment' });
                            this.events.push('split');
                        }
                        s.score += (d.rows - p.row) * 10 * (this.level + 1); }
                }, () => s.probes.includes(p) && this.visible(p));
                if (boss) hit(boss.x, boss.y, 44, 30, () => {
                    if (s.probes.length || !this.bossOpen() || Math.abs(endX - boss.x) > 12) { this.events.push('boss-block'); return; }
                    boss.hp--; this.events.push('boss-hit');
                    if (boss.motif === 6 && boss.hp <= 6 && boss.phase === 1) { boss.phase = 2; this.events.push('boss-phase'); }
                    if (boss.hp <= 0) { s.boss = null; s.score += 500 * (this.level + 1); this.events.push('boss-down'); }
                }, () => s.boss === boss);
                const comet = s.comet;
                if (comet) hit(comet.x, comet.y, 28, 14, () => { s.comet = null; s.score += 150 * (this.level + 1); this.events.push('bonus'); }, () => s.comet === comet);
            } else {
                const satellite = s.satellite;
                if (satellite) hit(satellite.x, satellite.y, 30, 16, () => {
                    satellite.hp--; this.events.push('satellite-hit');
                    if (satellite.hp <= 0) { this.status = 'lost'; this.events.push('satellite-lost'); }
                });
                hit(s.cannon, CANNON_Y, 26, 20, () => {
                if (s.invulnerable <= 0) { s.lives--; s.invulnerable = 1200; this.events.push('life'); if (s.lives <= 0) this.status = 'lost'; }
            });
            }
        }
        contacts.sort((a, b) => a.time - b.time || a.order - b.order);
        for (const contact of contacts) if (contact.valid()) contact.apply();
        s.shots = paths.filter(({ shot }) => !consumed.has(shot)).map(path => {
            path.shot.x += path.dx; path.shot.y += path.dy; return path.shot;
        }).filter(shot => shot.y >= 32 && shot.y <= 630 && shot.x >= -8 && shot.x <= 368);
        if (this.status === 'playing' && !s.probes.length && s.satellite) {
            s.score += s.satellite.hp * 100 * (this.level + 1); s.satellite = null; this.events.push('satellite-saved');
        }
        if (this.status === 'playing' && !s.probes.length && !s.boss) this.status = 'won';
    }
    step(dtMs: number): void {
        if (!Number.isFinite(dtMs) || dtMs < 0) throw new RangeError('Temps invalide');
        this.events = [];
        if (this.status === 'playing') this.remainder += dtMs;
        while (this.remainder + 1e-8 >= TICK && this.status === 'playing') { this.remainder -= TICK; this.tick(); }
        if (this.status !== 'playing') this.remainder = 0;
    }
}
