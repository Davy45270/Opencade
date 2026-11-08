import { describe, it, expect } from 'vitest';
import { Engine, DT, TILE, type Enemy } from '../src/engines/ferraille/engine';
import { Impacts, SHAKE_MS, RED_MS, BEAM_REACH, BEAM_HALF_HEIGHT, MESSAGE_MS, hurtMessage } from '../src/games/ferraille/impacts';
import { pilot } from '../src/engines/ferraille/pilot';
// Feel layer (David's audit of 06/11): "I hit" and "I am hit" no longer share one gold frame.
function flat(): Engine {
    const e = new Engine(), s = e.state;
    s.tiles.fill(false); for (let x = 0; x < s.columns; x++) for (let y = 16; y < 20; y++) s.tiles[y * s.columns + x] = true;
    s.modules = []; s.enemies = []; s.bonuses = []; s.platforms = []; s.boss = null; s.cages = []; return e;
}
function enemy(kind: Enemy['kind'], x: number, hp = 1): Enemy { return { kind, x, y: 242, w: 14, h: 14, vx: 0, vy: 0, hp, clock: 0, originY: 190, phase: 0 }; }
function run(e: Engine, fx: Impacts, n: number, fire = true): void {
    for (let i = 0; i < n; i++) { e.input({ fire }); e.step(DT); fx.observe(e.state, e.events, e.hurt); fx.advance(DT); }
}
describe('Ferraille, retours d’impact', () => {
    it('F-FX-01 ennemi touché : clignotement et étincelles, puis détruit : ferraille et +100', () => {
        const e = flat(), fx = new Impacts(), tough = enemy('crawler', 90, 3); e.state.enemies = [tough]; fx.reset(e.state);
        let blinked = false;
        for (let i = 0; i < 240 && e.state.enemies.length; i++) { run(e, fx, 1); blinked ||= fx.blink.has(tough); }
        expect(blinked).toBe(true);
        expect(fx.counts.blinks).toBe(2); expect(fx.counts.kills).toBe(1); expect(fx.counts.hurts).toBe(0);
        expect(fx.counts.blasts).toBe(0);
    });
    it('F-FX-02 la grenade dessine son explosion au rayon réel, une seule fois', () => {
        const e = flat(), fx = new Impacts(); e.state.weapon = 'grenade'; e.state.ammo = 1; e.state.enemies = [enemy('crawler', 110, 1)]; fx.reset(e.state);
        let seen: string[] = [];
        for (let i = 0; i < 120 && !fx.counts.blasts; i++) { run(e, fx, 1, i === 0); if (fx.sounds.length) seen = [...fx.sounds]; }
        expect(fx.counts.blasts).toBe(1); expect(fx.bursts.some(b => b.kind === 'blast')).toBe(true);
        expect(seen).toContain('boom'); expect(fx.shake).toBeGreaterThan(0);
    });
    it('F-FX-03 héros touché : secousse et bords rouges, sans clignotement d’ennemi ; une chute du décor n’est pas une destruction', () => {
        const e = flat(), fx = new Impacts(); e.state.grace = 0; e.state.shield = false;
        // A second crawler stands over a hole: it falls out of the map with its hit points intact.
        for (let x = Math.floor(380 / TILE); x <= Math.floor(440 / TILE); x++) for (let y = 16; y < 20; y++) e.state.tiles[y * e.state.columns + x] = false;
        e.state.enemies = [enemy('crawler', e.state.hero.x + 2, 1), { ...enemy('crawler', 400, 2), y: 345 }]; fx.reset(e.state);
        let hurtAt = -1;
        for (let i = 0; i < 30 && hurtAt < 0; i++) { run(e, fx, 1, false); if (fx.counts.hurts) hurtAt = i; }
        expect(hurtAt).toBeGreaterThanOrEqual(0);
        expect(fx.shake).toBeGreaterThan(SHAKE_MS - 2 * DT); expect(fx.red).toBeGreaterThan(RED_MS - 2 * DT);
        expect(fx.offset(false)).not.toEqual({ x: 0, y: 0 }); expect(fx.offset(true)).toEqual({ x: 0, y: 0 });
        run(e, fx, 60, false);
        expect(e.state.enemies.some(x => x.x > 300)).toBe(false);
        expect(fx.counts.blinks).toBe(0); expect(fx.counts.kills).toBe(0);
        expect(fx.shake).toBe(0); expect(fx.red).toBe(0);
    });
    it('F-FX-04 lecture seule : la partie du pilote est identique avec et sans la couche d’effets', () => {
        for (const level of [0, 4, 12]) {
            const a = new Engine(), b = new Engine(); a.loadLevel(level, 460); b.loadLevel(level, 460);
            const fx = new Impacts(); fx.reset(b.state);
            for (let i = 0; i < 1800 && a.status === 'playing'; i++) {
                pilot(a); a.step(DT);
                pilot(b); b.step(DT); fx.observe(b.state, b.events); fx.advance(DT);
            }
            expect(JSON.stringify(b.snapshot())).toBe(JSON.stringify(a.snapshot()));
            expect(fx.counts.kills + fx.counts.blinks).toBeGreaterThan(0);
        }
    });
    it('F-FX-05 vie perdue : la cause est désignée, l’arme spéciale perdue est nommée', () => {
        // Contact with a turret while holding the fan: ring where it hit, and both facts in one line.
        const e = flat(), fx = new Impacts(); e.state.grace = 0; e.state.shield = false; e.state.weapon = 'fan'; e.state.ammo = 9;
        const turret = enemy('turret', e.state.hero.x + 2, 1); e.state.enemies = [turret]; fx.reset(e.state);
        for (let i = 0; i < 30 && !fx.counts.hurts; i++) run(e, fx, 1, false);
        expect(e.hurt).toMatchObject({ cause: 'turret', lostWeapon: 'fan' });
        expect(fx.message).toBe('Touché par une tourelle · Arme perdue : Éventail');
        const ring = fx.bursts.find(b => b.kind === 'cause');
        expect(ring && Math.hypot(ring.x - (turret.x + turret.w / 2), ring.y - (turret.y + turret.h / 2))).toBeLessThan(0.5);
        e.state.enemies = [];
        run(e, fx, Math.ceil(MESSAGE_MS / DT) + 1, false);
        expect(fx.message).toBe('');
        // An enemy shot, a fall: named as such; no weapon line with the basic gun.
        expect(hurtMessage({ cause: 'shot', x: 0, y: 0, lostWeapon: null })).toBe('Touché par un tir ennemi');
        const f = flat(), fy = new Impacts(); f.state.hero.y = 400; fy.reset(f.state);
        run(f, fy, 2, false);
        expect(f.hurt?.cause).toBe('fall'); expect(fy.message).toBe('Chute'); expect(fy.bursts.some(b => b.kind === 'cause')).toBe(false);
        // A new level forgets the last hurt.
        f.loadLevel(1); expect(f.hurt).toBeNull();
    });
    it('F-FX-06 super-tir : un rayon sur sa portée réelle, devant le héros', () => {
        const e = flat(), fx = new Impacts(); fx.reset(e.state);
        const h = e.state.hero, inReach = enemy('crawler', h.x + h.w / 2 + BEAM_REACH - 20, 3), beyond = enemy('crawler', h.x + h.w / 2 + BEAM_REACH + 20, 3);
        e.state.enemies = [inReach, beyond]; e.state.facing = 1;
        expect(e.special()).toBe(true);
        fx.superShot(h.x + h.w / 2, h.y + h.h / 2, e.state.facing);
        const beam = fx.bursts.find(b => b.kind === 'beam');
        expect(beam?.facing).toBe(1); expect(fx.counts.beams).toBe(1); expect(fx.shake).toBeGreaterThan(0);
        // The drawn reach is the engine's: what lies inside it was hit, what lies past it was not.
        expect(e.state.enemies.includes(inReach)).toBe(false); expect(beyond.hp).toBe(3);
        expect(BEAM_HALF_HEIGHT).toBe(32);
    });
});
