import { describe, expect, test } from 'vitest';
import { Random } from '../src/engines/shared/random';
import { applyAction, cellsOf, initialState, legalMoves, totalPassengers, validateLevel, type GameState, type LevelDefinition } from '../src/engines/busfolie/rules';
import { analyse, difficulty, solve } from '../src/engines/busfolie/solver';
import { generateLevel, GENERATOR_VERSION, mix, type Template } from '../src/engines/busfolie/generator';
import { parseEntry, toEntry } from '../src/engines/busfolie/format';
import { LEVELS, TIPS, GAME_NAME, GAME_NAME_EN } from '../src/engines/busfolie/levels';
import { SLOTS } from '../src/engines/busfolie/slots';
import { Engine, stars } from '../src/engines/busfolie/engine';
import { busfolieDiversity, busfolieFeatures } from '../scripts/busfolie-diversity.js';

/** A literal board: map rows, one line per vehicle (letter order), exits, line. */
const board = (map: string[], vehicles: string[], exits: string[], queue: string): LevelDefinition =>
    parseEntry({ seed: 0, map, vehicles, exits, queue, par: 0, difficulty: 0, solution: '', trap: null }, 'essai');
function freeze<T>(value: T): T {
    if (typeof value === 'object' && value !== null) { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
}
const CASES = 1000;
const SMALL: Template = { width: 5, height: 5, buses: 3, cars: 1, long: 1, obstacles: 1, colors: 2, twins: 1, coloured: false, oneWay: 1, groupsMax: 2 };
/** A generated board played a few random legal moves in, for the property families. */
function played(random: Random): { level: LevelDefinition; state: GameState } {
    let level: LevelDefinition | null = null;
    for (let k = 0; !level; k++) level = generateLevel({ ...SMALL, width: 5 + Math.floor(random.next() * 2), height: 5 + Math.floor(random.next() * 2) }, Math.floor(random.next() * 1e9) + k);
    let state = initialState(level);
    for (let k = 0, n = Math.floor(random.next() * 6); k < n; k++) {
        const moves = legalMoves(level, state), m = moves[Math.floor(random.next() * moves.length)];
        if (!m) break;
        state = applyAction(level, state, { type: 'MOVE_BUS', busId: m.busId, direction: m.direction, distance: m.distance }).state;
    }
    return { level, state };
}
// A 6 × 6 yard: red bus A (3 seats) facing right on row 2, a cone in row 4, blue bus B vertical in column 4, a car C.
const YARD = board(
    ['......', '......', 'AA..B.', '....B.', '.#....', 'CC....'],
    ['rouge 3 >', 'bleu 2 ^', 'gris'],
    ['right 2', 'top 4'],
    'rouge 2, rouge 1, bleu 2');

describe('Bus en folie : critères d’acceptation', () => {
    test('AC-01 déplacement axial légal, chemin libre : nouvelle position, un coup compté', () => {
        const r = applyAction(YARD, initialState(YARD), { type: 'MOVE_BUS', busId: 'BA', direction: 'forward', distance: 2 });
        expect(r.accepted).toBe(true);
        expect(r.state.busPositions.BA).toEqual({ x: 2, y: 2 });
        expect(r.state.moves).toBe(1);
        // The distance does not change the count: one validated displacement, one move.
        const back = applyAction(YARD, r.state, { type: 'MOVE_BUS', busId: 'BA', direction: 'backward', distance: 2 });
        expect(back.state.moves).toBe(2); expect(back.events.map(e => e.type)).toEqual(['BUS_MOVED']);
    });
    test('AC-02 déplacement transversal ou mal formé : refus, état inchangé', () => {
        const s = freeze(initialState(YARD));
        for (const action of [{ direction: 'up', distance: 1 }, { direction: 'forward', distance: 0 }, { direction: 'forward', distance: 1.5 }, { direction: 'forward', distance: -1 }]) {
            const r = applyAction(YARD, s, { type: 'MOVE_BUS', busId: 'BA', ...action } as never);
            expect(r.accepted).toBe(false); expect(r.state).toBe(s); expect(r.events).toEqual([]);
            if (!r.accepted) expect(r.reason).toBe('INVALID_DIRECTION');
        }
        // A vertical bus has no sideways move at all, and a one-way bus never goes backward.
        expect(legalMoves(YARD, s).filter(m => m.busId === 'BB').length).toBeGreaterThan(0);
        const oneWay = board(['AA....', '......', '......', '......'], ['rouge 2 >!'], ['right 0'], 'rouge 1');
        const r = applyAction(oneWay, initialState(oneWay), { type: 'MOVE_BUS', busId: 'BA', direction: 'backward', distance: 1 });
        expect(r.accepted).toBe(false);
    });
    test('AC-03 obstacle ou véhicule sur la trajectoire : refus atomique', () => {
        const s = freeze(initialState(YARD));
        const intoBus = applyAction(YARD, s, { type: 'MOVE_BUS', busId: 'BA', direction: 'forward', distance: 3 });
        expect(intoBus.accepted).toBe(false); expect(intoBus.state).toBe(s);
        if (!intoBus.accepted) expect(intoBus.reason).toBe('PATH_BLOCKED');
        const cone = board(['A.....', 'A.....', '......', '#.....'], ['vert 2 v'], ['bottom 0'], 'vert 1');
        const r = applyAction(cone, initialState(cone), { type: 'MOVE_BUS', busId: 'BA', direction: 'forward', distance: 2 });
        expect(r.accepted).toBe(false);
        if (!r.accepted) expect(r.reason).toBe('PATH_BLOCKED');
        // Through a bus, never: a long move stops nowhere halfway.
        expect(applyAction(YARD, s, { type: 'MOVE_BUS', busId: 'BA', direction: 'forward', distance: 4 }).state).toBe(s);
    });
    test('AC-04 hors plateau sans sortie compatible : refus', () => {
        const s = initialState(YARD);
        const left = applyAction(YARD, s, { type: 'MOVE_BUS', busId: 'BA', direction: 'backward', distance: 1 });
        expect(left.accepted).toBe(false); if (!left.accepted) expect(left.reason).toBe('OUT_OF_BOUNDS');
        const car = applyAction(YARD, s, { type: 'MOVE_BUS', busId: 'VC', direction: 'backward', distance: 1 });
        expect(car.accepted).toBe(false);
        const coloured = board(['AA..', '....', '....', '....'], ['rouge 2 >'], ['right 0 bleu'], 'rouge 1');
        const r = applyAction(coloured, initialState(coloured), { type: 'MOVE_BUS', busId: 'BA', direction: 'forward', distance: 4 });
        expect(r.accepted).toBe(false); if (!r.accepted) expect(r.reason).toBe('WRONG_EXIT');
    });
    test('AC-05 à la sortie compatible : embarquement dans la limite des places, puis départ', () => {
        const away = applyAction(YARD, initialState(YARD), { type: 'MOVE_BUS', busId: 'BB', direction: 'backward', distance: 2 }).state;
        const r = applyAction(YARD, away, { type: 'MOVE_BUS', busId: 'BA', direction: 'forward', distance: 6 });
        expect(r.accepted).toBe(true);
        expect(r.events.map(e => e.type)).toEqual(['BUS_MOVED', 'PASSENGERS_BOARDED', 'BUS_DEPARTED']);
        // Red 2 then red 1 fit in three seats; blue waits.
        expect(r.events[1]?.payload).toMatchObject({ busId: 'BA', groups: ['G1', 'G2'], count: 3, capacity: 3 });
        expect(r.state.busPositions.BA).toBeUndefined(); expect(r.state.departedBusIds).toEqual(['BA']);
        expect(r.state.passengerQueueIndex).toBe(2); expect(r.state.loads.BA).toBe(3); expect(r.state.remainingPassengerCount).toBe(2);
        // Boarding stops at a group that no longer fits.
        const small = board(['AA..', '....', '....', '....'], ['rouge 3 >'], ['right 0'], 'rouge 2, rouge 2');
        const s = applyAction(small, initialState(small), { type: 'MOVE_BUS', busId: 'BA', direction: 'forward', distance: 4 }).state;
        expect(s.passengerQueueIndex).toBe(1); expect(s.loads.BA).toBe(2);
    });
    test('AC-06 couleur incompatible ou groupe trop nombreux : ni départ ni perte de passagers', () => {
        const blueFirst = board(['AA..', '....', '....', '....'], ['rouge 4 >'], ['right 0'], 'bleu 1, rouge 1');
        const s1 = freeze(initialState(blueFirst));
        const r1 = applyAction(blueFirst, s1, { type: 'MOVE_BUS', busId: 'BA', direction: 'forward', distance: 4 });
        expect(r1.accepted).toBe(false); expect(r1.state).toBe(s1); if (!r1.accepted) expect(r1.reason).toBe('WRONG_COLOR');
        const tooMany = board(['AA..', '....', '....', '....'], ['rouge 2 >'], ['right 0'], 'rouge 3');
        const s2 = freeze(initialState(tooMany));
        const r2 = applyAction(tooMany, s2, { type: 'MOVE_BUS', busId: 'BA', direction: 'forward', distance: 4 });
        expect(r2.accepted).toBe(false); if (!r2.accepted) expect(r2.reason).toBe('OVER_CAPACITY');
        expect(r2.state.remainingPassengerCount).toBe(3); expect(r2.state.passengerQueueIndex).toBe(0);
    });
    test('AC-07 tous les groupes transportés et tous les bus partis : victoire', () => {
        const e = new Engine(); e.loadLevel(0);
        for (const m of LEVELS[0]?.solution.split(', ') ?? []) { const [id = '', how = ''] = m.split(' '); expect(e.move(id, how.startsWith('f') ? 'forward' : 'backward', Number(how.slice(1)))).toBe(true); }
        expect(e.status).toBe('won'); expect(e.events.map(x => x.type)).toContain('LEVEL_WON');
        expect(e.state.delivered).toBe(totalPassengers(e.level));
        // All groups gone but a bus left on the board: not won (every bus must leave).
        const twoBuses = board(['AA..', '....', 'BB..', '....'], ['rouge 2 >', 'rouge 2 >'], ['right 0', 'right 2'], 'rouge 2');
        const s = applyAction(twoBuses, initialState(twoBuses), { type: 'MOVE_BUS', busId: 'BA', direction: 'forward', distance: 4 }).state;
        expect(s.status).toBe('playing'); expect(solve(twoBuses, s).status).toBe('unsolvable');
    });
    test('AC-08 annuler restaure exactement positions, file, charges et score', () => {
        const random = new Random(8);
        for (let k = 0; k < CASES; k++) {
            const { level, state } = played(random);
            const moves = legalMoves(level, state), m = moves[Math.floor(random.next() * moves.length)];
            if (!m) continue;
            const after = applyAction(level, state, { type: 'MOVE_BUS', busId: m.busId, direction: m.direction, distance: m.distance }).state;
            const back = applyAction(level, after, { type: 'UNDO' });
            expect(back.accepted).toBe(true);
            expect(back.state).toEqual(state);
        }
        const s = freeze(initialState(YARD)), none = applyAction(YARD, s, { type: 'UNDO' });
        expect(none.accepted).toBe(false); expect(none.state).toBe(s);
    });
    test('AC-09 même graine et mêmes versions : même niveau', () => {
        for (const [i, slot] of SLOTS.entries()) for (let seed = 1; seed <= 20; seed++) {
            const a = generateLevel(slot.template, seed), b = generateLevel(slot.template, seed);
            expect(a, `${String(i + 1)}/${String(seed)}`).toEqual(b);
        }
        expect(GENERATOR_VERSION).toBe('1.0.0');
        // The template and the version are mixed into the seed: another template, another sequence.
        expect(mix(1, SMALL)).not.toBe(mix(1, { ...SMALL, cars: 2 }));
        expect(generateLevel(SMALL, 3)).not.toEqual(generateLevel(SMALL, 4));
        // The frozen text format reads back the same board.
        const level = generateLevel(SMALL, 5);
        if (level) expect(parseEntry(toEntry(level, { par: 0, difficulty: 0, solution: '', trap: null }), level.id)).toEqual({ ...level, seed: level.seed });
    });
    test('AC-10 la solution du solveur, rejouée dans le moteur, gagne', () => {
        const random = new Random(10);
        let solved = 0;
        for (let k = 0; k < CASES; k++) {
            const { level, state } = played(random), r = solve(level, state);
            expect(r.status).not.toBe('unknown');
            if (r.status !== 'solved') continue;
            let s = state;
            for (const m of r.actions ?? []) { const x = applyAction(level, s, { type: 'MOVE_BUS', busId: m.busId, direction: m.direction, distance: m.distance }); expect(x.accepted).toBe(true); s = x.state; }
            expect(s.status).toBe('won'); solved++;
        }
        expect(solved).toBeGreaterThan(100);
    });
    test('AC-11 limite du solveur atteinte : unknown, jamais unsolvable', () => {
        const big = LEVELS[29] as LevelDefinition;
        const nodes = solve(big, initialState(big), { nodes: 50 });
        expect(nodes).toMatchObject({ status: 'unknown', reason: 'node_limit' });
        const time = solve(big, initialState(big), { ms: -1 });
        expect(time).toMatchObject({ status: 'unknown', reason: 'timeout' });
        expect(analyse(big, initialState(big), 10).status).toBe('unknown');
        // The in-game check never declares a board blocked on an unknown answer.
        const e = new Engine(); e.loadLevel(29);
        expect(e.checkBlocked()).toBe(false); expect(e.status).toBe('playing');
    });
    test('AC-12 partie sauvegardée puis rechargée : état identique', () => {
        const random = new Random(12);
        for (let k = 0; k < 60; k++) {
            const e = new Engine(), index = Math.floor(random.next() * LEVELS.length); e.loadLevel(index);
            for (let n = 0, count = Math.floor(random.next() * 8); n < count && e.status === 'playing'; n++) {
                const moves = legalMoves(e.level, e.state).filter(m => !m.departs || random.next() < 0.3), m = moves[Math.floor(random.next() * moves.length)];
                if (m) e.move(m.busId, m.direction, m.distance);
                if (random.next() < 0.2) e.undo();
            }
            if (e.status === 'won') continue;
            const saved = JSON.parse(JSON.stringify(e.serialize())) as unknown, back = Engine.restore(saved);
            expect(back, `niveau ${String(index + 1)}`).not.toBeNull();
            expect(back?.state).toEqual(e.state); expect(back?.hints).toBe(e.hints);
        }
        expect(Engine.restore({ schemaVersion: '0.9.0', engineVersion: '1.0.0', index: 0, line: [], hints: 0 })).toBeNull();
        expect(Engine.restore({ schemaVersion: '1.0.0', engineVersion: '1.0.0', index: 0, line: [{ busId: 'BZ', direction: 'forward', distance: 1 }], hints: 0 })).toBeNull();
    }, 60000);
});
describe('Bus en folie : propriétés (1000 cas seedés par famille)', () => {
    test('P1 P2 aucun chevauchement, aucun véhicule sur un plot, tout reste dans le plateau', () => {
        const random = new Random(21);
        for (let k = 0; k < CASES; k++) {
            const { level, state } = played(random), w = level.board.width, seen = new Set(level.obstacles.map(o => o.y * w + o.x));
            for (const b of level.buses) {
                const p = state.busPositions[b.id]; if (!p) continue;
                for (const [x, y] of cellsOf(b, p.x, p.y)) {
                    expect(x >= 0 && y >= 0 && x < w && y < level.board.height).toBe(true);
                    expect(seen.has(y * w + x)).toBe(false); seen.add(y * w + x);
                }
                // A vehicle keeps its lane: only its moving coordinate changes.
                expect(b.orientation === 'horizontal' ? p.y === b.y : p.x === b.x).toBe(true);
            }
        }
    });
    test('P3 P4 passagers conservés entre file, bus et livrés ; aucune capacité dépassée', () => {
        const random = new Random(22);
        for (let k = 0; k < CASES; k++) {
            const { level, state } = played(random), total = totalPassengers(level);
            const waiting = level.passengerQueue.slice(state.passengerQueueIndex).reduce((s, g) => s + g.count, 0);
            expect(state.remainingPassengerCount).toBe(waiting);
            expect(waiting + state.delivered).toBe(total);
            expect(Object.values(state.loads).reduce((s, n) => s + n, 0)).toBe(state.delivered);
            for (const [id, load] of Object.entries(state.loads)) expect(load).toBeLessThanOrEqual(level.buses.find(b => b.id === id)?.capacity ?? 0);
        }
    });
    test('P5 une action refusée ne modifie rien', () => {
        const random = new Random(23);
        for (let k = 0; k < CASES; k++) {
            const { level, state } = played(random), s = freeze(state), b = level.buses[Math.floor(random.next() * level.buses.length)];
            const action = { type: 'MOVE_BUS' as const, busId: random.next() < 0.1 ? 'ZZ' : b?.id ?? 'ZZ', direction: random.next() < 0.5 ? 'forward' as const : 'backward' as const, distance: 1 + Math.floor(random.next() * 8) };
            const r = applyAction(level, s, action);
            if (!r.accepted) { expect(r.state).toBe(s); expect(r.events).toEqual([]); }
        }
    });
    test('P6 transitions déterministes et coups légaux tous acceptés', () => {
        const random = new Random(24);
        for (let k = 0; k < CASES; k++) {
            const { level, state } = played(random);
            for (const m of legalMoves(level, state)) {
                const a = applyAction(level, state, { type: 'MOVE_BUS', busId: m.busId, direction: m.direction, distance: m.distance });
                const b = applyAction(level, state, { type: 'MOVE_BUS', busId: m.busId, direction: m.direction, distance: m.distance });
                expect(a.accepted).toBe(true); expect(a).toEqual(b);
                expect(a.accepted && !a.state.busPositions[m.busId]).toBe(m.departs);
            }
        }
    });
    test('P7 P8 solveur vérifié par rejeu ; tous les niveaux publiés sont résolus (validate-busfolie rejoue les 30)', () => {
        for (const [i, level] of LEVELS.entries()) {
            expect(validateLevel(level), `niveau ${String(i + 1)}`).toEqual([]);
            const r = solve(level, initialState(level));
            expect(r.status, `niveau ${String(i + 1)}`).toBe('solved');
            expect(r.actions?.length).toBe(level.par);
        }
    });
});
describe('Bus en folie : niveaux, indice, blocage', () => {
    test('BF01 trente niveaux titrés en français et en anglais, sans nom commercial', () => {
        expect(GAME_NAME).toBe('Bus en folie'); expect(GAME_NAME_EN).toBe('Bus Frenzy');
        expect(LEVELS).toHaveLength(30); expect(TIPS).toHaveLength(30);
        expect(new Set(LEVELS.map(l => l.name)).size).toBe(30); expect(new Set(LEVELS.map(l => l.en)).size).toBe(30);
        for (const l of LEVELS) { expect(l.mode).toBe('classic'); expect(l.board.width).toBeGreaterThanOrEqual(6); expect(l.board.width).toBeLessThanOrEqual(8); }
        // Level 1 is already a classic level: a real traffic move before the departures.
        expect(LEVELS[0]?.par).toBeGreaterThan(LEVELS[0]?.buses.filter(b => b.color !== 'gris').length ?? 0);
    });
    test('BF02 difficulté mesurée : aucun niveau plus facile que celui cinq rangs avant (et le test échoue sinon)', () => {
        const check = (d: readonly number[]): boolean => d.every((v, i) => i < 5 || v >= (d[i - 5] ?? 0));
        const scores = LEVELS.map(l => l.difficulty);
        expect(check(scores)).toBe(true);
        const swapped = [...scores]; [swapped[2], swapped[27]] = [swapped[27] ?? 0, swapped[2] ?? 0];
        expect(check(swapped)).toBe(false);
        // The frozen value is the solver's measure.
        for (const l of LEVELS.slice(0, 6)) expect(difficulty(analyse(l, initialState(l), 60000))).toBe(l.difficulty);
    });
    test('BF03 un vrai piège dès le niveau 2 : un coup tentant mène à une impasse prouvée', () => {
        for (const [i, level] of LEVELS.entries()) {
            if (i === 0) continue;
            expect(level.trap, `niveau ${String(i + 1)}`).not.toBeNull();
            const e = new Engine(); e.loadLevel(i);
            for (const m of [...level.solution.split(', ').slice(0, level.trap?.at ?? 0), level.trap?.move ?? '']) { const [id = '', how = ''] = m.split(' '); expect(e.move(id, how.startsWith('f') ? 'forward' : 'backward', Number(how.slice(1)))).toBe(true); }
            e.checkBlocked();
            expect(e.status, `niveau ${String(i + 1)}`).toBe('blocked');
            // Blocked: moves are refused, undo brings the game back.
            expect(applyAction(e.level, e.state, { type: 'MOVE_BUS', busId: e.level.buses[0]?.id ?? '', direction: 'forward', distance: 1 }).accepted).toBe(false);
            expect(e.undo()).toBe(true); expect(e.status).toBe('playing');
        }
    });
    test('BF04 chaque mécanique arrive seule, à son niveau ; diversité', () => {
        const first = (el: string): number => LEVELS.findIndex(l => busfolieFeatures(l).elements.includes(el)) + 1;
        expect([first('twins'), first('groups'), first('car'), first('cone'), first('coach'), first('coloured-exit'), first('size:7'), first('one-way'), first('size:8')]).toEqual([1, 3, 4, 5, 6, 7, 10, 11, 18]);
        expect([first('colour:jaune'), first('colour:vert'), first('colour:violet'), first('colour:orange')]).toEqual([3, 8, 12, 19]);
        const report = busfolieDiversity(LEVELS);
        expect(report.cloneShare).toBe(0);
        expect(report.maxGapWithoutNovelty).toBeLessThanOrEqual(5);
        expect([first('cars:5'), first('crowded'), first('buses:9')]).toEqual([22, 23, 26]);
    });
    test('BF05 indice : le prochain coup de la solution la plus courte, expliqué, compté comme aide', () => {
        const e = new Engine(); e.loadLevel(4);
        const h = e.hint();
        expect(h.status).toBe('move'); expect(h.remaining).toBe(LEVELS[4]?.par);
        expect(h.text).toMatch(/libère la route|peut partir|premier coup/);
        expect(e.hints).toBe(1);
        // Following hints only wins at par.
        for (let k = 0; k < 60 && e.status === 'playing'; k++) { const m = e.hint().move; if (!m) break; expect(e.move(m.busId, m.direction, m.distance)).toBe(true); }
        expect(e.status).toBe('won'); expect(e.state.moves).toBe(LEVELS[4]?.par);
        expect(stars(e.state.moves, e.par, e.hints)).toBe(1);
        expect([stars(5, 5, 0), stars(7, 5, 1), stars(9, 5, 0)]).toEqual([3, 2, 1]);
    });
    test('BF06 démo du catalogue : le niveau 3 joué le long de sa ligne, gagné puis relancé', async () => {
        const { createDemo } = await import('../src/engines/busfolie/demo');
        const demo = createDemo();
        let won = false;
        for (let k = 0; k < 400; k++) { demo.step(); if (demo.engine.status === 'won') won = true; }
        expect(won).toBe(true); expect(demo.restarts).toBeGreaterThan(0);
    });
});
