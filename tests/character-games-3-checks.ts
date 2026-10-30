import { Engine as Maze } from '../src/engines/dedale/engine';
import { Engine as Orbit } from '../src/engines/orbite/engine';
import { Engine as Stack, emptyBoard } from '../src/engines/empilo/engine';
import { ids } from '../src/characters/model';
import { selectCharacter } from '../src/characters/selection';
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function equal(a: unknown, b: unknown): void { check(JSON.stringify(a) === JSON.stringify(b), `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
export function dedaleEffect(Engine = Maze): void {
    const e = new Engine(), maze = Array<boolean>(437).fill(false);
    for (const at of [20, 21, 22, 40]) maze[at] = true;
    e.loadState({ ...e.state, journey: undefined, maze, seeds: [40], suns: [22], hero: { x: 1, y: 1, direction: 'up' }, requested: 'up', wisps: [], schedule: [100000] });
    const before = structuredClone(e.state);
    check(e.special(), 'P-dedale-02 accepted'); equal(e.lightPath, [20, 21, 22]); equal(e.specialTicks, 180); equal(e.state, before);
    check(!e.special(), 'P-dedale-03 one charge');
    e.advance(2983.3333333333335); equal(e.specialTicks, 1); check(e.lightPath.length === 3, 'visible before 3 seconds');
    e.advance(1000 / 60); equal(e.specialTicks, 0); equal(e.lightPath, []); check(!e.special(), 'no time recharge');
    e.loadLevel(9, 28); equal(e.specialUses, 1); check(e.special(), 'next level reloads');
    e.loadLevel(0); e.state.suns = []; check(!e.special() && e.specialUses === 1, 'no goal preserves charge');
}
export function orbiteEffect(Engine = Orbit): void {
    const e = new Engine();
    e.loadState({ ...e.state, cannon: 180, shields: [], shots: [], cooldown: 0, probes: [{ id: 0, x: 100, y: 100, row: 0, column: 0, hp: 1 }], enemyTimer: 100000, cometTimer: 100000 });
    check(e.special(), 'P-orbite-02 accepted'); equal(e.specialTicks, 90); check(e.fire(), 'first shot'); equal(e.state.cooldown, 11 * (1000 / 60) / 2);
    e.advance(100); check(e.fire(), 'second simultaneous shot'); equal(e.state.shots.filter(s => s.owner === 'player').length, 2);
    check(!e.special(), 'P-orbite-03 one burst');
    e.loadLevel(0); check(e.special(), 'new wave reloads'); e.advance(1483.3333333333335); equal(e.specialTicks, 1); e.advance(1000 / 60); equal(e.specialTicks, 0); check(!e.special(), 'no time recharge');
    e.loadLevel(0); check(e.fire(), 'ordinary shot'); equal(e.state.cooldown, 180); e.advance(200); check(!e.fire(), 'ordinary projectile cap intact');
}
export function empiloEffect(Engine = Stack): void {
    const e = new Engine();
    e.loadState({ ...e.state, board: emptyBoard(), active: { id: 1, cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], x: 5, y: 12 }, next: [0, 2, 3], score: 7, lines: 2, lockMs: 400, resets: 14 });
    check(e.special(), 'P-empilo-02 accepted'); equal(e.reserve, 1);
    equal(e.state.active, { id: 0, cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }], x: 3, y: 0 });
    equal([e.state.score, e.state.lines, e.state.lockMs, e.state.resets], [7, 2, 0, 0]); equal(e.state.next.slice(0, 2), [2, 3]);
    check(!e.special(), 'P-empilo-03 locked until placement'); e.advance(500); check(!e.special(), 'time does not refund reserve');
    check(e.input('drop'), 'placement'); equal(e.specialUses, 1); const next = [...e.state.next];
    check(e.special(), 'swap after placement'); equal(e.state.next, next); equal(e.reserve, 2);
    equal(e.state.active, { id: 1, cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }], x: 3, y: 0 });
    e.loadLevel(9); equal(e.reserve, null); equal(e.specialUses, 1);
    const board = emptyBoard(); const top = board[0]; if (top) top[3] = 1;
    e.loadState({ ...e.state, board, reserve: 0 }); check(e.special(), 'blocked swap consumed'); equal(e.status, 'lost');
}
export function balance(Engine: typeof Maze | typeof Orbit | typeof Stack): void {
    let reference: unknown;
    for (const id of ids) {
        selectCharacter(id, undefined); const e = new Engine(0, 28); check(e.special(), 'all identities activate'); e.advance(300);
        const snapshot = e.snapshot(); if (reference) equal(snapshot, reference); else reference = snapshot;
    }
}

/** Same drop loses without the reserve and wins with it; no rule is bypassed. */
export function reserveOutcome(): void {
    for (const special of [false, true]) {
        const e = new Stack(), board = emptyBoard();
        board[15] = [1, 1, 1, 0, 0, 0, 1, 1, 1]; const top = board[0]; if (top) top[6] = 1;
        e.loadState({ ...e.state, board, reserve: 0, next: [7, 2, 3], lines: 4, active: { id: 1, cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }], x: 3, y: 8 } });
        if (special) check(e.special(), 'decisive reserve'); e.advance(150); e.input('drop'); equal(e.status, special ? 'won' : 'lost');
    }
}

export function dedaleNavigation(): void {
    const e = new Maze(), maze = Array<boolean>(437).fill(false), j = e.state.journey;
    check(!!j, 'modern maze'); if (!j) return;
    for (const at of [20, 21, 22, 39, 40, 300]) maze[at] = true;
    const journey = { ...j, keys: [{ at: 40, color: 0 }], doors: [{ at: 21, color: 0 }], portals: [] as [number, number][], arrows: [], switches: [], gates: [], moving: [], ice: [], dark: [], held: 0, toggled: 0, turn: 0 };
    e.loadState({ ...e.state, maze, journey, hero: { x: 1, y: 1, direction: 'up' }, requested: 'up', suns: [22], wisps: [] });
    check(e.special(), 'key makes the sun reachable'); equal(e.lightPath, [20, 39, 40, 21, 22]); equal(e.state.journey?.held, 0);
    e.loadState({ ...e.state, journey: { ...journey, keys: [] } });
    check(!e.special() && e.specialUses === 1, 'locked unreachable sun preserves charge');
    e.loadState({ ...e.state, suns: [22, 300], journey: { ...journey, doors: [], portals: [[21, 300]] } });
    check(e.special(), 'nearest sun through portal'); equal(e.lightPath, [20, 21, 300]);
}

/** Count sustained shots over 1.5 s, excluding the common initial shot at t=0.
 * Remove projectiles after each tick to isolate cadence from the separate cap.
 */
export function orbiteCadence(Engine = Orbit): void {
    const counts = [];
    for (const burst of [false, true]) {
        const e = new Engine();
        e.loadState({ ...e.state, shields: [], shots: [], enemyTimer: 1e6, cometTimer: 1e6 });
        e.holdFire(true); check(e.fire(), 'common initial shot'); e.state.shots = [];
        if (burst) check(e.special(), 'burst accepted during ordinary cooldown');
        let count = 0;
        const ticks = [];
        for (let tick = 1; tick <= 90; tick++) {
            e.advance(1000 / 60);
            const fired = e.events.filter(event => event === 'fire').length;
            count += fired; if (fired) ticks.push(tick); e.state.shots = [];
        }
        counts.push(count);
        equal(e.state.ticks, 90);
        check(e.status === 'playing', 'cadence isolated from terminal events');
        if (burst) equal(ticks.slice(0, 4), [6, 11, 17, 22]);
    }
    const ordinary = counts[0] ?? 0, burst = counts[1] ?? 0;
    check(ordinary > 0, 'ordinary stream fires');
    const ratio = (burst / 1.5) / (ordinary / 1.5);
    check(Math.abs(ratio - 2) <= .1, `sustained cadence x2 ±5%: ${String(ordinary / 1.5)} vs ${String(burst / 1.5)} shots/s (ratio ${String(ratio)})`);
}
