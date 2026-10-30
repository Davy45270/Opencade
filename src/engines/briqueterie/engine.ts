import { Random } from '../shared/random';
import { designs } from './levels';
export const STEP = 1000 / 60;
export const RADIUS = 6;
export type BrickKind = 'plain' | 'moving' | 'explosive' | 'regen' | 'portal' | 'angle' | 'key' | 'locked' | 'multi' | 'gravity' | 'anchor' | 'hanging';
export interface Brick { kind?: BrickKind; homeX?: number; phase?: number; healAt?: number; falling?: boolean; x: number; y: number; w: number; h: number; hp: number; solid: boolean }
export interface Ball { x: number; y: number; vx: number; vy: number; portalUntil?: number }
export type BonusKind = 'wide' | 'multi' | 'life';
export interface Bonus { x: number; y: number; kind: BonusKind }
export interface State { bricks: Brick[]; balls: Ball[]; bonuses: Bonus[]; paddle: number; width: number; lives: number; score: number; ready: boolean; bounces: number; speed: number; wideUntil: number }
export function difficulty(level: number) {
    if (!Number.isInteger(level) || level < 0 || level >= 30) throw new RangeError('Niveau invalide');
    const design = designs[level];
    if (!design) throw new RangeError('Niveau invalide');
    const bricks = design.rows.join('').split('').filter(c => c !== '.');
    return { speed: 4 + 5 * level / 29, cap: 7 + 6 * level / 29, density: bricks.filter(c => c !== '#').length, hp: 1, solids: bricks.filter(c => c === '#').length, narrowness: level, pattern: level, width: design.rest ? 108 : 92 - level };
}
export const LEVELS = designs.map(d => ({ name: d.name }));
const kinds: Record<string, BrickKind> = { m: 'moving', e: 'explosive', r: 'regen', p: 'portal', a: 'angle', k: 'key', L: 'locked', b: 'multi', g: 'gravity', t: 'anchor', h: 'hanging' };
export function bricksFor(level: number, random: Random): Brick[] {
    difficulty(level);
    const design = designs[level];
    if (!design) return [];
    const phase = random.next() * Math.PI * 2;
    return design.rows.flatMap((row, y) => Array.from(row).flatMap((c, x): Brick[] => c === '.' ? [] : [{
        x: 11 + x * 34, y: 64 + y * 27, w: 28, h: 18,
        hp: c === 'r' ? 2 : 1, solid: c === '#' || c === 'L', kind: kinds[c] ?? 'plain',
        ...(c === 'm' ? { homeX: 11 + x * 34, phase } : {}),
    }]));
}
interface Hit { t: number; nx: number; ny: number; brick?: Brick; paddle?: boolean }
/** Swept circle against rectangle: face segments and rounded corner quadratics. */
export function contact(ball: Ball, box: { x: number; y: number; w: number; h: number }, limit: number): Hit | null {
    if (Math.max(ball.x, ball.x + ball.vx * limit) + RADIUS < box.x || Math.min(ball.x, ball.x + ball.vx * limit) - RADIUS > box.x + box.w || Math.max(ball.y, ball.y + ball.vy * limit) + RADIUS < box.y || Math.min(ball.y, ball.y + ball.vy * limit) - RADIUS > box.y + box.h) return null;
    const hits: Hit[] = [];
    const face = (t: number, nx: number, ny: number, value: number, low: number, high: number): void => {
        if (t >= -1e-8 && t <= limit + 1e-8 && value >= low - 1e-8 && value <= high + 1e-8 && ball.vx * nx + ball.vy * ny < -1e-8) hits.push({ t: Math.max(0, t), nx, ny });
    };
    if (ball.vx !== 0) for (const [x, nx] of [[box.x - RADIUS, -1], [box.x + box.w + RADIUS, 1]] as const) { const t = (x - ball.x) / ball.vx; face(t, nx, 0, ball.y + ball.vy * t, box.y, box.y + box.h); }
    if (ball.vy !== 0) for (const [y, ny] of [[box.y - RADIUS, -1], [box.y + box.h + RADIUS, 1]] as const) { const t = (y - ball.y) / ball.vy; face(t, 0, ny, ball.x + ball.vx * t, box.x, box.x + box.w); }
    for (const [cx, sx] of [[box.x, -1], [box.x + box.w, 1]] as const) for (const [cy, sy] of [[box.y, -1], [box.y + box.h, 1]] as const) {
        const dx = ball.x - cx, dy = ball.y - cy, a = ball.vx ** 2 + ball.vy ** 2, b = 2 * (dx * ball.vx + dy * ball.vy), c = dx ** 2 + dy ** 2 - RADIUS ** 2, disc = b * b - 4 * a * c;
        if (a === 0 || disc < 0) continue;
        const t = (-b - Math.sqrt(disc)) / (2 * a), x = dx + ball.vx * t, y = dy + ball.vy * t;
        if (x * sx >= -1e-8 && y * sy >= -1e-8) face(t, x / RADIUS, y / RADIUS, 0, 0, 0);
    }
    return hits.sort((a, b) => a.t - b.t)[0] ?? null;
}
export class Engine {
    level = 0; seed = 455; status: 'playing' | 'won' | 'lost' = 'playing';
    state!: State;
    private random = new Random(455);
    private remainder = 0;
    private ticks = 0;
    events: string[] = [];
    constructor(level = 0, seed = 455) { this.loadLevel(level, seed); }
    loadLevel(level: number, seed = 455): void {
        const d = difficulty(level); this.level = level; this.seed = seed; this.random = new Random(seed); this.status = 'playing'; this.remainder = 0; this.ticks = 0; this.events = [];
        this.state = { bricks: bricksFor(level, this.random), balls: [], bonuses: [], paddle: 180, width: d.width, lives: 3, score: 0, ready: true, bounces: 0, speed: d.speed, wideUntil: 0 };
        this.dock();
    }
    loadState(state: State): void { this.state = structuredClone(state); this.status = 'playing'; this.remainder = 0; this.ticks = 0; this.events = []; }
    private dock(): void { this.state.balls = [{ x: this.state.paddle, y: 574, vx: 0, vy: 0 }]; }
    move(x: number): void { if (!Number.isFinite(x) || this.status !== 'playing') return; this.state.paddle = Math.max(this.state.width / 2, Math.min(360 - this.state.width / 2, x)); if (this.state.ready) this.dock(); }
    launch(): void { if (!this.state.ready || this.status !== 'playing') return; this.state.ready = false; this.state.balls = [{ x: this.state.paddle, y: 574, vx: 0, vy: -this.state.speed }]; this.events.push('launch'); }
    /** At most four drops, entirely inside the field, clear of bricks and other drops. */
    spawnBonus(x: number, y: number, kind: BonusKind): boolean {
        if (this.state.bonuses.length >= 4 || x < 10 || x > 350 || y < 10 || y > 560 || this.state.bricks.some(b => x + 10 > b.x && x - 10 < b.x + b.w && y + 10 > b.y && y - 10 < b.y + b.h) || this.state.bonuses.some(b => Math.abs(b.x - x) < 20 && Math.abs(b.y - y) < 20)) return false;
        this.state.bonuses.push({ x, y, kind }); return true;
    }
    private bonus(kind: BonusKind): void {
        const s = this.state;
        if (kind === 'wide') { s.width = difficulty(this.level).width + 36; s.wideUntil = this.ticks + 600; this.move(s.paddle); }
        if (kind === 'life') s.lives = Math.min(9, s.lives + 1);
        if (kind === 'multi' && !s.ready) {
            const source = s.balls[0];
            if (source) for (const angle of [-0.4, 0.4]) if (s.balls.length < 9) s.balls.push({ x: source.x, y: source.y, vx: s.speed * Math.sin(angle + Math.atan2(source.vx, -source.vy)), vy: -s.speed * Math.cos(angle + Math.atan2(source.vx, -source.vy)) });
        }
        this.events.push('bonus');
    }
    step(dtMs: number): void {
        if (!Number.isFinite(dtMs) || dtMs < 0) throw new RangeError('Temps invalide');
        this.events = [];
        if (this.status === 'playing') this.remainder += dtMs;
        while (this.remainder + 1e-8 >= STEP && this.status === 'playing') { this.remainder -= STEP; this.tick(); }
        if (this.status !== 'playing') this.remainder = 0;
    }
    private tick(): void {
        this.ticks++; const s = this.state;
        if (s.wideUntil && this.ticks >= s.wideUntil) { s.width = difficulty(this.level).width; s.wideUntil = 0; this.move(s.paddle); }
        if (!s.ready) {
            for (const brick of s.bricks) {
                if (brick.kind === 'moving') { brick.x = (brick.homeX ?? brick.x) + 8 * Math.sin(this.ticks / 45 + (brick.phase ?? 0)); this.events.push('moving'); }
                if (brick.kind === 'regen' && brick.hp < 2 && brick.healAt !== undefined && this.ticks >= brick.healAt) { brick.hp = 2; delete brick.healAt; this.events.push('regen'); }
                if (brick.falling && brick.y < 370) { brick.y = Math.min(370, brick.y + 1); this.events.push('falling'); }
            }
            for (const ball of s.balls) {
                if (s.bricks.some(b => b.kind === 'gravity' && Math.abs(ball.x - b.x - b.w / 2) < 52 && ball.y > b.y && ball.y < b.y + 160)) { ball.vy -= 0.045; this.events.push('gravity'); }
            }
            for (const ball of [...s.balls]) this.travel(ball);
            s.balls = s.balls.filter(b => b.y <= 646);
            if (!s.balls.length && this.status === 'playing') { s.lives--; s.bonuses = []; this.events.push('life'); if (s.lives === 0) this.status = 'lost'; else { s.ready = true; this.dock(); } }
        }
        for (const drop of [...s.bonuses]) {
            drop.y += 2;
            if (drop.y >= 574 && drop.y <= 602 && Math.abs(drop.x - s.paddle) <= s.width / 2 + 10) { s.bonuses = s.bonuses.filter(b => b !== drop); this.bonus(drop.kind); }
            else if (drop.y > 650) s.bonuses = s.bonuses.filter(b => b !== drop);
        }
        if (!s.bricks.some(b => !b.solid || b.kind === 'locked')) this.status = 'won';
    }
    private travel(ball: Ball): void {
        const s = this.state; let remaining = 1;
        // At the level cap there are fewer than 16 contacts per step; unused time is kept safe for constructed extreme states.
        for (let iteration = 0; remaining > 1e-8 && iteration < 64; iteration++) {
            const hits: Hit[] = [];
            const wall = (t: number, nx: number, ny: number): void => { if (t >= -1e-8 && t <= remaining) hits.push({ t: Math.max(0, t), nx, ny }); };
            if (ball.vx < 0) wall((6 - ball.x) / ball.vx, 1, 0);
            if (ball.vx > 0) wall((354 - ball.x) / ball.vx, -1, 0);
            if (ball.vy < 0) wall((6 - ball.y) / ball.vy, 0, 1);
            for (const brick of s.bricks) { const hit = contact(ball, brick, remaining); if (hit) hits.push({ ...hit, brick }); }
            if (ball.vy > 0 && ball.y <= 580) { const hit = contact(ball, { x: s.paddle - s.width / 2, y: 586, w: s.width, h: 12 }, remaining); if (hit) hits.push({ ...hit, paddle: true }); }
            const hit = hits.sort((a, b) => a.t - b.t)[0];
            if (!hit) { ball.x += ball.vx * remaining; ball.y += ball.vy * remaining; break; }
            ball.x += ball.vx * hit.t; ball.y += ball.vy * hit.t; remaining -= hit.t;
            if (hit.brick?.kind === 'angle') {
                const sign = hit.ny < 0 ? -1 : 1;
                hit.nx = 0.5; hit.ny = sign * Math.sqrt(0.75); this.events.push('angle');
            }
            if (hit.paddle) { const angle = Math.max(-1, Math.min(1, (ball.x - s.paddle) / (s.width / 2))) * Math.PI / 3; ball.vx = s.speed * Math.sin(angle); ball.vy = -s.speed * Math.cos(angle); }
            else { const dot = ball.vx * hit.nx + ball.vy * hit.ny; ball.vx -= 2 * dot * hit.nx; ball.vy -= 2 * dot * hit.ny; }
            ball.x += hit.nx * 1e-6; ball.y += hit.ny * 1e-6;
            s.bounces++; this.events.push(hit.paddle ? 'paddle' : 'bounce');
            if (s.bounces % 10 === 0) { s.speed = Math.min(difficulty(this.level).cap, s.speed + 0.2); for (const b of s.balls) { const length = Math.hypot(b.vx, b.vy); if (length) { b.vx *= s.speed / length; b.vy *= s.speed / length; } } }
            const brick = hit.brick;
            if (brick?.solid) this.events.push(brick.kind === 'locked' ? 'blocked' : 'solid');
            if (brick && !brick.solid) {
                if (brick.kind === 'portal' && this.ticks >= (ball.portalUntil ?? 0)) {
                    const partner = s.bricks.find(b => b !== brick && b.kind === 'portal');
                    if (partner) { ball.x = partner.x + partner.w / 2; ball.y = partner.y + partner.h + RADIUS + 1; ball.vy = Math.abs(ball.vy); ball.portalUntil = this.ticks + 20; this.events.push('portal'); }
                }
                this.damage(brick);
            }
        }
    }
    private damage(brick: Brick): void {
        const s = this.state;
        if (!s.bricks.includes(brick) || brick.solid) return;
        brick.hp--; s.score += 10; this.events.push('brick');
        if (brick.kind === 'regen' && brick.hp > 0) brick.healAt = this.ticks + 180;
        if (brick.hp > 0) return;
        s.score += 20; s.bricks = s.bricks.filter(b => b !== brick);
        if (brick.kind === 'explosive') {
            this.events.push('explosive');
            for (const neighbor of [...s.bricks]) if (Math.abs(neighbor.x - brick.x) <= 38 && Math.abs(neighbor.y - brick.y) <= 32) this.damage(neighbor);
        }
        if (brick.kind === 'key') {
            for (const b of s.bricks) if (b.kind === 'locked') { b.solid = false; b.kind = 'plain'; this.events.push('key'); }
        }
        if (brick.kind === 'multi') { this.bonus('multi'); this.events.push('multi'); }
        if (brick.kind === 'anchor') {
            for (const b of s.bricks) if (b.kind === 'hanging') b.falling = true;
        }
        const roll = this.random.next();
        if (roll < 0.24) this.spawnBonus(brick.x + brick.w / 2, brick.y + brick.h / 2, (['wide', 'multi', 'life'] as const)[Math.floor(this.random.next() * 3)] ?? 'wide');
    }
    snapshot() { return { ...structuredClone(this.state), level: this.level, seed: this.seed, status: this.status, ticks: this.ticks, remainder: Math.max(0, Math.round(this.remainder * 1e8) / 1e8), random: this.random.state }; }
}
