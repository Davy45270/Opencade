import { weaponBenchmark, weaponScenarios } from './essaim-weapons';
import type { Weapon } from '../src/engines/essaim/levels';
import { generatedBehaviors } from './essaim-generated';
import { Engine, TICK, type Enemy } from '../src/engines/essaim/engine';
import { pilot } from '../src/engines/essaim/pilot';
type EngineClass = typeof Engine;
function check(condition: unknown, message: string): void { if (!condition) throw new Error(message); }
function item<T>(value: T | undefined): T { if (value === undefined) throw new Error('Missing fixture item'); return value; }
function flat(E: EngineClass): Engine {
    const e = new E();
    e.state.enemies = [{ ...item(e.state.enemies[0]), id: 90, x: 35, y: 80, homeX: 35, homeY: 80, phase: 'formation', type: 'scout', captured: false, curve: 0, hp: 100, clock: 0 }];
    e.state.wave = 2; e.state.shots = []; e.state.pickups = []; e.state.enemyTimer = e.state.diveTimer = 1000000;
    return e;
}
function frames(e: Engine, n: number): void { for (let i = 0; i < n; i++) e.step(TICK); }
export function escortBenchmark(E: EngineClass = Engine) {
    const run = (bounce: boolean) => {
        const e = flat(E); e.state.enemies = [100, 145, 190].map((y,id) => ({ ...item(e.state.enemies[0]), id, x: 105, homeX: 105, y, homeY: y, type: 'shield', hp: 1 }));
        e.state.wave = 2; if (bounce) e.equip('bounce'); let f = 0;
        for (; e.status === 'playing' && f < 1800; f++) { pilot(e,f); e.step(TICK); }
        check(e.status === 'won', 'scenario completes'); return f;
    };
    const baseTicks = run(false), bounceTicks = run(true);
    return { baseTicks, bounceTicks, ratio: baseTicks/bounceTicks };
}
export const behaviors: Record<string, (E: EngineClass) => void> = {
    ...generatedBehaviors,
    ...Object.fromEntries((Object.keys(weaponScenarios) as Weapon[]).map(kind => [`E-WPN-07 ${kind} generated formation ratio >= 1.3`, (E: EngineClass) => { weaponBenchmark(kind,E); }])),
    'E-INPUT-01 desktop guidance collects the initial beam and held fire emits without shots': E => {
        const e = new E(0, 458);
        e.move(1); frames(e, 12); e.move(-1); frames(e, 24);
        e.moveTo(280); frames(e, 36);
        check(e.has('beam'), 'desktop trajectory collects the level 1 supply');
        check(e.state.fired === 0, 'guidance alone does not fire');
        e.holdFire(true); frames(e, 6);
        check(e.state.firing && e.state.beam && e.state.heat > 0 && e.state.fired > 0, 'held fire emits a hot beam');
        check(!e.state.shots.some(s => s.owner === 'player'), 'continuous beam is not a projectile');
        const fired = e.state.fired;
        e.holdFire(false); frames(e, 6);
        check(!e.state.firing && !e.state.beam && e.state.fired === fired, 'release stops emission');
    },
    'E-WPN-01 overheat blocks until cooled': E => {
        const e = flat(E); e.equip('beam'); e.holdFire(true); frames(e, 72);
        check(e.state.overheated, 'overheat at full heat'); frames(e, 1);
        check(!e.state.beam, 'blocked while overheated');
        e.holdFire(false); frames(e, 130); check(!e.state.overheated && e.state.heat === 0, 'cooled');
        e.holdFire(true); frames(e, 1); check(e.state.beam, 'resumed');
    },
    'E-WPN-02 two side reflections': E => {
        const e = flat(E); e.equip('bounce'); e.state.cannon = 340; e.fire(); frames(e, 3);
        const p = item(e.state.shots[0]); check((p.vx ?? 0) < 0 && p.bounces === 1, 'first reflection');
        frames(e, 50); check((p.vx ?? 0) > 0 && p.bounces === 0, 'second reflection');
    },
    'E-WPN-03 drones intercept swept projectile': E => {
        const e = flat(E); e.equip('drones');
        e.state.ticks = 0; e.state.shots = [{ x: 222, y: 540, owner: 'enemy', vy: 1200 }]; frames(e, 1);
        check(e.state.shots.length === 0 && e.state.lives === 3, 'intercepted');
        check(e.dronePositions().length === 2, 'two drones'); frames(e, 841); check(!e.has('drones'), 'finite life');
    },
    'E-WPN-04 wave slows enemy and projectile by 0.35': E => {
        const a = flat(E), b = flat(E);
        for (const e of [a,b]) { const enemy = item(e.state.enemies[0]); Object.assign(enemy, { x: 180, y: 400, homeX: 180, homeY: 400, age: 0, phase: 'dive', originX: 180, originY: 400, targetX: 180 }); e.state.shots = [{ x: 210, y: 400, owner: 'enemy', vy: 120 }]; }
        a.equip('slow'); frames(a,1); frames(b,1);
        check(Math.abs(item(a.state.enemies[0]).age/item(b.state.enemies[0]).age-0.35) < 0.000001, 'enemy time factor');
        check(Math.abs(item(a.state.enemies[0]).y-401.05) < 0.000001 && item(b.state.enemies[0]).y === 403, 'enemy displacement 1.05 versus 3');
        check(Math.abs(item(a.state.shots[0]).y-400.7) < 0.000001 && item(b.state.shots[0]).y === 402, 'projectile displacement');
    },
    'E-WPN-05 magnet returns a shot that kills': E => {
        const e = flat(E); Object.assign(item(e.state.enemies[0]), { x: 180, y: 350, homeX: 180, homeY: 350, hp: 1 });
        e.equip('magnet'); e.state.shots = [{ x: 180, y: 480, owner: 'enemy', vy: 120 }]; frames(e,1);
        check(e.state.shots[0]?.owner === 'player' && (e.state.shots[0].vy ?? 0) < 0, 'returned toward enemy');
        frames(e, 20); check(e.state.score === 10 && e.state.lives === 3, 'returned shot hits');
    },
    'E-WPN-06 hold and release changes size and piercing': E => {
        const release = (n: number, isolateChargedShot = true) => { const e = flat(E); e.equip('charge'); e.holdFire(true); frames(e,n); if (isolateChargedShot) e.state.shots = []; e.holdFire(false); return e; };
        const short = release(20), full = release(90), p = item(full.state.shots[0]);
        check(p.radius === 18 && p.pierce === 5, 'full charge dimensions');
        check((short.state.shots[0]?.radius ?? 0) < 8 && (short.state.shots[0]?.pierce ?? 0) === 1, 'short charge dimensions');
        check(full.state.charge === 0, 'release clears gauge');
        full.state.enemies = [400, 375, 350].map((y,id) => ({ ...item(full.state.enemies[0]), id, x: 180, homeX: 180, y, homeY: y, hp: 1 }));
        frames(full, 22); check(full.state.enemies.length === 0, 'pierces three aligned targets');
        const tap = release(5,false); check(tap.state.shots.length > 0 && tap.state.shots.every(p => p.owner === 'player' && p.radius === undefined), 'short tap keeps actual ordinary fire only');
    },
    'E-WPN-07 ricochet defeats frontal escorts faster': E => {
        const result = escortBenchmark(E); check(result.ratio >= 1.5, `escort ratio ${String(result.baseTicks)}/${String(result.bounceTicks)}`);
    },
    'E-WPN-08 at most two with beam wave combination': E => {
        const e = flat(E); e.equip('beam'); e.equip('slow'); e.holdFire(true);
        Object.assign(item(e.state.enemies[0]), { x: 200, y: 400, homeX: 200, homeY: 400, age: 0 });
        frames(e,1); check(Math.abs(item(e.state.enemies[0]).age-3.333333333333334) < 0.000001, 'beam plus wave factor 0.2');
        e.state.double = 1000; e.equip('magnet'); check(e.state.double === 0, 'legacy cannon replaced by new pickup'); check(e.state.weapons.length === 2 && !e.has('beam') && e.has('slow'), 'oldest replaced');
    },
    'E-BOSS closed core weakness and command phases': E => {
        const e = flat(E); e.state.enemies = []; e.state.boss = { x: 180, y: 100, hp: 24, maxHp: 24, phase: 1, clock: 0, exposed: false, pattern: 6 };
        e.state.shots = [{ x: 180, y: 118, owner: 'player' }]; frames(e,1); check(e.state.boss.hp === 24, 'closed core resists normal shot');
        e.state.shots = [{ x: 180, y: 118, owner: 'player', pierce: 5 }]; frames(e,1); check(e.state.boss.hp === 22, 'charged shot bypasses core');
        e.state.boss.hp = 14; e.state.shots = [{ x: 180, y: 118, owner: 'player', reflected: true }]; frames(e,1);
        check(e.state.boss.phase === 2 && e.state.boss.hp === 12, 'half health triggers second phase');
        e.state.boss.clock = 1900; e.state.shots = [{ x: 195, y: 118, owner: 'player' }]; frames(e,1);
        check(e.state.boss.exposed && e.state.boss.hp === 11, 'ordinary shot damages exposed core');
        const patterns = new Set<string>();
        for (const pattern of [1,2,3,4,5]) { const b = flat(E); b.state.enemies = []; b.state.ticks = 74; b.state.boss = { x: 180,y: 65,hp: 10,maxHp: 10,phase: 1,clock: 0,exposed: false,pattern }; frames(b,1); patterns.add(JSON.stringify(b.state.shots.map(p => [p.vx,p.vy]))); }
        check(patterns.size === 5, 'five distinct guardian motifs');
    },
    'E-WAVE mines split rescue mirror and carried turrets': E => {
        const e = flat(E), template = item(e.state.enemies[0]);
        const spawn = (type: Enemy['type']) => { e.state.enemies = [{ ...template, type, hp: 1, x: 180,homeX: 180,y: 300,homeY: 300,clock: 2200 }]; e.state.shots = []; };
        spawn('miner'); frames(e,1); check(e.state.shots[0]?.mine !== undefined, 'mine laid'); frames(e,85); check(e.state.shots.filter(p => p.owner === 'enemy').length === 3, 'mine blossoms');
        spawn('turret'); frames(e,1); check(e.state.shots.length === 1 && item(e.state.shots[0]).seeking && item(e.state.shots[0]).x > 197, 'carried turret launches guided shot');
        spawn('split'); e.state.shots = [{ x:180,y:315,owner:'player' }]; frames(e,1); check(e.state.enemies.length === 2 && e.state.enemies.every(p => p.type === 'fragment'), 'split once');
        spawn('mirror'); e.state.cannon = 300; frames(e,1); check(item(e.state.enemies[0]).x === 258, 'copies movement');
        spawn('spiral'); const spiral = item(e.state.enemies[0]); spiral.age = 2500; frames(e,1); check(spiral.y > 450 && spiral.x !== 180, 'spiral closing trajectory');
        spiral.age = 5000; frames(e,1); check(!e.state.enemies.includes(spiral), 'kamikaze exits without recycling');
        spawn('scout'); e.loadState(e.state);
        e.state.rescue = { x:180,y:460,hp:4 }; e.state.shots = [{ x:180,y:450,owner:'enemy',vy:600 }]; frames(e,1); check(e.state.rescue.hp === 3 && e.state.lives === 3, 'rescue absorbs damage');
    },
    'E-PICKUP six collectibles expire and refresh': E => {
        for (const kind of ['beam','bounce','drones','slow','magnet','charge'] as const) {
            const e = flat(E); e.state.pickups = [{ kind,x:180,y:525 }]; frames(e,1);
            check(e.has(kind) && e.state.pickups.length === 0, 'collected at ship');
            frames(e,60); const remaining = item(e.state.weapons[0]).remaining;
            check(remaining > 12000 && remaining < 14000, 'duration ticks down');
            e.equip(kind); check(e.state.weapons.length === 1 && item(e.state.weapons[0]).remaining === 14000, 'same pickup refreshes');
            frames(e,841); check(!e.has(kind), 'finite weapon duration');
        }
    },
    'E-DET cadence seed and legacy state': E => {
        const a = new E(18,28), b = new E(18,28); a.holdFire(true); b.holdFire(true); a.step(2000); frames(b,120);
        check(JSON.stringify(a.snapshot()) === JSON.stringify(b.snapshot()), 'fixed step determinism');
        check(JSON.stringify(new E(18,458).snapshot()) !== JSON.stringify(new E(18,28).snapshot()), 'seed witness');
        const legacy = structuredClone(a.state) as Partial<typeof a.state>;
        delete legacy.weapons; delete legacy.pickups; delete legacy.heat; delete legacy.overheated; delete legacy.charge; delete legacy.beam; delete legacy.rescue; delete legacy.boss;
        a.loadState(legacy as typeof a.state); frames(a,1); check(a.state.weapons.length === 0 && Number.isFinite(a.state.heat), 'legacy defaults');
    },
};
