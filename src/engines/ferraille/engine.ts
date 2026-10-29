import { Random } from '../shared/random';
export const TILE = 16, DT = 1000 / 60, GRAVITY = 900, SPEED = 120, JUMP = 330, MAX_SHOTS = 48;
export const LEVELS = Array.from({ length: 30 }, (_, i) => ({ name: `Atelier ${String(i + 1)}` }));
export interface Rect { x: number; y: number; w: number; h: number }
export interface Body extends Rect { vx: number; vy: number }
export interface Input { x: number; y: number; jump: boolean; fire: boolean }
export type Weapon = 'single' | 'fan' | 'burst';
export interface Enemy extends Body { kind: 'crawler' | 'turret' | 'drone'; hp: number; clock: number; originY: number; phase: number }
export interface Shot extends Body { friendly: boolean; life: number }
export interface Platform extends Rect { originX: number; phase: number; dx: number }
export interface Block { kind: 'flat' | 'stairs' | 'gap' | 'moving' | 'wall'; start: number; end: number; gap: number; rise: number }
export interface Bonus extends Rect { kind: 'fan' | 'burst' | 'shield' }
export interface Boss extends Rect { hp: number; maxHp: number; phase: number; clock: number }
export interface State {
    tiles: boolean[]; columns: number; blocks: Block[]; platforms: Platform[]; enemies: Enemy[]; bonuses: Bonus[];
    hero: Body; grounded: boolean; crouched: boolean; facing: number; coyote: number; buffer: number; jumpHeld: boolean;
    input: Input; shots: Shot[]; fireClock: number; ticks: number; checkpoint: number; checkpoints: number[];
    shield: boolean; grace: number; lives: number; score: number; weapon: Weapon; boss: Boss | null; door: number;
}
export function difficulty(level: number) {
    const n = Math.max(0, Math.min(29, level));
    return { blocks: 6 + n, enemyDensity: 0.25 + n * 0.015, gapWidth: 2 + Math.floor(n / 10), turretRate: 0.5 + n * 0.025,
        enemySpeed: 19 + n, bossHp: 8 + n, bossPatterns: 1 + Math.floor(n / 5) };
}
export function overlaps(a: Rect, b: Rect): boolean { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
export function solid(s: State, x: number, y: number): boolean {
    if (x < 0) return true;
    if (y < 0 || y >= 20 || x >= s.columns) return false;
    return s.tiles[y * s.columns + x] ?? false;
}
export function jumpEnvelope(gap: number, rise = 0): boolean {
    const discriminant = JUMP * JUMP - 2 * GRAVITY * rise;
    return discriminant >= 0 && gap <= SPEED * (JUMP + Math.sqrt(discriminant)) / GRAVITY - 12;
}
export function traversable(s: State): boolean {
    return s.blocks.every(b => jumpEnvelope(b.gap * TILE, b.rise * TILE));
}
export function generate(level: number, seed: number): State {
    const d = difficulty(level), random = new Random(seed), columns = (d.blocks + 2) * 16;
    const tiles = Array<boolean>(columns * 20).fill(false);
    for (let y = 16; y < 20; y++) for (let x = 0; x < columns; x++) tiles[y * columns + x] = true;
    const blocks: Block[] = [], platforms: Platform[] = [], enemies: Enemy[] = [], bonuses: Bonus[] = [];
    const kinds = ['flat', 'stairs', 'gap', 'moving', 'wall'] as const;
    for (let i = 0; i < d.blocks; i++) {
        const start = (i + 1) * 16, kind = kinds[(i + Math.floor(random.next() * 5)) % 5] ?? 'flat';
        const gap = kind === 'gap' || kind === 'moving' ? d.gapWidth : 0;
        const rise = kind === 'wall' ? 3 : kind === 'stairs' ? 2 : 0;
        blocks.push({ kind, start, end: start + 16, gap, rise });
        for (let x = start + 7; x < start + 7 + gap; x++) for (let y = 16; y < 20; y++) tiles[y * columns + x] = false;
        if (kind === 'stairs' || kind === 'wall') {
            for (let x = start + 6; x < start + 10; x++) {
                const height = kind === 'stairs' ? Math.min(2, x - start - 5) : 3;
                for (let y = 16 - height; y < 16; y++) tiles[y * columns + x] = true;
            }
        }
        if (kind === 'moving') platforms.push({ x: (start + 7) * TILE, y: 224, w: 48, h: 8, originX: (start + 7) * TILE, phase: random.next() * 6, dx: 0 });
        if (random.next() < d.enemyDensity) {
            const type = (['crawler', 'turret', 'drone'] as const)[i % 3] ?? 'crawler';
            enemies.push({ kind: type, x: (start + 13) * TILE, y: type === 'drone' ? 190 : 242, w: 14, h: 14, vx: -d.enemySpeed, vy: 0, hp: 1, clock: 0, originY: 190, phase: random.next() * 6 });
        }
        // Fixed, safe crate sockets: no random runtime spawning or rejection loops.
        if (i % 3 === 0) bonuses.push({ x: (start + 3) * TILE, y: 232, w: 16, h: 24, kind: (['fan', 'burst', 'shield'] as const)[Math.floor(i / 3) % 3] ?? 'shield' });
    }
    const door = (columns - 5) * TILE;
    const boss: Boss | null = (level + 1) % 5 === 0 ? { x: door - 48, y: 220, w: 30, h: 36, hp: d.bossHp, maxHp: d.bossHp, phase: 1, clock: 0 } : null;
    const s: State = { tiles, columns, blocks, platforms, enemies, bonuses, hero: { x: 32, y: 234, w: 12, h: 22, vx: 0, vy: 0 },
        grounded: true, crouched: false, facing: 1, coyote: 100, buffer: 0, jumpHeld: false, input: { x: 0, y: 0, jump: false, fire: false },
        shots: [], fireClock: 0, ticks: 0, checkpoint: 32, checkpoints: blocks.filter((_, i) => i % 3 === 2).map(b => (b.start + 2) * TILE),
        shield: false, grace: 0, lives: 3, score: 0, weapon: 'single', boss, door };
    if (!traversable(s)) throw new Error('Terrain hors enveloppe');
    return s;
}
/** Swept movement in substeps smaller than a tile, resolved X then Y. */
export function move(s: State, b: Body, axis: 'x' | 'y', amount: number): boolean {
    const pieces = Math.max(1, Math.ceil(Math.abs(amount) / 4)), delta = amount / pieces;
    for (let i = 0; i < pieces; i++) {
        b[axis] += delta;
        for (let y = Math.floor(b.y / TILE); y <= Math.floor((b.y + b.h - 0.001) / TILE); y++) {
            for (let x = Math.floor(b.x / TILE); x <= Math.floor((b.x + b.w - 0.001) / TILE); x++) {
                if (!solid(s, x, y)) continue;
                b[axis] = axis === 'x' ? (delta > 0 ? x * TILE - b.w : (x + 1) * TILE) : (delta > 0 ? y * TILE - b.h : (y + 1) * TILE);
                if (axis === 'x') b.vx = 0; else b.vy = 0;
                return true;
            }
        }
    }
    return false;
}
export class Engine {
    level = 0; seed = 460; status: 'playing' | 'won' | 'lost' = 'playing';
    state = generate(0, 460); events: string[] = []; private accumulator = 0;
    loadLevel(level: number, seed = 460): void { this.level = Math.max(0, Math.min(29, level)); this.seed = seed; this.state = generate(this.level, seed); this.status = 'playing'; this.accumulator = 0; this.events = []; }
    loadState(state: State): void { this.state = structuredClone(state); this.accumulator = 0; this.status = 'playing'; }
    input(input: Partial<Input>): void { Object.assign(this.state.input, input); }
    snapshot() { return structuredClone({ ...this.state, level: this.level, seed: this.seed, status: this.status, accumulator: this.accumulator }); }
    step(dtMs: number): void {
        this.events = []; this.accumulator += Math.max(0, dtMs);
        while (this.accumulator + 1e-7 >= DT) { this.accumulator -= DT; if (Math.abs(this.accumulator) < 1e-7) this.accumulator = 0; if (this.status === 'playing') this.tick(); }
    }
    private damage(fall = false): void {
        const s = this.state;
        if (!fall && s.grace > 0) return;
        if (!fall && s.shield) { s.shield = false; s.grace = 1000; this.events.push('shield'); return; }
        s.lives--; this.events.push('life'); s.shield = false;
        if (s.lives <= 0) { this.status = 'lost'; return; }
        s.hero.x = s.checkpoint; s.hero.y = 210; s.hero.vx = s.hero.vy = 0;
        s.grace = 1800; s.shots = []; s.weapon = 'single';
    }
    private shoot(x: number, y: number, dx: number, dy: number, friendly: boolean): void {
        const s = this.state; if (s.shots.length >= MAX_SHOTS) return;
        const length = Math.hypot(dx, dy) || 1, speed = friendly ? 280 : 100 + this.level;
        s.shots.push({ x, y, w: 4, h: 4, vx: Math.abs(dx) < 1e-10 ? 0 : dx / length * speed, vy: Math.abs(dy) < 1e-10 ? 0 : dy / length * speed, friendly, life: 2400 });
    }
    private tick(): void {
        const s = this.state, h = s.hero, dt = DT / 1000, d = difficulty(this.level); s.ticks++;
        s.grace = Math.max(0, s.grace - DT); s.fireClock -= DT;
        s.coyote = s.grounded ? 100 : Math.max(0, s.coyote - DT);
        s.buffer = s.input.jump && !s.jumpHeld ? 100 : Math.max(0, s.buffer - DT);
        if (s.buffer > 0 && s.coyote > 1e-7) { h.vy = -JUMP; s.buffer = s.coyote = 0; s.grounded = false; this.events.push('jump'); }
        if (!s.input.jump && s.jumpHeld && h.vy < -120) h.vy = -120;
        s.jumpHeld = s.input.jump;
        const crouch = s.input.y > 0 && s.grounded;
        if (crouch !== s.crouched) {
            const candidate = { ...h, y: h.y + (crouch ? 8 : -8), h: crouch ? 14 : 22 };
            const blocked = !crouch && [candidate.x, candidate.x + candidate.w - 0.01].some(x => solid(s, Math.floor(x / TILE), Math.floor(candidate.y / TILE)));
            if (!blocked) { h.y = candidate.y; h.h = candidate.h; s.crouched = crouch; }
        }
        h.vx = Math.sign(s.input.x) * SPEED * (s.crouched ? 0.4 : 1); if (h.vx) s.facing = Math.sign(h.vx);
        move(s, h, 'x', h.vx * dt); h.vy = Math.min(500, h.vy + GRAVITY * dt);
        const oldBottom = h.y + h.h;
        s.grounded = move(s, h, 'y', h.vy * dt) && h.vy === 0 && h.y + h.h >= oldBottom;
        for (const p of s.platforms) {
            const oldX = p.x; p.x = p.originX + Math.sin(s.ticks / 60 + p.phase) * 20; p.dx = p.x - oldX;
            if (h.vy >= 0 && oldBottom <= p.y + 1 && h.y + h.h >= p.y && h.x + h.w > p.x && h.x < p.x + p.w) {
                h.y = p.y - h.h; h.vy = 0; s.grounded = true; move(s, h, 'x', p.dx);
            }
        }
        if (h.y > 340) { this.damage(true); return; }
        for (const x of s.checkpoints) if (h.x >= x && x > s.checkpoint) { s.checkpoint = x; s.score += 50; this.events.push('checkpoint'); }
        s.bonuses = s.bonuses.filter(b => { if (!overlaps(h, b)) return true; if (b.kind === 'shield') s.shield = true; else s.weapon = b.kind; s.score += 25; this.events.push('bonus'); return false; });
        if (s.input.fire && s.fireClock <= 0) {
            let dx = Math.sign(s.input.x), dy = Math.sign(s.input.y);
            if (!dx && !dy) dx = s.facing;
            if (!s.grounded && dx && dy) dy = 0;
            const angle = Math.atan2(dy, dx);
            for (const offset of s.weapon === 'fan' ? [-0.22, 0, 0.22] : [0]) this.shoot(h.x + 4, h.y + (dy > 0 ? 2 : 6), Math.cos(angle + offset), Math.sin(angle + offset), true);
            s.fireClock = s.weapon === 'burst' ? 90 : 240; this.events.push('shot');
        }
        for (const e of s.enemies) {
            e.clock += DT;
            if (e.kind === 'crawler') {
                const ahead = e.vx < 0 ? e.x - 2 : e.x + e.w + 2;
                if (!solid(s, Math.floor(ahead / TILE), Math.floor((e.y + e.h + 1) / TILE)) || solid(s, Math.floor(ahead / TILE), Math.floor(e.y / TILE))) e.vx *= -1;
                move(s, e, 'x', e.vx * dt);
            } else if (e.kind === 'drone') { e.x += e.vx * dt; e.y = e.originY + Math.sin(e.clock / 400 + e.phase) * 22; }
            else if (Math.abs(h.x - e.x) < 360 && e.clock >= 1000 / d.turretRate) { e.clock = 0; this.shoot(e.x + 5, e.y + 5, h.x - e.x, h.y - e.y, false); }
            if (overlaps(h, e)) this.damage();
        }
        const boss = s.boss;
        if (boss) {
            boss.phase = boss.hp <= boss.maxHp / 3 ? 3 : boss.hp <= boss.maxHp * 2 / 3 ? 2 : 1;
            if (Math.abs(h.x - boss.x) < 330) {
                boss.clock += DT;
                if (boss.clock >= 1400 / (boss.phase + d.bossPatterns * 0.15)) {
                    boss.clock = 0;
                    for (let k = 0; k < Math.min(5, boss.phase + d.bossPatterns - 1); k++) this.shoot(boss.x, boss.y + 14, h.x - boss.x, h.y - boss.y + (k - 1) * 30, false);
                }
            }
            if (overlaps(h, boss)) this.damage();
        }
        for (const shot of s.shots) {
            shot.life -= DT;
            const wall = move(s, shot, 'x', shot.vx * dt) || move(s, shot, 'y', shot.vy * dt);
            if (wall) shot.life = 0;
            if (shot.life <= 0) continue;
            if (shot.friendly) {
                const target = s.enemies.find(e => e.hp > 0 && overlaps(e, shot));
                if (target) { target.hp--; shot.life = 0; s.score += 100; this.events.push('hit'); }
                if (boss && overlaps(boss, shot)) { boss.hp--; shot.life = 0; s.score += 20; this.events.push('hit'); }
            } else if (overlaps(h, shot)) { shot.life = 0; this.damage(); }
        }
        s.enemies = s.enemies.filter(e => e.hp > 0); s.shots = s.shots.filter(p => p.life > 0);
        if ((boss && boss.hp <= 0) || (!boss && h.x + h.w >= s.door)) { this.status = 'won'; s.score += 500; this.events.push('won'); }
    }
}
