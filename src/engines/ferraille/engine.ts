import { Random } from '../shared/random';
export const TILE = 16, DT = 1000 / 60, GRAVITY = 900, SPEED = 120, JUMP = 330, MAX_SHOTS = 48;
export { LEVELS } from './levels';
import { LEVELS } from './levels';
import type { Structure, Theme } from './levels';
export interface Rect { x: number; y: number; w: number; h: number }
export interface Body extends Rect { vx: number; vy: number }
export interface Input { x: number; y: number; jump: boolean; fire: boolean }
export type Weapon = 'single' | 'fan' | 'burst' | 'flame' | 'bounce' | 'grenade';
export interface Enemy extends Body { kind: 'crawler' | 'turret' | 'drone' | 'shooter' | 'kamikaze' | 'armored'; hp: number; clock: number; originY: number; phase: number; facing?: number; turned?: number; aim?: number }
export interface Shot extends Body { friendly: boolean; life: number; kind?: Weapon | 'bomb'; bounces?: number }
export interface Platform extends Rect { originX: number; phase: number; dx: number }
export interface Block { kind: 'flat' | 'stairs' | 'gap' | 'moving' | 'wall'; start: number; end: number; gap: number; rise: number }
export interface Bonus extends Rect { kind: Exclude<Weapon, 'single'> | 'shield' }
export interface Boss extends Rect { hp: number; maxHp: number; phase: number; clock: number; pattern?: 'fan' | 'stomp' | 'bombs' | 'sweep' | 'crossfire' | 'reactor'; exposed?: boolean }
export interface Cage extends Rect { hp: number; rescued: boolean }
export interface State {
    theme: Theme; structure: Structure; recovery: boolean; cages: Cage[]; rescued: number; vehicle: boolean; ammo: number;
    tiles: boolean[]; columns: number; blocks: Block[]; platforms: Platform[]; enemies: Enemy[]; bonuses: Bonus[];
    hero: Body; grounded: boolean; crouched: boolean; facing: number; coyote: number; buffer: number; jumpHeld: boolean;
    input: Input; shots: Shot[]; fireClock: number; ticks: number; checkpoint: number; checkpoints: number[];
    shield: boolean; grace: number; lives: number; score: number; weapon: Weapon; boss: Boss | null; door: number;
}
export function difficulty(level: number) {
    const n = Math.max(0, Math.min(29, level));
    return { blocks: 6 + n, enemyDensity: 0.25 + n * 0.015, gapWidth: 2 + Math.floor(n / 10),
        enemySpeed: 19 + n, bossHp: 8 + n };
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
    const config = LEVELS[Math.max(0, Math.min(29, level))];
    if (!config) throw new RangeError('Niveau absent');
    const d = difficulty(level), random = new Random(seed), columns = (d.blocks + 2) * 16;
    const tiles = Array<boolean>(columns * 20).fill(false);
    for (let y = 16; y < 20; y++) for (let x = 0; x < columns; x++) tiles[y * columns + x] = true;
    const blocks: Block[] = [], platforms: Platform[] = [], enemies: Enemy[] = [], bonuses: Bonus[] = [];
    const kinds = ['flat', 'stairs', 'gap', 'moving', 'wall'] as const;
    for (let i = 0; i < d.blocks; i++) {
        const start = (i + 1) * 16;
        const kind = config.structure === 'vehicle' ? (i % 2 ? 'gap' : 'flat') : config.recovery ? 'flat' : kinds[(i + level + Math.floor(random.next() * 5)) % 5] ?? 'flat';
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
        if (i < config.enemies.length || (!config.recovery && i % 4 === 0 && random.next() < d.enemyDensity)) {
            const type = config.enemies[i % config.enemies.length] ?? 'crawler';
            enemies.push({ kind: type, x: (start + 13) * TILE, y: type === 'drone' ? 160 : 242, w: 14, h: 14, vx: -d.enemySpeed, vy: 0, hp: type === 'armored' ? 3 : 1, clock: 0, originY: 160, phase: random.next() * 6, facing: -1, turned: 0, aim: Math.PI });
        }
        // Fixed, safe crate sockets: no random runtime spawning or rejection loops.
        if (i % 3 === 0) bonuses.push({ x: (start + 3) * TILE, y: 232, w: 16, h: 24, kind: level >= 25 && (i % 6 === 0) ? 'shield' : config.weapon });
    }
    // Elevated one-way shelves support both ascent and descent without trapping the runner.
    if (config.structure === 'ascent' || config.structure === 'descent') {
        for (let i = 0; i < 6; i++) {
            const y = config.structure === 'ascent' ? 224 - i * 24 : 104 + i * 24;
            platforms.push({ x: 320 + i * 52, y, w: 64, h: 8, originX: 320 + i * 52, phase: 0, dx: 0 });
        }
    }
    if (config.structure === 'ascent' || config.structure === 'descent') {
        // A real stepped floor makes the vertical route part of traversal.
        for (let x = 0; x < 80; x++) {
            const height = config.structure === 'ascent' ? Math.min(4, Math.max(0, Math.floor((x - 20) / 8))) : Math.max(0, 4 - Math.floor(x / 8));
            for (let y = 0; y < 20; y++) tiles[y * columns + x] = y >= 16 - height;
        }
        const surface = (x: number): number => {
            for (let y = 0; y < 20; y++) if (tiles[y * columns + Math.floor(x / TILE)]) return y * TILE;
            return 256;
        };
        for (const bonus of bonuses) bonus.y = surface(bonus.x) - bonus.h;
        for (const enemy of enemies) if (enemy.kind !== 'drone') enemy.y = surface(enemy.x) - enemy.h;
    }
    const cages: Cage[] = config.structure === 'rescue' ? [560, 1072, 1584].map(x => ({ x, y: 224, w: 24, h: 32, hp: 3, rescued: false })) : [];
    const door = (columns - 5) * TILE;
    if (config.structure === 'arena') for (let x = Math.floor((door - 400) / TILE); x < columns; x++) for (let y = 0; y < 20; y++) tiles[y * columns + x] = y >= 16;
    const boss: Boss | null = (level + 1) % 5 === 0 ? { x: door - 48, y: 220, w: 30, h: 36, hp: d.bossHp, maxHp: d.bossHp, phase: 1, clock: 0, pattern: config.boss, exposed: false } : null;
    const s: State = { theme: config.theme, structure: config.structure, recovery: config.recovery, cages, rescued: 0, vehicle: config.structure === 'vehicle', ammo: 0, tiles, columns, blocks, platforms, enemies, bonuses, hero: { x: 32, y: 234, w: 12, h: 22, vx: 0, vy: 0 },
        grounded: true, crouched: false, facing: 1, coyote: 100, buffer: 0, jumpHeld: false, input: { x: 0, y: 0, jump: false, fire: false },
        shots: [], fireClock: 0, ticks: 0, checkpoint: 32, checkpoints: blocks.filter((_, i) => i % 3 === 2).map(b => (b.start + 2) * TILE),
        shield: false, grace: 0, lives: 3, score: 0, weapon: 'single', boss, door };
    if (config.structure === 'descent') s.hero.y = 170;
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
    loadState(state: State): void { this.state = { ...generate(this.level, this.seed), ...structuredClone(state) }; this.accumulator = 0; this.status = 'playing'; }
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
        s.hero.x = s.checkpoint; s.hero.y = 210;
        for (let y = 0; y < 20; y++) if (solid(s, Math.floor(s.checkpoint / TILE), y)) { s.hero.y = y * TILE - s.hero.h - 24; break; } s.hero.vx = s.hero.vy = 0;
        s.grace = 1800; s.shots = []; s.weapon = 'single'; s.ammo = 0;
    }
    private shoot(x: number, y: number, dx: number, dy: number, friendly: boolean): Shot | undefined {
        const s = this.state; if (s.shots.length >= MAX_SHOTS) return;
        const length = Math.hypot(dx, dy) || 1, speed = friendly ? 280 : 100 + this.level;
        s.shots.push({ x, y, w: 4, h: 4, vx: Math.abs(dx) < 1e-10 ? 0 : dx / length * speed, vy: Math.abs(dy) < 1e-10 ? 0 : dy / length * speed, friendly, life: friendly && s.weapon === 'flame' ? 260 : friendly && s.weapon === 'grenade' ? 1100 : 2400, kind: friendly ? s.weapon : 'single', bounces: 0 });
        const shot = s.shots[s.shots.length - 1];
        if (!shot) return;
        if (friendly && s.weapon === 'grenade') { shot.vx = Math.sign(dx || s.facing) * 170; shot.vy = -260; }
        return shot;
    }
    private hitEnemy(enemy: Enemy, shot: Shot): void {
        if (enemy.kind === 'armored' && !(enemy.turned ?? 0) && Math.sign(shot.vx) !== (enemy.facing ?? -1)) return;
        enemy.hp--; this.state.score += 100; this.events.push('hit');
    }
    private explode(shot: Shot): void {
        const s = this.state;
        for (const enemy of s.enemies) if (Math.hypot(enemy.x - shot.x, enemy.y - shot.y) <= 64) {
            enemy.turned = 2200; enemy.hp -= 2; s.score += 100; this.events.push('hit');
        }
        for (const cage of s.cages) if (Math.hypot(cage.x - shot.x, cage.y - shot.y) <= 64) cage.hp = 0;
        if (s.boss?.exposed && Math.hypot(s.boss.x - shot.x, s.boss.y - shot.y) <= 64) s.boss.hp -= 2;
        shot.life = 0;
    }
    private tick(): void {
        const s = this.state, h = s.hero, dt = DT / 1000; s.ticks++;
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
        h.vx = s.vehicle ? 210 + Math.sign(s.input.x) * 30 : Math.sign(s.input.x) * SPEED * (s.crouched ? 0.4 : 1); if (h.vx) s.facing = Math.sign(h.vx);
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
        s.bonuses = s.bonuses.filter(b => { if (!overlaps(h, b)) return true; if (b.kind === 'shield') s.shield = true; else { s.weapon = b.kind; s.ammo = b.kind === 'flame' ? 180 : b.kind === 'grenade' ? 12 : 36; } s.score += 25; this.events.push('bonus'); return false; });
        if (s.input.fire && s.fireClock <= 0) {
            let dx = Math.sign(s.input.x), dy = Math.sign(s.input.y);
            if (!dx && !dy) dx = s.facing;
            if (!s.grounded && dx && dy) dy = 0;
            const angle = Math.atan2(dy, dx);
            for (const offset of s.weapon === 'fan' ? [-0.22, 0, 0.22] : [0]) this.shoot(h.x + 4, h.y + (dy > 0 ? 2 : 6), Math.cos(angle + offset), Math.sin(angle + offset), true);
            s.fireClock = s.weapon === 'flame' ? 50 : s.weapon === 'burst' ? 90 : s.weapon === 'grenade' ? 600 : 240;
            if (s.weapon !== 'single' && --s.ammo <= 0) { s.weapon = 'single'; s.ammo = 0; }
            this.events.push('shot');
        }
        for (const e of s.enemies) {
            if (Math.abs(e.x - h.x) > 360) continue;
            e.clock += DT;
            if (e.kind === 'crawler') {
                const ahead = e.vx < 0 ? e.x - 2 : e.x + e.w + 2;
                if (!solid(s, Math.floor(ahead / TILE), Math.floor((e.y + e.h + 1) / TILE)) || solid(s, Math.floor(ahead / TILE), Math.floor(e.y / TILE))) e.vx *= -1;
                move(s, e, 'x', e.vx * dt);
            } else if (e.kind === 'kamikaze') {
                if (e.clock <= DT || e.clock >= 1300) { e.facing = Math.sign(h.x - e.x) || -1; e.clock = DT; }
                e.vx = e.clock < 950 ? (e.facing ?? -1) * 95 : 0;
                move(s, e, 'x', e.vx * dt);
                e.vy += GRAVITY * dt; move(s, e, 'y', e.vy * dt);
            } else if (e.kind === 'drone') {
                e.x += e.vx * dt; e.y = e.originY + Math.sin(s.ticks / 24 + e.phase) * 22;
                if (e.clock >= 1400 && Math.abs(h.x - e.x) < 340) {
                    e.clock = 0; const bomb = this.shoot(e.x, e.y + 14, 0, 1, false); if (bomb) { bomb.kind = 'bomb'; bomb.vx = 0; bomb.vy = 40; }
                }
            } else if (e.kind === 'armored') {
                e.turned = Math.max(0, (e.turned ?? 0) - DT);
                e.facing ??= -1;
                if (!e.turned) { e.vx = e.facing * 24; if (move(s, e, 'x', e.vx * dt)) e.facing *= -1; }
                else e.vx = 0;
            } else if (e.kind === 'shooter') {
                // Walk, plant feet, lock aim, then fire at the stored position.
                if (e.clock < 600) { e.vx = Math.sign(h.x - e.x) * 25; move(s, e, 'x', e.vx * dt); }
                else { e.vx = 0; if (e.clock < 620) e.aim = Math.atan2(h.y - e.y, h.x - e.x); }
                if (e.clock >= 1200 && Math.abs(h.x - e.x) < 360) { this.shoot(e.x, e.y + 4, Math.cos(e.aim ?? 0), Math.sin(e.aim ?? 0), false); e.clock = 0; }
            } else {
                const target = Math.atan2(h.y - e.y, h.x - e.x), aim = e.aim ?? Math.PI;
                const turn = Math.atan2(Math.sin(target - aim), Math.cos(target - aim));
                e.aim = aim + Math.max(-0.012, Math.min(0.012, turn)); e.vx = 0;
                if (Math.abs(h.x - e.x) < 360 && e.clock >= 2000) {
                    for (const offset of [-0.10, 0, 0.10]) this.shoot(e.x + 5, e.y + 5, Math.cos(e.aim + offset), Math.sin(e.aim + offset), false);
                    e.clock = 0;
                }
            }
            if (overlaps(h, e)) this.damage();
        }
        const boss = s.boss;
        if (boss) {
            boss.phase = boss.hp <= boss.maxHp / 3 ? 3 : boss.hp <= boss.maxHp * 2 / 3 ? 2 : 1;
            const previousClock = boss.clock;
            if (Math.abs(h.x - boss.x) < 330) boss.clock += DT;
            // Telegraph/attack for 1.2 s, then expose the core for 1.2 s.
            boss.exposed = boss.clock % 2400 >= 1200;
            const pattern = boss.pattern ?? 'fan';
            if (pattern === 'sweep' && boss.clock < 1200 && Math.floor(boss.clock / 200) > Math.floor(previousClock / 200)) {
                const angle = -0.6 + Math.floor(boss.clock / 200) * 0.2;
                this.shoot(boss.x, boss.y + 14, -Math.cos(angle), Math.sin(angle), false);
            }
            if (boss.clock >= 2400) boss.clock = 0;
            if (boss.clock >= 600 && previousClock < 600) {
                if (pattern === 'stomp' || (pattern === 'reactor' && boss.phase === 2)) {
                    this.shoot(boss.x, 250, -1, 0, false);
                    this.shoot(boss.x, 250, 1, 0, false);
                } else if (pattern === 'bombs' || (pattern === 'reactor' && boss.phase === 3)) {
                    for (const offset of [-70, 0, 70]) { const bomb = this.shoot(h.x + offset, 80, 0, 1, false); if (bomb) bomb.kind = 'bomb'; }
                } else if (pattern === 'crossfire') {
                    this.shoot(h.x - 110, h.y + 6, 1, 0, false);
                    this.shoot(h.x + 110, h.y + 6, -1, 0, false);
                } else if (pattern !== 'sweep') {
                    for (const offset of [-0.18, 0, 0.18]) this.shoot(boss.x, boss.y + 14, -Math.cos(offset), Math.sin(offset), false);
                }
            }
            if (overlaps(h, boss)) this.damage();
        }
        for (const shot of s.shots) {
            shot.life -= DT;
            if (shot.kind === 'grenade' || shot.kind === 'bomb') shot.vy += GRAVITY * dt;
            const vx = shot.vx, vy = shot.vy;
            const wallX = move(s, shot, 'x', vx * dt), wallY = move(s, shot, 'y', vy * dt);
            if (shot.kind === 'bounce' && (wallX || wallY) && (shot.bounces ?? 0) < 6) {
                shot.vx = wallX ? -vx : vx; shot.vy = wallY ? -vy : vy; shot.bounces = (shot.bounces ?? 0) + 1;
            } else if (wallX || wallY) shot.life = 0;
            if (shot.kind === 'grenade' && shot.life <= 0) { this.explode(shot); continue; }
            if (shot.life <= 0) continue;
            if (shot.friendly) {
                if (shot.kind === 'grenade' && (s.enemies.some(e => overlaps(e, shot)) || s.cages.some(c => !c.rescued && overlaps(c, shot)) || (boss && overlaps(boss, shot)))) { this.explode(shot); continue; }
                const target = s.enemies.find(e => e.hp > 0 && overlaps(e, shot));
                if (target) {
                    this.hitEnemy(target, shot);
                    shot.life = 0;
                }
                for (const cage of s.cages) if (!cage.rescued && overlaps(cage, shot)) { cage.hp--; shot.life = 0; }
                if (boss && overlaps(boss, shot)) {
                    if (boss.exposed) { boss.hp--; s.score += 20; this.events.push('hit'); }
                    shot.life = 0;
                }
            } else if (overlaps(h, shot)) { shot.life = 0; this.damage(); }
        }
        for (const cage of s.cages) if (!cage.rescued && cage.hp <= 0) { cage.rescued = true; s.rescued++; s.score += 300; this.events.push('bonus'); }
        s.enemies = s.enemies.filter(e => e.hp > 0 && e.y < 340); s.shots = s.shots.filter(p => p.life > 0);
        if ((boss && boss.hp <= 0) || (!boss && h.x + h.w >= s.door)) { this.status = 'won'; s.score += 500; this.events.push('won'); }
    }
}
