import { Engine, DT, difficulty, type Enemy, type Shot } from '../src/engines/ferraille/engine';
import { bossAppearance } from '../src/engines/ferraille/appearance';
import { pilot } from '../src/engines/ferraille/pilot';
import { ferrailleFeatures } from '../scripts/ferraille-diversity.js';
import { measureDiversity } from '../scripts/diversity-metrics.js';
type EngineClass = typeof Engine;
function check(condition: unknown, message: string): void { if (!condition) throw new Error(message); }
function equal(actual: unknown, expected: unknown, message: string): void { check(actual === expected, message); }
function flat(E: EngineClass): Engine {
    const e = new E(), s = e.state;
    s.tiles.fill(false); for (let y = 16; y < 20; y++) for (let x = 0; x < s.columns; x++) s.tiles[y * s.columns + x] = true;
    s.enemies = []; s.platforms = []; s.bonuses = []; s.cages = []; s.boss = null;
    return e;
}
function enemy(kind: Enemy['kind'], x = 160): Enemy {
    return { kind, x, y: 242, w: 14, h: 14, vx: -20, vy: 0, hp: 3, clock: 0, originY: 160, phase: 0, facing: -1, aim: 0, turned: 0 };
}
function shot(x: number, y: number, vx: number, kind: Shot['kind'] = 'single'): Shot {
    return { x, y, vx, vy: 0, w: 4, h: 4, life: 1000, friendly: true, kind, bounces: 0 };
}
function frames(e: Engine, count: number): void { for (let i = 0; i < count; i++) e.step(DT); }
export function diversity(E: EngineClass = Engine): ReturnType<typeof measureDiversity> {
    const rows = Array.from({ length: 30 }, (_, level) => {
        const e = new E(); e.loadLevel(level, 28); const s = e.snapshot(), f = ferrailleFeatures(s);
        return { level: level + 1, elements: f.elements, layout: f.layout, parameters: { ...difficulty(level), ...f.params, layoutCells: f.layout.length } };
    });
    const r = measureDiversity(rows);
    check(r.noveltyCount >= 8, 'F-DIV-01: eight generated novelties');
    check(r.cloneShare < 0.25, 'F-DIV-01: fewer than 25 percent clones');
    let previous = 1;
    for (const level of r.noveltyLevels.filter(n => n <= 25)) { check(level - previous <= 5, 'F-DIV-01: discovery gap'); previous = level; }
    check(25 - previous <= 5, 'F-DIV-01: discovery until 25');
    return r;
}
export const behaviors: Record<string, (E: EngineClass) => void> = {
    'F-ENEMY-01 shooter walks, stops, locks aim, fires': E => {
        const e = flat(E), t = enemy('shooter'); e.state.enemies = [t];
        frames(e, 20); check(t.x < 155, 'shooter approaches'); frames(e, 20);
        const x = t.x; frames(e, 10); check(t.x === x && t.vx === 0, 'shooter stops');
        e.state.hero.y = 150; frames(e, 23);
        check(e.state.shots.some(p => !p.friendly && p.vx < -90 && Math.abs(p.vy) < 15), 'stored aim, not retargeted');
    },
    'F-ENEMY-02 kamikaze closes distance each step then commits to charge': E => {
        const e = flat(E), k = enemy('kamikaze'); e.state.enemies = [k];
        let distance = 128;
        for (let i = 0; i < 30; i++) { e.step(DT); const next = Math.abs(k.x - e.state.hero.x); check(next < distance, 'kamikaze must move toward hero'); distance = next; }
        e.state.hero.x = 300; e.step(DT); check(k.vx < -90, 'charge direction remains committed');
    },
    'F-ENEMY-03 flyer follows sine and drops gravity bombs': E => {
        const e = flat(E), f = enemy('drone', 220); e.state.enemies = [f]; frames(e, 30);
        check(Math.abs(f.x - 210) < 0.01 && Math.abs(f.y - 180.8777) < 0.01, 'sine trajectory');
        f.clock = 1400; e.step(DT); const b = e.state.shots.find(p => p.kind === 'bomb'); check(b && b.vx === 0 && b.vy > 40, 'vertical bomb');
        const y = f.y; e.step(DT); check(Math.abs(f.y - y) < 1, 'sine stays continuous across bomb timer reset');
    },
    'F-ENEMY-04 armor rejects front, accepts rear and overturned': E => {
        const e = flat(E), a = enemy('armored'); e.state.enemies = [a];
        e.state.shots = [shot(157, 245, 280)]; e.step(DT); check(a.hp === 3, 'front armor must block');
        a.x = 160; e.state.shots = [shot(169, 245, -280)]; e.step(DT); check(a.hp === 2, 'rear vulnerability');
        a.turned = 2000; a.x = 160; e.state.shots = [shot(157, 245, 280)]; e.step(DT); check(a.hp === 1, 'overturned vulnerability');
    },
    'F-ENEMY-05 turret fixed, slowly rotates, fires burst': E => {
        const e = flat(E), t = enemy('turret'); e.state.enemies = [t]; e.step(DT);
        check(t.x === 160 && Math.abs(t.aim ?? 0) <= 0.013 && Math.abs(t.aim ?? 0) > 0.005, 'slow rotation');
        frames(e, 119); check(e.state.shots.filter(p => !p.friendly).length === 3, 'three-shot burst');
    },
    'F-ENEMY-06 crawler turns before an edge': E => {
        const e = flat(E), c = enemy('crawler', 66); c.vx = 20; e.state.enemies = [c]; e.state.tiles[16 * e.state.columns + 5] = false;
        e.step(DT); check(c.vx === -20 && c.x < 66, 'edge patrol');
    },
    'F-WEAPON-01 flame is continuous, short range, finite': E => {
        const e = flat(E); e.state.weapon = 'flame'; e.state.ammo = 180; e.input({ fire: true }); frames(e, 60);
        check(e.state.ammo < 170 && e.state.ammo > 150, 'continuous ammo');
        check(e.state.shots.length >= 4 && e.state.shots.every(p => p.x < 112), 'flame reach below 80');
        e.state.ammo = 1; e.state.fireClock = 0; e.step(DT); equal(e.state.weapon, 'single', 'finite ammo'); check(e.state.ammo === 0, 'empty ammo');
    },
    'F-WEAPON-02 bounce reflects independently on floor and wall': E => {
        const e = flat(E), floor = shot(100, 251, 80, 'bounce'); floor.vy = 160; e.state.shots = [floor]; e.step(DT);
        check(floor.vy === -160 && floor.vx === 80 && floor.life > 0 && floor.bounces === 1, 'floor ricochet');
        for (let y = 0; y < 16; y++) e.state.tiles[y * e.state.columns + 10] = true;
        const wall = shot(155, 200, 280, 'bounce'); e.state.shots = [wall]; e.step(DT);
        check(wall.vx === -280 && wall.life > 0, 'wall ricochet');
    },
    'F-WEAPON-03 grenade parabola and bounded area': E => {
        const e = flat(E); e.state.weapon = 'grenade'; e.state.ammo = 12; e.input({ fire: true }); e.step(DT);
        const g = e.state.shots[0]; if (!g) throw new Error('grenade missing'); check( g.vy < -200, 'grenade launches upwards');
        e.input({ fire: false }); frames(e, 20); check(g.vy > 40 && g.x > 85, 'grenade parabola');
        const near = enemy('armored', 145), far = enemy('shooter', 200); near.vx = 0; far.clock = 700; e.state.enemies = [near, far];
        const explosion = shot(100, 240, 0, 'grenade'); explosion.life = 1; e.state.shots = [explosion]; e.step(DT);
        check(near.hp === 1 && (near.turned ?? 0) >= 2000 && far.hp === 3, '64-pixel area with armor turnover');
    },
    'F-BOSS-01 invulnerable telegraph and exposed core': E => {
        const e = new E(); e.loadLevel(4, 28); const b = e.state.boss; if (!b) throw new Error('mini-boss 5');
        e.state.enemies = []; e.state.bonuses = []; e.state.hero.x = b.x - 100;
        b.clock = 0; e.state.shots = [shot(b.x, 230, 280)]; e.step(DT); check(b.hp === 12, 'closed core rejects shot');
        b.clock = 1300; e.state.shots = [shot(b.x, 230, 280)]; e.step(DT); check(b.hp === 11 && b.exposed, 'open core accepts shot');
        b.clock = 590; e.step(DT); check(e.state.shots.filter(p => !p.friendly).length === 3, 'fan attack');
    },
    'F-BOSS-02 final phase changes attack geometry': E => {
        const e = new E(); e.loadLevel(29, 28); const b = e.state.boss; if (!b) throw new Error('final boss'); e.state.enemies = []; e.state.hero.x = b.x - 150;
        b.hp = 37; b.clock = 590; e.step(DT); check(b.phase === 1 && e.state.shots.length === 3, 'phase 1 fan');
        e.state.shots = []; b.hp = 20; b.clock = 590; e.step(DT); check(b.phase === 2 && e.state.shots.length === 2 && e.state.shots.every(p => p.y === 250), 'phase 2 ground waves');
        e.state.shots = []; b.hp = 10; b.clock = 590; e.step(DT); check(b.phase === 3 && e.state.shots.filter(p => p.kind === 'bomb').length === 3, 'phase 3 overhead bombs');
    },
    'F-BOSS-03 sweep is sequential; crossfire comes from both flanks': E => {
        const e = new E(); e.loadLevel(19, 28); const sweep = e.state.boss; if (!sweep) throw new Error('sweep missing');
        e.state.enemies = []; e.state.bonuses = []; e.state.hero.x = sweep.x - 150;
        sweep.clock = 180; e.step(DT); check(e.state.shots.length === 0, 'sweep telegraph');
        e.step(DT); check(e.state.shots.length === 1 && (e.state.shots[0]?.vy ?? 0) < -40, 'first sweep angle');
        sweep.clock = 780; e.step(DT); e.step(DT); check(e.state.shots.length === 2 && (e.state.shots[1]?.vy ?? 0) > 10, 'later sweep angle');
        e.loadLevel(24, 28); const cross = e.state.boss; if (!cross) throw new Error('crossfire missing');
        e.state.enemies = []; e.state.hero.x = cross.x - 150; cross.clock = 590; e.step(DT);
        check(e.state.shots.some(p => p.x < e.state.hero.x && p.vx > 100) && e.state.shots.some(p => p.x > e.state.hero.x && p.vx < -100), 'converging flanks');
    },
    'F-STRUCT wagon moves without throttle and can jump; cages give real bonus': E => {
        const e = new E(); e.loadLevel(11, 28); e.input({ jump: true }); e.step(DT);
        check(e.state.vehicle && e.state.hero.x > 35 && e.state.hero.vy < -300, 'wagon jump at scrolling speed');
        e.loadLevel(17, 28); const c = e.state.cages[0]; if (!c) throw new Error('cage missing'); check(e.state.cages.length === 3, 'three cages');
        e.state.enemies = []; e.state.bonuses = []; e.state.hero.x = c.x - 50;
        for (let i = 0; i < 3; i++) { e.state.shots = [shot(c.x, c.y + 10, 280)]; e.step(DT); }
        check(c.rescued && e.state.rescued === 1 && e.state.score === 300, 'cage opens for 300 points');
    },
    'F-BOSS-04 departure freezes cadence after attack and resumes once': E => {
        for (const level of [4, 9, 14, 19, 24, 29]) for (const threshold of [200, 600]) {
            const e = new E(); e.loadLevel(level, 28); const s = e.state, b = s.boss; if (!b) throw new Error('boss missing');
            s.enemies = []; s.bonuses = []; s.hero.x = b.x - 150; b.clock = threshold - 1;
            e.step(DT); const clock = b.clock;
            check(s.shots.some(p => !p.friendly) || threshold === 200 || b.pattern === 'sweep', 'attack starts before departure');
            s.hero.x = 32; s.shots = []; frames(e, 10);
            equal(b.clock, clock, 'distant clock freezes'); equal(s.shots.length, 0, 'no repeated distant attack');
            s.hero.x = b.x - 150; e.step(DT);
            check(b.clock > clock && s.shots.length === 0, 'resume without replaying threshold');
        }
    },
    'F-BOSS-05 grenades respect closed and exposed core': E => {
        const e = new E(); e.loadLevel(4, 28); const s = e.state, b = s.boss; if (!b) throw new Error('boss missing');
        s.enemies = []; s.bonuses = []; s.hero.x = b.x - 150;
        for (const clock of [0, 1300]) {
            b.clock = clock; const hp = b.hp, g = shot(b.x - 40, b.y, 0, 'grenade'); g.life = 1; s.shots = [g]; e.step(DT);
            equal(b.hp, hp - (clock ? 2 : 0), 'grenade damage only through exposed core');
        }
    },
    'F-BOSS-06 guardian 15 rains three bombs above player': E => {
        const e = new E(); e.loadLevel(14, 28); const s = e.state, b = s.boss; if (!b) throw new Error('boss missing');
        s.enemies = []; s.bonuses = []; s.hero.x = b.x - 150; b.clock = 590; e.step(DT);
        const bombs = s.shots.filter(p => !p.friendly && p.kind === 'bomb');
        equal(bombs.length, 3, 'mini boss bomb count');
        check(bombs.every((p, i) => Math.abs(p.x - (s.hero.x + (i - 1) * 70)) < 0.01 && p.y < s.hero.y && p.vy > 100), 'overhead bomb geometry');
    },
    'F-WEAPON-04 grenade boundary includes 64 excludes beyond': E => {
        const e = flat(E), at = enemy('turret', 164), outside = enemy('turret', 164.01);
        at.y = outside.y = 100.25; e.state.enemies = [at, outside];
        const g = shot(100, 100, 0, 'grenade'); g.life = 1; e.state.shots = [g]; e.step(DT);
        equal(at.hp, 1, 'exact 64 px damaged'); equal(outside.hp, 3, '64.01 px untouched');
    },
    'F-STRUCT-02 grenade opens cage within radius only': E => {
        const e = flat(E), s = e.state;
        s.cages = [164, 164.01].map(x => ({ x, y: 100.25, w: 24, h: 32, hp: 3, rescued: false }));
        const g = shot(100, 100, 0, 'grenade'); g.life = 1; s.shots = [g]; e.step(DT);
        check(s.cages[0]?.rescued && !s.cages[1]?.rescued, 'explosion radius opens cage without contact');
        equal(s.rescued, 1, 'one hostage'); equal(s.score, 300, 'rescue reward');
    },
    'F-RENDER-01 six distinct silhouettes palettes names and reactor phases': E => {
        const designs = [4, 9, 14, 19, 24, 29].map(level => {
            const e = new E(); e.loadLevel(level); const b = e.state.boss; if (!b) throw new Error('boss missing');
            return bossAppearance(b, 0, false);
        });
        for (const key of ['name', 'shape', 'colors', 'parts'] as const) equal(new Set(designs.map(d => JSON.stringify(d[key]))).size, 6, `six unique ${key}`);
        const e = new E(); e.loadLevel(29); const b = e.state.boss; if (!b) throw new Error('reactor missing');
        const phases = [1, 2, 3].map(phase => { b.phase = phase; return bossAppearance(b, 0, false); });
        for (const key of ['shape', 'colors', 'parts'] as const) equal(new Set(phases.map(d => JSON.stringify(d[key]))).size, 3, `reactor changes ${key}`);
        b.exposed = true;
        check(bossAppearance(b, 0, false).core.alpha !== bossAppearance(b, 12, false).core.alpha, 'exposed core blinks');
        equal(bossAppearance(b, 0, true).core.alpha, bossAppearance(b, 12, true).core.alpha, 'reduced motion steady core');
        check(bossAppearance(b, 0, true).core.exposed, 'reduced motion preserves vulnerability');
    },
    'F-SAVE deterministic batches and old state defaults': E => {
        const a = new E(), b = new E(); a.loadLevel(17, 28); b.loadLevel(17, 28);
        a.input({ x: 1, fire: true }); b.input({ x: 1, fire: true }); a.step(DT * 120); frames(b, 120);
        check(JSON.stringify(a.snapshot()) === JSON.stringify(b.snapshot()), 'fixed step replay');
        const legacy = { ...a.state }; Reflect.deleteProperty(legacy, 'ammo'); Reflect.deleteProperty(legacy, 'cages'); b.loadState(legacy);
        check(b.state.ammo === 0 && Array.isArray(b.state.cages), 'old state defaults');
    },
};
export function campaign(E: EngineClass = Engine, seed = 460): { seed: number; level: number; frames: number; lives: number; status: string }[] {
    const results = Array.from({ length: 30 }, (_, level) => {
        const e = new E(); e.loadLevel(level, seed); let f = 0;
        while (e.status === 'playing' && f < 18000) { pilot(e); e.step(DT); f++; }
        return { seed, level: level + 1, frames: f, lives: e.state.lives, status: e.status };
    });
    check(results.every(r => r.status === 'won'), `F-PILOT: ${JSON.stringify(results.filter(r => r.status !== 'won'))}`);
    return results;
}
export function terrain(E: EngineClass = Engine): void {
    for (let level = 0; level < 30; level++) for (const seed of [1, 28, 999]) {
        const e = new E(); e.loadLevel(level, seed); const s = e.state;
        if (s.structure === 'ascent' || s.structure === 'descent') {
            const surface = (x: number): number => { for (let y = 0; y < 20; y++) if (s.tiles[y * s.columns + x]) return y; return 20; };
            const heights = [4, 20, 28, 36, 44, 52, 60].map(surface);
            check(new Set(heights).size >= 4, 'F-TERRAIN: at least four actual floor elevations');
            for (let i = 1; i < heights.length; i++) {
                const next = heights[i] ?? 20, previous = heights[i - 1] ?? 20;
                check(s.structure === 'ascent' ? next <= previous : next >= previous, 'F-TERRAIN: floor follows route direction');
            }
        }
        check(s.enemies.length > 0 && s.bonuses.length > 0, 'guaranteed encounters');
        for (const cage of s.cages) check(!s.tiles[Math.floor(cage.y / 16) * s.columns + cage.x / 16], 'cage free socket');
        if ((level + 1) % 5 === 1 && level > 0) check(s.recovery && s.enemies.length <= 1, 'post-boss recovery');
    }
}
