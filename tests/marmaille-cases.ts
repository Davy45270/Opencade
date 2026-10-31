import { Engine, FALL_MAX, BUILD_STEPS, ROLES, TICK_MS, type Role, type Kid } from '../src/engines/marmaille/engine';
import { LEVELS } from '../src/engines/marmaille/levels';
import { solutions } from './marmaille-solutions';
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
type Factory = typeof Engine;
/** Replays recorded hand-outs: the [tick, kid, role] action is applied right after that engine tick. */
/** `strict`: a refused hand-out is an error; otherwise it is skipped (a plan missing a role may break further on). */
export function replay(E: Factory, level: number, actions: readonly (readonly [number, number, Role])[], strict = true): Engine {
    const e = new E(level);
    let i = 0;
    while (e.status === 'playing' && e.tick < 5000) {
        e.update();
        while (i < actions.length && actions[i]?.[0] === e.tick) { const [, kid, role] = actions[i] ?? [0, 0, 'block']; check(e.assign(kid, role) || !strict, `M${String(level + 1)} hand-out refused at ${String(e.tick)}`); i++; }
    }
    return e;
}
/** A one-kid sandbox: an engine on level `level`, with its map replaced by `rows` and a single kid placed by hand. */
function sandbox(E: Factory, rows: string[], kid: Partial<Kid>, roles: Partial<Record<Role, number>> = {}): Engine {
    const e = new E(0);
    e.tiles = Array.from({ length: 22 }, (_, y) => Array.from({ length: 20 }, (_, x) => { const c = rows[y]?.[x] ?? ' '; return c === '#' || c === 'X' || c === '~' ? c : ' '; }));
    e.def = { ...e.def, count: 1, exit: { x: 99, y: 99 }, seconds: 999 };
    e.spawned = 1;
    e.kids = [{ id: 0, x: 0, y: 0, dir: 1, state: 'walk', fall: 0, work: 0, steps: 0, float: false, climber: false, ...kid }];
    e.roles = { block: 0, build: 0, dig: 0, bash: 0, float: 0, climb: 0, ...roles };
    return e;
}
const rows = (spec: Record<number, string>): string[] => Array.from({ length: 22 }, (_, y) => (spec[y] ?? '').padEnd(20, '.'));
export const marmailleCases: Record<string, (E?: Factory) => void> = {
    'MA-01 trente niveaux gagnés par rejeu, perdus sans rôles': (E = Engine) => {
        check(LEVELS.length === 30 && solutions.length === 30, 'thirty levels and solutions');
        // Literal end ticks: a level ends as soon as nobody is left walking (posted blockers do not hold it open).
        const ends = [50, 59, 68, 83, 104, 58, 93, 58, 83, 67, 73, 67, 92, 92, 118, 93, 83, 85, 74, 94, 88, 92, 68, 73, 97, 103, 86, 94, 78, 118];
        LEVELS.forEach((def, level) => {
            const won = replay(E, level, solutions[level] ?? []);
            check(won.status === 'won' && won.saved >= def.needed, `M${String(level + 1)} solution wins`);
            check(won.tick === ends[level], `M${String(level + 1)} ends at tick ${String(ends[level])}, not ${String(won.tick)}`);
            check(won.score === won.saved * 100 + Math.floor((def.seconds * 1000 - won.tick * 125) / 1000), `M${String(level + 1)} score`);
            if (level > 0) { const lost = replay(E, level, []); check(lost.status === 'lost' && lost.score === lost.saved * 100, `M${String(level + 1)} needs its roles, no time bonus when lost`); }
        });
    },
    'MA-02 marche, marche d’une case, demi-tour, sortie et eau': (E = Engine) => {
        const step = sandbox(E, rows({ 18: 'XXXXXXXXXXXXXXXXXXXX', 17: '.....X..............' }), { x: 3, y: 17 });
        step.update(); check(step.kids[0]?.x === 4, 'walks one cell per tick');
        step.update(); check(step.kids[0]?.x === 5 && step.kids[0].y === 16, 'climbs a one-cell step');
        const wall = sandbox(E, rows({ 18: 'XXXXXXXXXXXXXXXXXXXX', 17: '.....X..............', 16: '.....X..............' }), { x: 4, y: 17 });
        wall.update(); check(wall.kids[0]?.x === 4 && wall.kids[0].dir === -1, 'turns back at a two-cell wall');
        const water = sandbox(E, rows({ 18: 'XXXXX~XXXXXXXXXXXXXX' }), { x: 4, y: 17 });
        water.update(); water.update(); check(water.kids[0]?.state === 'dead' && water.dead === 1, 'water is fatal');
        const door = sandbox(E, rows({ 18: 'XXXXXXXXXXXXXXXXXXXX' }), { x: 4, y: 17 }); door.def = { ...door.def, exit: { x: 5, y: 17 } };
        door.update(); check(door.kids[0]?.state === 'saved' && door.saved === 1, 'the door saves');
    },
    'MA-03 chute : cinq cases sans danger, six fatales, parachute': (E = Engine) => {
        check(String(FALL_MAX) === '5', 'five cells');
        for (const [height, alive] of [[5, true], [6, false]] as const) {
            const e = sandbox(E, rows({ 18: 'XXXXXXXXXXXXXXXXXXXX' }), { x: 4, y: 17 - height, state: 'fall' });
            for (let i = 0; i < height + 2; i++) e.update();
            check((e.kids[0]?.state !== 'dead') === alive, `fall of ${String(height)}`);
        }
        const p = sandbox(E, rows({ 18: 'XXXXXXXXXXXXXXXXXXXX' }), { x: 4, y: 5, state: 'fall' }, { float: 1 });
        check(p.assign(0, 'float'), 'parachute in the air'); for (let i = 0; i < 15; i++) p.update();
        check(p.kids[0]?.state === 'walk' && p.dead === 0, 'parachute survives twelve cells');
        // A fatal fall onto the door is still fatal.
        const door = sandbox(E, rows({ 18: 'XXXXXXXXXXXXXXXXXXXX' }), { x: 4, y: 5, state: 'fall' }); door.def = { ...door.def, exit: { x: 4, y: 17 } };
        for (let i = 0; i < 15; i++) door.update();
        check(door.saved === 0 && door.dead === 1, 'no rescue at the end of a fatal fall');
    },
    'MA-04 bloqueur : mur pour les autres, jamais enjambé': (E = Engine) => {
        const e = sandbox(E, rows({ 18: 'XXXXXXXXXXXXXXXXXXXX' }), { x: 8, y: 17 }, { block: 1 });
        e.kids.push({ id: 1, x: 6, y: 17, dir: 1, state: 'walk', fall: 0, work: 0, steps: 0, float: false, climber: false });
        check(e.assign(0, 'block'), 'block on the ground'); e.update(); e.update();
        check(e.kids[1]?.x === 7 && e.kids[1].dir === -1 && e.kids[1].y === 17, 'the walker turns, never steps over');
        check(!e.assign(0, 'block'), 'no second block without stock');
        // A climber is turned back too: blockers are not terrain.
        const c = sandbox(E, rows({ 18: 'XXXXXXXXXXXXXXXXXXXX' }), { x: 8, y: 17, state: 'block' });
        c.kids.push({ id: 1, x: 7, y: 17, dir: 1, state: 'walk', fall: 0, work: 0, steps: 0, float: false, climber: true });
        c.update(); check(c.kids[1]?.x === 7 && c.kids[1].dir === -1 && c.kids[1].state === 'walk', 'climber turned by the blocker');
        // Ground roles need ground under the feet (a walker that just stepped over the void).
        const v = sandbox(E, rows({ 18: 'XXXXX..XXXXXXXXXXXXX' }), { x: 5, y: 17 }, { block: 1, build: 1, float: 1 });
        check(!v.assign(0, 'block') && !v.assign(0, 'build') && v.roles.block === 1, 'no blocker over the void');
        check(v.assign(0, 'float'), 'a parachute can still be given');
    },
    'MA-05 bâtisseur : cinq marches, s’arrête sur obstacle': (E = Engine) => {
        const e = sandbox(E, rows({ 18: 'XXXXXXXXXXXXXXXXXXXX' }), { x: 2, y: 17 }, { build: 1 });
        check(String(BUILD_STEPS) === '5', 'five steps');
        check(e.assign(0, 'build'), 'build'); for (let i = 0; i < 10; i++) e.update();
        check(e.kids[0]?.x === 7 && e.kids[0].y === 12 && e.kids[0].state === 'walk', 'five steps up then walks');
        check(e.tiles.flat().filter(t => t === '#').length === 5, 'five bricks');
        const low = sandbox(E, rows({ 18: 'XXXXXXXXXXXXXXXXXXXX', 15: '.....X..............' }), { x: 2, y: 17 }, { build: 1 });
        low.assign(0, 'build'); for (let i = 0; i < 10; i++) low.update();
        check(low.tiles.flat().filter(t => t === '#').length === 2, 'stops under a ceiling');
    },
    'MA-06 creuseur et mineur : terre seulement, la roche arrête': (E = Engine) => {
        const d = sandbox(E, rows({ 18: '####XXXXXXXXXXXXXXXX', 19: '####XXXXXXXXXXXXXXXX', 20: 'XXXXXXXXXXXXXXXXXXXX' }), { x: 2, y: 17 }, { dig: 1 });
        check(d.assign(0, 'dig'), 'dig'); for (let i = 0; i < 8; i++) d.update();
        check(d.kids[0]?.x === 2 && d.kids[0].y === 19 && d.tile(2, 20) === 'X' && d.kids[0].state === 'walk', 'digs two cells, stops on rock');
        const b = sandbox(E, rows({ 18: 'XXXXXXXXXXXXXXXXXXXX', 17: '....##X.............' }), { x: 3, y: 17 }, { bash: 1 });
        check(b.assign(0, 'bash'), 'bash'); for (let i = 0; i < 6; i++) b.update();
        check(b.tile(4, 17) === ' ' && b.tile(5, 17) === ' ' && b.tile(6, 17) === 'X' && b.kids[0]?.dir === -1, 'bashes earth, turns on rock');
    },
    'MA-07 grimpeur : escalade puis passe par-dessus': (E = Engine) => {
        const e = sandbox(E, rows({ 18: 'XXXXXXXXXXXXXXXXXXXX', 17: '.....X..............', 16: '.....X..............', 15: '.....X..............' }), { x: 4, y: 17 }, { climb: 1 });
        check(e.assign(0, 'climb'), 'climb'); for (let i = 0; i < 12; i++) e.update();
        check((e.kids[0]?.x ?? 0) > 5 && e.kids[0]?.state === 'walk' && e.dead === 0, 'over the wall');
        check(!e.assign(0, 'climb'), 'climber only once');
        // Duplicates are refused while stock remains, and do not consume it.
        const d = sandbox(E, rows({ 18: 'XXXXXXXXXXXXXXXXXXXX' }), { x: 4, y: 17 }, { climb: 2, float: 2 });
        check(d.assign(0, 'climb') && !d.assign(0, 'climb') && d.roles.climb === 1, 'second climb refused, stock kept');
        check(d.assign(0, 'float') && !d.assign(0, 'float') && d.roles.float === 1, 'second parachute refused, stock kept');
    },
    'MA-08 rôles introduits un par un, déterminisme': (E = Engine) => {
        const first = Object.fromEntries(ROLES.map(r => [r, LEVELS.findIndex(l => (l.roles[r] ?? 0) > 0)]));
        check(JSON.stringify(first) === JSON.stringify({ block: 1, build: 3, dig: 5, bash: 7, float: 9, climb: 11 }), 'introduction levels');
        for (let level = 1; level < LEVELS.length; level++) {
            const roles = Object.keys(LEVELS[level]?.roles ?? {}), prev = Object.keys(LEVELS[level - 1]?.roles ?? {});
            check(roles.join() !== prev.join() || JSON.stringify(LEVELS[level]?.map) !== JSON.stringify(LEVELS[level - 1]?.map), `M${String(level + 1)} differs`);
        }
        const a = replay(E, 29, solutions[29] ?? []).snapshot(), b = replay(E, 29, solutions[29] ?? []).snapshot();
        check(JSON.stringify(a) === JSON.stringify(b), 'deterministic');
    },
    'MA-10 stocks, attributions refusées et horloge': (E = Engine) => {
        const floor = rows({ 18: 'XXXXXXXXXXXXXXXXXXXX' }), walker = (id: number, x: number): Kid => ({ id, x, y: 17, dir: 1, state: 'walk', fall: 0, work: 0, steps: 0, float: false, climber: false });
        // Each hand-out spends one unit of that role; an empty stock refuses a fresh walker.
        for (const role of ROLES) {
            const e = sandbox(E, floor, { x: 2, y: 17 }, { [role]: 1 }); e.kids.push(walker(1, 8));
            check(e.assign(0, role) && e.roles[role] === 0, `${role} spends its stock`);
            check(!e.assign(1, role) && e.roles[role] === 0, `${role} refused on an empty stock`);
        }
        // The same job twice on the same kid is refused and keeps the stock.
        for (const role of ['build', 'dig', 'bash'] as const) {
            const e = sandbox(E, rows({ 18: '####################', 19: 'XXXXXXXXXXXXXXXXXXXX' }), { x: 2, y: 17 }, { [role]: 2 });
            check(e.assign(0, role) && !e.assign(0, role) && e.roles[role] === 1, `${role} not handed twice`);
        }
        // Saved or dead kids, and a finished level, take no role.
        const done = sandbox(E, floor, { x: 2, y: 17, state: 'saved' }, { block: 1, float: 1 }); done.kids.push({ ...walker(1, 8), state: 'dead' });
        check(!done.assign(0, 'float') && !done.assign(1, 'block') && done.roles.block === 1 && done.roles.float === 1, 'no role for saved or dead kids');
        const over = sandbox(E, floor, { x: 2, y: 17 }, { block: 1 }); over.status = 'won';
        check(!over.assign(0, 'block') && over.roles.block === 1, 'no role once the level is over');
        // Real time: step() runs one tick per TICK_MS, keeping the remainder.
        const clock = new E(0); clock.step(TICK_MS * 3 - 1); check(clock.tick === 2, 'two ticks before the third period ends');
        clock.step(1); check(clock.tick === 3, 'third tick on the exact period');
    },
    'MA-09 la solution privée d’un rôle proposé perd, au plus trois rôles par plateau': (E = Engine) => {
        LEVELS.forEach((def, level) => {
            const offered = ROLES.filter(r => (def.roles[r] ?? 0) > 0);
            check(offered.length <= 3, `M${String(level + 1)} offers at most three roles`);
            for (const role of offered) {
                const used = (solutions[level] ?? []).filter(a => a[2] === role);
                check(used.length > 0 && used.length <= (def.roles[role] ?? 0), `M${String(level + 1)} uses ${role} within its stock`);
                const without = replay(E, level, (solutions[level] ?? []).filter(a => a[2] !== role), false);
                check(without.status === 'lost', `M${String(level + 1)} is lost without ${role}`);
            }
        });
    },
};
