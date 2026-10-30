import { Engine, TICK, type State, type Probe } from '../src/engines/orbite/engine';
type Factory = typeof Engine;
function must<T>(value: T | undefined): T { if (value === undefined) throw new Error('Missing entity'); return value; }
const check = (value: boolean, message: string): void => { if (!value) throw new Error(message); };
function setup(E: Factory, level: number, probes: Probe[] = [{ id: 0, x: 180, y: 200, row: 0, column: 0, hp: 1 }]): Engine {
    const e = new E(level);
    const state: State = { ...e.state, probes, initialCount: probes.length, swarm: false, boss: null, satellite: null, asteroids: [], wells: [], shields: [], shots: [], enemyTimer: 1000000, cometTimer: 1000000 };
    e.loadState(state); return e;
}
function shoot(e: Engine, x = e.state.probes[0]?.x ?? 180): void {
    e.state.shots = [{ x, y: 220, owner: 'player' }]; e.step(TICK);
}
export const behaviors: Record<string, (E: Factory) => void> = {
    'O-MEC-01 rotor ferme puis ouvre sans perdre de PV': E => {
        const e = setup(E, 3); const p = e.state.probes[0]; if (!p) throw new Error('probe');
        p.kind = 'rotor'; shoot(e);
        check(e.state.probes.length === 1 && p.hp === 1 && e.events.includes('rotor-block'), 'closed rotor must block');
        e.state.ticks = 60; shoot(e); check(e.status === 'won', 'open rotor must die');
    },
    'O-MEC-02 scission en deux fragments distincts': E => {
        const e = setup(E, 6); const p = e.state.probes[0]; if (!p) throw new Error('probe');
        p.kind = 'split'; shoot(e);
        check(e.state.probes.length === 2 && e.state.probes.every(p => p.kind === 'fragment' && p.hp === 1), 'two fragments');
        check(must(e.state.probes[1]).x - must(e.state.probes[0]).x === 28 && must(e.state.probes[0]).id !== must(e.state.probes[1]).id, 'separated unique fragments');
        check(e.status === 'playing' && e.speed() > 0, 'fragments remain objectives without reversing fleet speed');
    },
    'O-MEC-03 astéroïde dévie une fois les deux camps': E => {
        for (const owner of ['player', 'enemy'] as const) {
            const e = setup(E, 9); e.state.asteroids = [{ x: 180, y: 330 }];
            e.state.shots = [{ x: 170, y: 330, owner }]; e.step(TICK);
            check(e.state.shots[0]?.vx === -110 && e.state.shots[0].x < 170 && e.events.includes('deflect'), 'left deflection');
            e.step(TICK);
            check(Math.abs(must(e.state.shots[0]).x - 166.33333333333331) < 0.000001 && !e.events.includes('deflect'), 'one deflection');
        }
    },
    'O-MEC-04 gravité courbe réellement un projectile': E => {
        const e = setup(E, 12); e.state.wells = [{ x: 180, y: 350 }];
        e.state.shots = [{ x: 140, y: 350, owner: 'player' }]; e.step(TICK);
        check(e.state.shots[0]?.vx === 0.48 && e.state.shots[0].x === 140.008, 'literal gravity acceleration');
        check(e.events.includes('gravity'), 'observed gravity');
    },
    'O-MEC-05 furtive intangible puis vulnérable': E => {
        const e = setup(E, 15); const p = e.state.probes[0]; if (!p) throw new Error('probe');
        p.kind = 'stealth'; e.state.ticks = 100; shoot(e);
        check(!e.visible(p) && p.hp === 1, 'hidden probe cannot collide');
        e.state.ticks = 150; shoot(e); check(e.status === 'won', 'visible probe collides');
    },
    'O-MEC-06 réparateur soigne voisin blessé seulement': E => {
        const e = setup(E, 18, [
            { id: 0, x: 180, y: 200, row: 0, column: 0, hp: 2, maxHp: 2, kind: 'repair' },
            { id: 1, x: 210, y: 200, row: 0, column: 1, hp: 1, maxHp: 2 },
            { id: 2, x: 320, y: 200, row: 0, column: 2, hp: 1, maxHp: 2 },
        ]);
        e.state.ticks = 149; e.step(TICK);
        check(e.state.probes[1]?.hp === 2 && e.state.probes[2]?.hp === 1 && e.events.includes('repair'), 'local heal');
        e.state.ticks = 299; e.step(TICK); check(!e.events.includes('repair'), 'no overheal');
    },
    'O-MEC-07 satellite perd et interception le protège': E => {
        const e = setup(E, 21); e.state.satellite = { x: 180, y: 550, hp: 1 };
        e.state.shots = [{ x: 180, y: 539, owner: 'enemy' }]; e.step(TICK);
        check(e.status === 'lost' && e.state.satellite.hp === 0 && e.events.includes('satellite-lost'), 'satellite is mandatory');
        const guard = setup(E, 21); guard.state.satellite = { x: 180, y: 550, hp: 1 };
        guard.state.shots = [{ x: 180, y: 530, owner: 'player' }, { x: 180, y: 520, owner: 'enemy' }]; guard.step(TICK);
        check(guard.state.satellite.hp === 1 && guard.state.shots.length === 0 && guard.events.includes('intercept'), 'interception saves ally');
        const cleared = setup(E, 21);
        cleared.state.shields = [{ x: 178, y: 488 }];
        cleared.state.shots = [{ x: 180, y: 478, owner: 'enemy' }, { x: 180, y: 488, owner: 'player' }];
        cleared.step(TICK);
        check(cleared.state.shields.length === 0 && cleared.state.shots.length === 1 && !cleared.events.includes('intercept'), 'consumed enemy cannot consume another shot');
        const rescue = setup(E, 21); rescue.state.satellite = { x: 180, y: 550, hp: 3 }; shoot(rescue);
        check(rescue.status === 'won' && rescue.snapshot().satellite === null && rescue.events.includes('satellite-saved'), 'ally exits when escorts are cleared');
    },
    'O-MEC-08 essaim coordonné courbe les deux axes': E => {
        const a = setup(E, 24), b = setup(E, 24); a.state.swarm = true;
        a.step(TICK); b.step(TICK);
        check(Math.abs(must(a.state.probes[0]).x - must(b.state.probes[0]).x - 0.01093571933) < 0.000001, 'swarm horizontal curve');
        check(Math.abs(must(a.state.probes[0]).y - 200.19990235170) < 0.000001, 'swarm vertical curve');
    },
    'O-BOSS escorte, cœur cyclique, deux phases et motifs': E => {
        const e = setup(E, 29, []); e.state.boss = { x: 180, y: 200, hp: 7, maxHp: 12, phase: 1, motif: 6 };
        e.state.shots = [{ x: 182.3, y: 220, owner: 'player' }]; e.step(TICK);
        check(e.state.boss.hp === 7 && e.events.includes('boss-block'), 'closed core');
        e.state.ticks = 60; const x = 252.33752830276245;
        e.state.boss.y = 200; e.state.shots = [{ x, y: 220, owner: 'player' }]; e.step(TICK);
        check(e.state.boss.hp === 6 && e.state.boss.phase === 2 && e.events.includes('boss-phase'), 'phase at six hp');
        e.state.ticks = 71; e.state.shots = []; e.step(TICK);
        check(e.events.includes('boss-fire') && e.state.shots.length === 3, 'phase two fan at tick72');
        for (const [level, count] of [[4, 2], [9, 1], [14, 3], [19, 2], [24, 2], [29, 3]] as const) {
            const spawned = new E(level); check(spawned.state.boss?.motif === (level + 1) / 5, 'every fifth level has boss');
            spawned.loadState({ ...spawned.state, probes: [], shots: [], shields: [], wells: [], asteroids: [], satellite: null, ticks: 119, enemyTimer: 1000000, cometTimer: 1000000 });
            spawned.step(TICK);
            const vx = spawned.state.shots.map(s => s.vx ?? 0);
            check(spawned.events.includes('boss-fire') && vx.length === count, 'generated guardian emits its pattern');
            if (level === 4) check(vx[0] === -80 && vx[1] === 80, 'double diagonal');
            if (level === 9) check(Math.abs(must(vx[0]) + 38.01417238) < 0.00001, 'aimed shot');
            if (level === 14 || level === 29) check(vx[0] === -65 && vx[1] === 0 && vx[2] === 65, 'triple fan');
            if (level === 19) check(vx[0] === 100 && vx[1] === 0, 'alternating sweep');
            if (level === 24) check(Math.abs(must(vx[0]) - 100.02271695) < 0.00001 && Math.abs(must(vx[1]) + 45.77615202) < 0.00001, 'rotating pair');
        }
        const side = setup(E, 4, []); side.state.boss = { x: 180, y: 200, hp: 5, maxHp: 5, phase: 1, motif: 1 }; side.state.ticks = 60;
        side.state.shots = [{ x: x + 18, y: 220, owner: 'player' }]; side.step(TICK);
        check(side.state.boss.hp === 5 && side.events.includes('boss-block'), 'outer hull blocks even when open');
        const escort = setup(E, 4); escort.state.boss = { x: 180, y: 200, hp: 5, maxHp: 5, phase: 1, motif: 1 }; escort.state.ticks = 60;
        escort.state.shots = [{ x, y: 220, owner: 'player' }]; escort.step(TICK);
        check(escort.state.boss.hp === 5, 'escort locks core');
    },
};
