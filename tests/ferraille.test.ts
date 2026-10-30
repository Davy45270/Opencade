import { behaviors, diversity, campaign, terrain } from './ferraille-behavior';
import { pilot } from '../src/engines/ferraille/pilot';
import { describe, it, expect } from 'vitest';
import { Engine, DT, TILE, SPEED, JUMP, GRAVITY, MAX_SHOTS, generate, difficulty, traversable, jumpEnvelope, move, solid, type Enemy } from '../src/engines/ferraille/engine';
function flat(): Engine {
    const e = new Engine(), s = e.state;
    s.tiles.fill(false); for (let x = 0; x < s.columns; x++) for (let y = 16; y < 20; y++) s.tiles[y * s.columns + x] = true;
    s.modules = []; s.enemies = []; s.bonuses = []; s.platforms = []; s.boss = null; return e;
}
function frames(e: Engine, n: number): void { for (let i = 0; i < n; i++) e.step(DT); }
function enemy(kind: Enemy['kind'], x = 100): Enemy { return { kind, x, y: 242, w: 14, h: 14, vx: 20, vy: 0, hp: 1, clock: 0, originY: 190, phase: 0 }; }
describe('Ferraille', () => {
    it('F01 gravité, hauteur variable, coyote 100 ms et tampon 100 ms', () => {
        const long = flat(), short = flat();
        long.input({ jump: true }); short.input({ jump: true }); frames(long, 1); frames(short, 1);
        expect(long.state.hero.vy).toBe(-JUMP + GRAVITY / 60);
        short.input({ jump: false }); frames(long, 10); frames(short, 10); expect(long.state.hero.y).toBeLessThan(short.state.hero.y - 20);
        for (const age of [83, 117]) { const e = flat(); e.state.grounded = false; e.state.coyote = 100; e.state.hero.y = 170; frames(e, Math.floor(age / DT)); e.input({ jump: true }); e.step(DT); expect(e.state.hero.vy < 0).toBe(age < 100); }
        const buffered = flat(); buffered.state.hero.y = 229; buffered.state.hero.vy = 100; buffered.state.grounded = false; buffered.state.coyote = 0; buffered.input({ jump: true }); frames(buffered, 6); expect(buffered.state.hero.vy).toBeLessThan(-200);
        const expired = flat(); expired.state.hero.y = 150; expired.state.grounded = false; expired.state.coyote = 0; expired.input({ jump: true }); frames(expired, 40); expect(expired.state.hero.y).toBe(234);
    });
    it('F02 AABB axe par axe, mur, plafond, sol et grande vitesse', () => {
        const e = flat(), s = e.state;
        for (let y = 0; y < 16; y++) s.tiles[y * s.columns + 5] = true;
        expect(move(s, s.hero, 'x', 1000)).toBe(true); expect(s.hero.x + s.hero.w).toBe(80);
        s.hero.y = 100; expect(move(s, s.hero, 'y', 1000)).toBe(true); expect(s.hero.y + s.hero.h).toBe(256);
        s.tiles[10 * s.columns + 4] = true; expect(move(s, s.hero, 'y', -200)).toBe(true); expect(s.hero.y).toBe(176);
        e.input({ x: 1 }); frames(e, 120); expect(s.hero.x + s.hero.w).toBeLessThanOrEqual(80);
        e.input({ y: 1 }); e.step(DT); expect(s.hero.h).toBe(14); e.input({ y: 0 }); e.step(DT); expect(s.hero.h).toBe(22);
    });
    it('F03 huit directions au sol, quatre en vol et plafond de projectiles', () => {
        for (const [x, y] of [[1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]]) {
            const e = flat(); e.input({ x, y, fire: true }); e.step(DT); const shot = e.state.shots[0]; expect(shot).toBeDefined(); expect(Math.sign(shot?.vx ?? 0)).toBe(x); expect(Math.sign(shot?.vy ?? 0)).toBe(x && (y ?? 0) > 0 ? 0 : y);
        }
        const e = flat(); e.state.hero.y = 100; e.state.grounded = false; e.input({ x: 1, y: -1, fire: true }); e.step(DT); expect(e.state.shots[0]?.vy).toBe(0);
        e.state.weapon = 'fan'; e.state.fireClock = 0; e.state.shots = Array.from({ length: MAX_SHOTS }, () => ({ x: 50, y: 100, w: 4, h: 4, vx: 0, vy: 0, friendly: true, life: 1000 })); e.step(DT); expect(e.state.shots).toHaveLength(MAX_SHOTS);
    });
    it('F04 rampant se retourne au bord et devant un mur', () => {
        const e = flat(), c = enemy('crawler', 66); e.state.enemies = [c]; e.state.tiles[16 * e.state.columns + 5] = false; e.step(DT); expect(c.vx).toBe(-20);
        c.x = 96; c.vx = 20; e.state.tiles[15 * e.state.columns + 7] = true; e.step(DT); expect(c.vx).toBe(-20);
    });
    it('F05 tourelle vise réellement le héros et respecte sa cadence', () => {
        const e = flat(), t = enemy('turret', 160); e.state.enemies = [t]; frames(e, 119); expect(e.state.shots).toHaveLength(0); e.step(DT); expect(e.state.shots).toHaveLength(3);
        const p = e.state.shots[1]; expect(p?.friendly).toBe(false); expect(p?.vx).toBeLessThan(0); expect(p?.vy).toBeLessThan(0); frames(e, 20); expect(t.clock).toBeCloseTo(20 * DT);
    });
    it('F06 drone suit une sinusoïde déterministe', () => {
        const e = flat(), d = enemy('drone', 200); e.state.enemies = [d]; frames(e, 30); expect(d.x).toBeCloseTo(210); expect(d.y).toBeCloseTo(190 + Math.sin(500 / 400) * 22);
    });
    it('F07 bouclier, invulnérabilité et trois vies', () => {
        const e = flat(); e.state.shield = true; e.state.enemies = [enemy('turret', 32)]; e.step(DT); expect(e.state.shield).toBe(false); expect(e.state.lives).toBe(3); frames(e, 20); expect(e.state.lives).toBe(3);
        e.state.grace = 0; e.step(DT); expect(e.state.lives).toBe(2); expect(e.state.grace).toBeGreaterThan(0);
        for (let i = 0; i < 2; i++) { e.state.grace = 0; e.state.hero.y = 234; e.step(DT); } expect(e.status).toBe('lost'); expect(e.state.lives).toBe(0);
    });
    it('F08 chute ignore le bouclier et restaure au point sûr', () => {
        const e = flat(); e.state.shield = true; e.state.grace = 500; e.state.hero.y = 350; e.step(DT); expect(e.state.lives).toBe(2); expect(e.state.hero.x).toBe(32); expect(e.state.shield).toBe(false);
    });
    it('F09 activation du point de contrôle puis réapparition', () => {
        const e = flat(); e.state.checkpoints = [80]; e.state.hero.x = 81; e.step(DT); expect(e.state.checkpoint).toBe(80); expect(e.state.score).toBe(50); e.state.hero.y = 350; e.step(DT); expect(e.state.hero.x).toBe(80);
    });
    it('F10 caisses éventail, rafale, bouclier et emplacements sûrs', () => {
        for (const kind of ['fan', 'burst', 'shield'] as const) { const e = flat(); e.state.bonuses = [{ ...e.state.hero, kind }]; e.step(DT); expect(e.state.bonuses).toHaveLength(0); expect(kind === 'shield' ? e.state.shield : e.state.weapon).toBe(kind === 'shield' ? true : kind); e.input({ fire: true }); e.step(DT); expect(e.state.shots).toHaveLength(kind === 'fan' ? 3 : 1); if (kind === 'burst') expect(e.state.fireClock).toBe(90); }
        for (let seed = 0; seed < 12; seed++) { const s = generate(29, seed); expect(s.bonuses).toHaveLength(2); for (const b of s.bonuses) { expect(solid(s, b.x / TILE, 16)).toBe(true); expect(solid(s, b.x / TILE, 15)).toBe(false); expect(s.bonuses.filter(other => other.x === b.x)).toHaveLength(1); } }
    });
    it('F11 boss tous les cinq niveaux, phases, tirs et victoire par dégâts', () => {
        for (let level = 0; level < 30; level++) expect(Boolean(generate(level, 1).boss)).toBe((level + 1) % 5 === 0);
        const e = flat(); e.loadLevel(4, 1); const b = e.state.boss; if (!b) throw new Error('Boss absent'); e.state.hero.x = b.x - 100; e.state.enemies = []; e.state.hero.y = 234;
        for (const [hp, phase] of [[b.maxHp, 1], [Math.floor(b.maxHp / 2), 2], [1, 3]]) { b.hp = hp ?? 1; e.step(DT); expect(b.phase).toBe(phase); }
        b.clock = 590; e.step(DT); expect(e.state.shots.some(p => !p.friendly)).toBe(true);
        b.clock = 1300; e.state.shots = [{ x: b.x - 1, y: b.y + 10, w: 4, h: 4, vx: 280, vy: 0, friendly: true, life: 100 }]; e.step(DT); expect(e.status).toBe('won'); expect(b.hp).toBe(0);
    });
    it('F12 enveloppe de chaque bloc sur trente niveaux et plusieurs graines', () => {
        expect(jumpEnvelope(500)).toBe(false); expect(jumpEnvelope(10, 100)).toBe(false);
        for (let level = 0; level < 30; level++) for (let seed = 1; seed <= 12; seed++) { const s = generate(level, seed); expect(traversable(s)).toBe(true); expect(s.columns).toBe((5 + 2) * 16); }
    });
    for (const level of [0, 14, 29]) it(`F12 politique réelle niveau ${String(level + 1)} sur trois graines`, () => {
        let wins = 0;
        for (const seed of [1, 2, 3]) {
            const e = new Engine(); e.loadLevel(level, seed);
            for (let frame = 0; frame < 30000 && e.status === 'playing'; frame++) {
                pilot(e);
                e.step(DT);
            }
            if (e.status === 'won') wins++;
        }
        expect(wins).toBeGreaterThanOrEqual(1);
    });
    it('F13 chaque paramètre croît dans son sens', () => {
        const first = difficulty(0), last = difficulty(29);
        for (const key of Object.keys(first) as (keyof typeof first)[]) { for (let i = 1; i < 30; i++) expect(difficulty(i)[key], key).toBeGreaterThanOrEqual(difficulty(i - 1)[key]); expect(last[key], key).toBeGreaterThanOrEqual(first[key]); }
        expect(SPEED).toBe(120);
    });
    it('F14 snapshots sérialisables et pas fixes indépendants des lots', () => {
        const a = new Engine(), b = new Engine(); a.loadLevel(8, 17); b.loadLevel(8, 17);
        for (let i = 0; i < 40; i++) { const input = { x: 1, jump: i % 4 === 0, fire: true }; a.input(input); b.input(input); a.step(DT * 3); frames(b, 3); }
        expect(a.snapshot()).toEqual(b.snapshot()); expect(JSON.parse(JSON.stringify(a.snapshot()))).toEqual(a.snapshot()); expect(generate(5, 1)).not.toEqual(generate(5, 2));
    });
});

describe('Ferraille diversité passe 51', () => {
    for (const [name, run] of Object.entries(behaviors)) it(name, () => { run(Engine); });
    it('F-DIV-01 générateur réel et snapshots', () => { diversity(); });
    it('F-TERRAIN emplacements et respirations', () => { terrain(); });
    for (const seed of [460, 28]) it(`F-PILOT trente victoires bornées graine ${String(seed)}`, () => { campaign(Engine, seed); });
});
