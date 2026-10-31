import * as rules from '../src/engines/gourmandises/engine';
import { difficulty, LEVELS, terrain, WORLDS } from '../src/engines/gourmandises/levels';
import { createDemo } from '../src/engines/gourmandises/demo';
import { ids } from '../src/characters/model';
import { measureLevel, checkBalance } from './gourmandises-campaign';
type Rules = typeof rules;
function ok(value: unknown, message = 'Oracle'): asserts value {
    if (!value) throw new Error(message);
}
function equal(actual: unknown, expected: unknown, message = 'Égalité'): void {
    ok(JSON.stringify(actual) === JSON.stringify(expected), `${message}: ${JSON.stringify(actual)} ≠ ${JSON.stringify(expected)}`);
}
/** Every board is literal, with no initial accidental run. */
export function fixture(module: Rules = rules): rules.Engine {
    const engine = new module.Engine('arcade');
    const state = engine.snapshot();
    const board = [
        [0, 1, 0, 2, 3, 4],
        [1, 0, 2, 3, 4, 0],
        [2, 3, 4, 0, 1, 2],
        [3, 4, 0, 1, 2, 3],
        [4, 0, 1, 2, 3, 4],
        [0, 1, 2, 3, 4, 0],
    ];
    state.cells = board.flat().map(color => ({ active: true, crate: 0, ice: 0, piece: { color } }));
    state.objectives = [{ kind: 'score', target: 100000 }];
    state.budget = 1000;
    engine.restore(state);
    return engine;
}
function color(engine: rules.Engine, indices: number[], value: number): void {
    for (const i of indices) required(engine.state.cells[i]).piece = { color: value };
}
function firstWave(engine: rules.Engine): number[] {
    return engine.events.find(e => e.type === 'match')?.cells ?? [];
}
export const oracles: Record<string, (module?: Rules) => void> = {
    G01(module = rules) {
        const engine = fixture(module);
        const before = engine.snapshot();
        ok(!engine.swap(34, 35));
        equal(engine.snapshot(), before);
        ok(engine.events.some(e => e.type === 'refused'));
        ok(engine.swap(1, 7));
        equal(engine.state.moves, 1);
        ok(engine.state.score >= 30);
        ok(!engine.swap(0, 7));
    },
    G02(module = rules) {
        for (const [indices, special] of [
            [[12, 13, 14], undefined], [[12, 13, 14, 15], 'row'],
            [[12, 13, 14, 15, 16], 'color'], [[0, 6, 12, 13, 14], 'wrapped'],
            [[6, 7, 8, 13, 19], 'wrapped'],
        ] as const) {
            const engine = fixture(module);
            color(engine, [...indices], 4);
            const match = engine.matches().find(g => indices.every(i => g.cells.includes(i)));
            ok(match);
            equal(match.special, special);
            if (special) {
                engine.resolve(indices[0]);
                const created = engine.events.find(e => e.type === 'special' && e.piece);
                equal(created?.piece?.special, special);
                ok(engine.events.some(e => e.type === 'match'));
                // The created piece survives the first wave; refill may later trigger it.
                const first = engine.events.find(e => e.type === 'match');
                ok(first && !first.cells.includes(indices[0]));
            }
        }
        const vertical = fixture(module);
        color(vertical, [6, 12, 18, 24], 4);
        vertical.resolve(6, 0);
        const created = vertical.events.find(e => e.type === 'special' && e.piece);
        equal(created?.piece?.special, 'column');
    },
    G03(module = rules) {
        const a = fixture(module);
        required(a.state.cells[30]).piece = null;
        const b = a.clone();
        const top = required(a.state.cells[0]).piece;
        a.gravity();
        b.gravity();
        equal(a.snapshot(), b.snapshot());
        equal(required(a.state.cells[6]).piece, top);
        ok(a.state.cells.every(c => c.piece));
        ok(a.events.some(e => e.type === 'fill'));
    },
    G04(module = rules) {
        const engine = fixture(module);
        color(engine, [18, 24, 30], 4);
        color(engine, [12, 31, 32], 1);
        engine.resolve();
        const cascades = engine.events.filter(e => e.type === 'cascade');
        ok(cascades.length > 0, 'Cascade attendue');
        ok(cascades.every(e => e.multiplier >= 2));
        const matches = engine.events.filter(e => e.type === 'match');
        const minimum = matches.reduce((sum, e) => sum + e.cells.length * 10 * e.multiplier, 0);
        equal(engine.state.score, minimum);
    },
    G05(module = rules) {
        for (const special of ['row', 'column'] as const) {
            const engine = fixture(module);
            required(required(engine.state.cells[14]).piece).special = special;
            ok(engine.swap(14, 15));
            const wave = firstWave(engine);
            const expected = special === 'row' ? [12, 13, 14, 15, 16, 17] : [3, 9, 15, 21, 27, 33];
            equal([...wave].sort((a, b) => a - b), expected);
        }
    },
    G06(module = rules) {
        const engine = fixture(module);
        required(required(engine.state.cells[14]).piece).special = 'wrapped';
        engine.swap(14, 15);
        const waves = engine.events.filter(e => e.type === 'match');
        const expected = [8, 9, 10, 14, 15, 16, 20, 21, 22];
        ok(waves.length >= 2);
        ok(expected.every(i => required(waves[0]).cells.includes(i)));
        ok(expected.every(i => required(waves[1]).cells.includes(i)));
    },
    G07(module = rules) {
        const engine = fixture(module);
        required(required(engine.state.cells[14]).piece).special = 'color';
        const target = required(required(engine.state.cells[15]).piece).color;
        const expected = engine.state.cells.flatMap((c, i) => c.piece?.color === target ? [i] : []);
        engine.swap(14, 15);
        equal([...new Set([...expected, 14, 15])].sort((a, b) => a - b),
            [...firstWave(engine)].sort((a, b) => a - b));
    },
    G08(module = rules) {
        for (const [a, b] of [['row', 'column'], ['row', 'wrapped'], ['color', 'row'], ['color', 'color']] as const) {
            const engine = fixture(module);
            required(required(engine.state.cells[14]).piece).special = a;
            required(required(engine.state.cells[15]).piece).special = b;
            const target = required(required(engine.state.cells[15]).piece).color;
            const converted = engine.state.cells.flatMap((c, i) => c.piece?.color === target ? [i === 15 ? 14 : i] : []);
            const expected = new Set<number>([14, 15]);
            if (a === 'color' && b === 'row') {
                for (const i of converted) {
                    for (let j = 0; j < 36; j++) {
                        if (i % 2 ? Math.floor(i / 6) === Math.floor(j / 6) : i % 6 === j % 6) expected.add(j);
                    }
                }
            } else {
                for (let i = 0; i < 36; i++) {
                    const radius = b === 'wrapped' ? 1 : 0;
                    if (a === 'color' || Math.abs(i % 6 - 3) <= radius
                        || Math.abs(Math.floor(i / 6) - 2) <= radius) expected.add(i);
                }
            }
            engine.swap(14, 15);
            equal([...firstWave(engine)].sort((x, y) => x - y), [...expected].sort((x, y) => x - y));
            if (a === 'color' && b === 'row') {
                const triggered = engine.events.filter(e => e.type === 'special').map(e => e.cells[0]);
                ok(converted.every(i => triggered.includes(i)), 'Chaque pièce convertie déclenche sa ligne');
            }
        }
        const crates = fixture(module);
        for (const i of [7, 8, 9, 13, 14, 15, 19, 20, 21]) {
            crates.state.cells[i] = { active: true, crate: 2, ice: 0, piece: null };
        }
        for (const i of [30, 31]) required(required(crates.state.cells[i]).piece).special = 'color';
        crates.swap(30, 31);
        equal([...firstWave(crates)].sort((x, y) => x - y), Array.from({ length: 36 }, (_, i) => i));
        const firstMatch = crates.events.findIndex(e => e.type === 'match');
        equal(crates.events.slice(0, firstMatch).filter(e => e.type === 'obstacle' && e.cells.includes(14)).length, 1);
    },
    G09(module = rules) {
        const engine = fixture(module);
        engine.state.cells[18] = { active: true, crate: 2, ice: 0, piece: null };
        color(engine, [19, 20, 21], 4);
        engine.resolve();
        ok(engine.state.broken.crate >= 1);
        const blocked = fixture(module);
        blocked.state.cells[18] = { active: true, crate: 2, ice: 0, piece: null };
        required(blocked.state.cells[30]).piece = null;
        const upper = required(blocked.state.cells[12]).piece;
        blocked.gravity();
        equal(required(blocked.state.cells[12]).piece, upper);
        equal(required(blocked.state.cells[18]).piece, null);
        blocked.useTool('hammer', 18);
        equal(required(blocked.state.cells[18]).crate, 1);
        blocked.state.tools.hammer = 1;
        blocked.useTool('hammer', 18);
        equal(required(blocked.state.cells[18]).crate, 0);
    },
    G10(module = rules) {
        const engine = fixture(module);
        required(engine.state.cells[0]).ice = 1;
        engine.swap(1, 7);
        equal(required(engine.state.cells[0]).ice, 0);
        equal(engine.state.broken.ice, 1);
        const special = fixture(module);
        color(special, [12, 13, 14, 15], 4);
        required(special.state.cells[12]).ice = 1;
        special.resolve(12);
        equal(required(special.state.cells[12]).ice, 0);
        equal(special.state.broken.ice, 1);
        ok(special.events.some(e => e.type === 'special' && e.cells.includes(12) && e.piece?.special === 'row'));
        ok(!firstWave(special).includes(12), 'La pièce survit, son sol casse');
    },
    G11(module = rules) {
        const engine = fixture(module);
        engine.state.cells[14] = { active: false, crate: 0, ice: 0, piece: null };
        ok(!engine.swap(13, 14));
        engine.gravity();
        equal(required(engine.state.cells[14]).piece, null);
        color(engine, [12, 13, 15], 0);
        ok(!engine.matches().some(g => g.cells.includes(12) && g.cells.includes(15)));
    },
    G12(module = rules) {
        const a = fixture(module);
        color(a, [0, 1, 2], 1);
        required(required(a.state.cells[35]).piece).special = 'column';
        const b = a.clone();
        const inventory = a.state.cells.map(c => JSON.stringify(c.piece)).sort();
        a.shuffle();
        b.shuffle();
        equal(a.state.cells.map(c => JSON.stringify(c.piece)).sort(), inventory);
        equal(a.snapshot(), b.snapshot());
        equal(a.matches().length, 0);
        ok(a.validMoves().length > 0);
        const dead = fixture(module);
        for (let i = 0; i < 36; i++) required(dead.state.cells[i]).piece = { color: (i % 6 + Math.floor(i / 6)) % 5 };
        equal(dead.validMoves().length, 0);
        dead.resolve();
        ok(dead.events.some(e => e.type === 'shuffle'));
        ok(dead.validMoves().length > 0);
        equal(dead.matches().length, 0);
    },
    G13(module = rules) {
        const engine = fixture(module);
        engine.state.objectives = [{ kind: 'collect', color: 0, target: 3 }, { kind: 'score', target: 30 }];
        engine.swap(1, 7);
        equal(engine.status, 'won');
        equal(engine.stars, 1);
        engine.state.score = 1499;
        equal(engine.stars, 1);
        engine.state.score = 1500;
        equal(engine.stars, 2);
        engine.state.score = 2999;
        equal(engine.stars, 2);
        engine.state.score = 3000;
        equal(engine.stars, 3);
        const lost = fixture(module);
        lost.state.budget = 1;
        lost.swap(1, 7);
        equal(lost.status, 'lost');
        equal(lost.stars, 0);
        ok(!lost.swap(1, 7));
        const obstacles = fixture(module);
        obstacles.state.cells[18] = { active: true, crate: 1, ice: 0, piece: null };
        required(obstacles.state.cells[19]).ice = 1;
        obstacles.state.objectives = [{ kind: 'crate', target: 1 }, { kind: 'ice', target: 1 }];
        obstacles.useTool('hammer', 18);
        equal(obstacles.status, 'playing');
        obstacles.useTool('rocket', 19);
        equal(obstacles.progress({ kind: 'crate', target: 1 }), 1);
        equal(obstacles.progress({ kind: 'ice', target: 1 }), 1);
        equal(obstacles.status, 'won');
    },
    G14(module = rules) {
        for (const tool of ['hammer', 'rocket', 'rainbow'] as const) {
            const engine = fixture(module);
            const target = 14;
            const targetColor = required(required(engine.state.cells[target]).piece).color;
            const expected = engine.state.cells.flatMap((c, i) => tool === 'hammer' ? i === target ? [i] : []
                : tool === 'rocket' ? Math.floor(i / 6) === 2 ? [i] : []
                    : c.piece?.color === targetColor ? [i] : []);
            ok(engine.useTool(tool, target));
            equal([...firstWave(engine)].sort((a, b) => a - b), expected);
            equal(engine.state.tools[tool], 0);
            equal(engine.state.moves, 0);
            ok(!engine.useTool(tool, target));
        }
    },
    G15(module = rules) {
        const engine = fixture(module);
        engine.state.mode = 'discovery';
        engine.state.budget = 0;
        engine.swap(1, 7);
        equal(engine.status, 'playing');
        equal(engine.hint(), null);
        engine.advance(4999);
        equal(engine.hint(), null);
        engine.advance(1);
        ok(engine.hint());
        engine.state.mode = 'arcade';
        equal(engine.hint(), null);
        const discovery = new module.Engine();
        equal(discovery.state.tools, { hammer: 3, rocket: 3, rainbow: 3 });
    },
    G16(module = rules) {
        const a = new module.Engine('arcade');
        const b = new module.Engine('arcade');
        for (let i = 0; i < 10; i++) {
            const move = required(a.validMoves()[0]);
            a.swap(...move);
            b.swap(...move);
            equal(a.snapshot(), b.snapshot());
            equal(a.events, b.events);
        }
        equal(JSON.parse(JSON.stringify(a.snapshot())), a.snapshot());
    },
    G17() {
        geometryChecks();
        equal(LEVELS.length, 180);
        equal(WORLDS.filter(world => world.playable).length, 9);
        for (let i = 0; i < 180; i++) {
            const level = required(LEVELS[i]);
            const cells = terrain(level);
            const actual = difficulty(i);
            equal(actual, {
                pressure: level.objectives.reduce((sum, o) => sum + o.target, 0) / level.moves,
                colors: level.colors,
                obstacles: cells.reduce((sum, c) => sum + c.crate + c.ice + (c.chocolate ? 1 : 0) + (c.hedge ? 1 : 0), 0),
                absent: cells.filter(c => !c.active).length,
                objectives: level.objectives.length,
            });
            if (i >= 60) {
                equal(level.width, level.world >= 7 ? (level.layout < 14 ? 8 : 9) : level.layout < 7 ? 7 : 8);
                equal(level.height, level.world >= 7 ? (level.layout < 7 ? 7 : 8) : level.layout < 14 ? 7 : 8);
                if (level.world === 4) {
                    ok(level.objectives.some(o => o.kind === 'drop'));
                    ok(cells.some(c => c.exit), 'Sorties marquées');
                    ok(cells.every(c => !c.exit || c.active));
                } else if (level.world === 5) {
                    ok(cells.every(c => c.ice <= 1));
                    ok(cells.filter(c => c.ice).length >= cells.filter(c => c.active).length / 2, 'Grande zone gelée');
                } else if (level.world === 6) {
                    ok(cells.some(c => c.ice === 2));
                    ok(cells.some(c => c.active && !c.ice), 'Couloirs de glace et passages libres');
                    ok(cells.every(c => c.ice === 0 || c.ice === 2));
                }
                if (level.world === 7) ok(cells.some(c => c.chocolate), 'Murs en chocolat');
                if (level.world === 8) {
                    ok(cells.some(c => c.hedge), 'Massifs fleuris');
                    ok(level.objectives.some(o => o.kind === 'flower'));
                    ok(cells.filter(c => c.hedge).length >= required(level.objectives[0]).target);
                }
                if (level.world === 9) ok(cells.some(c => c.belt), 'Bandes orientées');
                if (level.finale) equal(level.objectives.length, 2);
            }
            // Budgets and silhouettes restart with each world's introduction.
            // Only the measured policy, in the campaign oracle, compares worlds.
            if (i < 60 && i % 20) {
                const previous = difficulty(i - 1);
                for (const key of ['pressure', 'colors', 'obstacles', 'absent', 'objectives'] as const) {
                    ok(actual[key] >= previous[key], `Niveau ${String(i + 1)} : ${key}`);
                }
            }
            if (level.layout === 11) {
                const x = Math.floor(level.width / 2);
                const y = Math.floor(level.height / 2);
                for (let row = 0; row < level.height; row++) {
                    equal(required(cells[row * level.width + x]).active, row === y);
                }
                ok(required(cells[y * level.width + x - 1]).active);
                ok(required(cells[y * level.width + x + 1]).active);
            }
            if (level.layout === 2) {
                ok(!required(cells[level.width * 2]).active, 'Colonne étroite');
                ok(required(cells[level.width * 2 + Math.floor(level.width / 2)]).active);
            }
            if (level.layout === 3) {
                ok(!required(cells[0]).active, 'Croix : coins absents');
                ok(required(cells[Math.floor(level.height / 2) * level.width + Math.floor(level.width / 2)]).active);
            }
        }
        ok(required(LEVELS[19]).finale && required(LEVELS[39]).finale && required(LEVELS[59]).finale);
        ok(terrain(required(LEVELS[59])).some(c => c.crate === 2));
    },
    G17Campaign() {
        for (const index of [60, 80, 100]) {
            checkBalance(measureLevel(index, [37, 101]));
        }
    },
    G18() {
        const demo = createDemo(28);
        let previous = JSON.stringify(demo.engine.state.cells);
        let unchanged = 0;
        for (let i = 0; i < 2000; i++) {
            demo.step();
            const next = JSON.stringify(demo.engine.state.cells);
            unchanged = next === previous ? unchanged + 1 : 0;
            ok(unchanged < 36, 'Vignette figée');
            previous = next;
        }
        ok(demo.restarts > 0);
    },
    G19(module = rules) {
        let reference = '';
        for (const id of ids) {
            const engine = new module.Engine('arcade', id);
            equal(engine.state.character, id);
            engine.swap(...required(engine.validMoves()[0]));
            const state = engine.snapshot();
            const normalized = JSON.stringify({ ...state, character: 'panda' });
            if (reference) equal(normalized, reference);
            reference = normalized;
        }
    },
    G21(module = rules) {
        const object = fixture(module);
        color(object, [0, 1, 2], 2);
        required(object.state.cells[1]).piece = { color: 2, drop: true };
        ok(!object.matches().some(g => g.cells.includes(1)), 'Un objet ne forme pas un alignement');
        object.useTool('hammer', 1);
        ok(object.state.cells.some(c => c.piece?.drop), 'Un outil ne détruit pas un objet');
        const before = object.state.cells.findIndex(c => c.piece?.drop);
        const inventory = object.state.cells.map(c => JSON.stringify(c.piece)).sort();
        const shuffled = object.clone();
        object.shuffle();
        shuffled.shuffle();
        equal(object.snapshot(), shuffled.snapshot());
        equal(object.state.cells.map(c => JSON.stringify(c.piece)).sort(), inventory);
        ok(required(object.state.cells[before]).piece?.drop, 'Un objet ne se rebat pas');
        const anchored = fixture(module);
        for (const i of [0, 17, 35]) required(anchored.state.cells[i]).piece = { color: 2, drop: true };
        anchored.shuffle();
        for (const i of [0, 17, 35]) ok(anchored.state.cells[i]?.piece?.drop, 'Les trois objets gardent leur case');
        const fall = fixture(module);
        required(fall.state.cells[0]).piece = { color: 2, drop: true };
        for (const i of [6, 12, 18, 24, 30]) required(fall.state.cells[i]).piece = null;
        required(fall.state.cells[30]).exit = true;
        const collected = fall.state.collected[2];
        fall.gravity();
        equal(fall.state.dropped, 1);
        equal(fall.state.collected[2], collected);
        ok(!fall.state.cells.some(c => c.piece?.drop));
        ok(fall.events.some(e => e.type === 'fall' && e.piece?.drop && e.to === 30));
        ok(fall.events.some(e => e.type === 'drop' && e.cells[0] === 30));
        const immediate = fixture(module);
        required(immediate.state.cells[30]).exit = true;
        required(immediate.state.cells[30]).piece = { color: 2, drop: true };
        immediate.resolve();
        equal(immediate.state.dropped, 1);
        ok(!immediate.state.cells[30]?.piece?.drop);
    },
    G22(module = rules) {
        const engine = fixture(module);
        required(engine.state.cells[0]).ice = 2;
        engine.swap(1, 7);
        equal(required(engine.state.cells[0]).ice, 1);
        equal(engine.state.broken.ice, 1);
        engine.useTool('hammer', 0);
        equal(required(engine.state.cells[0]).ice, 0);
        equal(engine.state.broken.ice, 2);
        const special = fixture(module);
        color(special, [12, 13, 14, 15], 4);
        required(special.state.cells[12]).ice = 2;
        special.resolve(12);
        equal(required(special.state.cells[12]).ice, 1);
        equal(special.state.broken.ice, 1);
    },
    G23(module = rules) {
        for (const index of [79, 99, 119]) {
            const level = required(LEVELS[index]);
            ok(level.finale);
            equal(level.objectives.length, 2);
        }
        const engine = fixture(module);
        engine.state.objectives = [{ kind: 'drop', target: 1 }, { kind: 'collect', color: 0, target: 3 }];
        required(engine.state.cells[35]).piece = { color: 2, drop: true };
        required(engine.state.cells[35]).exit = true;
        engine.resolve();
        equal(engine.progress({ kind: 'drop', target: 1 }), 1);
        equal(engine.status, 'playing');
        engine.swap(1, 7);
        equal(engine.status, 'won');
        // A complete ordinary swap really opens an outlet beneath cargo.
        const swap = fixture(module);
        required(swap.state.cells[0]).piece = { color: 2, drop: true };
        required(swap.state.cells[6]).exit = true;
        color(swap, [6, 8], 4);
        color(swap, [7], 1);
        color(swap, [13], 4);
        ok(swap.swap(7, 13));
        equal(swap.state.dropped, 1);
        ok(swap.events.some(e => e.type === 'swap'));
        ok(swap.events.some(e => e.type === 'drop' && e.cells.includes(6)));
    },
    G26(module = rules) {
        const broken = fixture(module);
        required(broken.state.cells[6]).chocolate = true;
        required(broken.state.cells[6]).piece = null;
        required(broken.state.cells[35]).chocolate = true;
        required(broken.state.cells[35]).piece = null;
        required(required(broken.state.cells[30]).piece).special = 'row';
        ok(!broken.validMoves().some(move => move.includes(6)), 'Bloqueur solide');
        ok(broken.swap(1, 7));
        equal(broken.state.cells[6]?.chocolate, false);
        equal(broken.state.broken.chocolate, 1);
        ok(!broken.events.some(e => e.type === 'grow'), 'Pas d’extension après une casse');
        const growing = fixture(module);
        required(growing.state.cells[35]).chocolate = true;
        required(growing.state.cells[35]).piece = null;
        required(required(growing.state.cells[30]).piece).special = 'row';
        const other = growing.clone();
        ok(growing.swap(1, 7));
        other.swap(1, 7);
        equal(growing.snapshot(), other.snapshot());
        equal(growing.events.filter(e => e.type === 'grow').map(e => e.cells), [[29]]);
        equal(growing.state.cells.filter(c => c.chocolate).length, 2);
        const blocked = fixture(module);
        blocked.state.cells.forEach((c, i) => {
            c.chocolate = i !== 0;
            if (c.chocolate) c.piece = null;
        });
        const copy = blocked.clone();
        blocked.shuffle();
        copy.shuffle();
        equal(blocked.snapshot(), copy.snapshot());
        ok(blocked.state.cells.every(c => !c.chocolate));
        const full = fixture(module);
        full.state.cells.forEach(c => { c.chocolate = true; c.piece = null; });
        full.shuffle();
        ok(full.state.cells.every(c => !c.chocolate), 'Même un plateau entièrement couvert repart');
        ok(full.validMoves().length > 0);
        equal(full.state.broken.chocolate, 36, 'Le retrait de secours ne rend pas l’objectif impossible');
        const anchored = fixture(module);
        required(anchored.state.cells[35]).chocolate = true;
        required(anchored.state.cells[35]).piece = null;
        required(required(anchored.state.cells[30]).piece).special = 'row';
        anchored.shuffle();
        equal(anchored.state.cells[35]?.chocolate, true, 'Le chocolat reste fixe si un coup existe');
        equal(anchored.state.cells[35]?.piece, null);
        ok(blocked.validMoves().length > 0);
        equal(blocked.matches().length, 0);
        const protectedMatch = fixture(module);
        color(protectedMatch, [12, 13, 14, 15], 4);
        required(protectedMatch.state.cells[6]).chocolate = true;
        required(protectedMatch.state.cells[6]).piece = null;
        protectedMatch.resolve(12);
        const firstMatch = protectedMatch.events.findIndex(e => e.type === 'match');
        ok(protectedMatch.events.slice(0, firstMatch).some(e => e.type === 'obstacle' && e.cells.includes(6)),
            'L’alignement adjacent au spécial créé casse aussi le chocolat');
        const solid = fixture(module);
        required(solid.state.cells[18]).chocolate = true;
        required(solid.state.cells[18]).piece = null;
        required(solid.state.cells[12]).piece = null;
        solid.gravity();
        equal(solid.state.cells[18]?.piece, null, 'Gravité arrêtée par le chocolat');
        solid.useTool('hammer', 18);
        equal(solid.state.cells[18]?.chocolate, false, 'Un spécial ou outil touche directement le chocolat');
    },
    G27(module = rules) {
        const engine = fixture(module);
        required(engine.state.cells[0]).hedge = true;
        required(engine.state.cells[6]).hedge = true;
        engine.state.objectives = [{ kind: 'flower', target: 2 }];
        ok(engine.swap(1, 7));
        equal(engine.state.cells[0]?.hedge, false);
        equal(engine.state.cells[6]?.hedge, true, 'L’adjacence ne casse pas une haie');
        equal(engine.state.released, 1);
        equal(engine.status, 'playing');
        engine.useTool('hammer', 6);
        equal(engine.state.released, 2);
        equal(engine.progress({ kind: 'flower', target: 2 }), 2);
        equal(engine.status, 'won');
        const protectedFlower = fixture(module);
        required(protectedFlower.state.cells[12]).hedge = true;
        color(protectedFlower, [12, 13, 14, 15], 4);
        protectedFlower.resolve(12);
        equal(protectedFlower.state.cells[12]?.hedge, false, 'Créer un spécial libère la fleur');
        equal(protectedFlower.state.released, 1);
        const fixed = fixture(module);
        required(fixed.state.cells[0]).hedge = true;
        const copy = fixed.clone();
        fixed.shuffle();
        copy.shuffle();
        equal(fixed.snapshot(), copy.snapshot());
        equal(fixed.state.cells[0]?.hedge, true, 'Les haies restent fixées au sol');
    },
    G28(module = rules) {
        for (const direction of ['right', 'left', 'down', 'up'] as const) {
            const engine = fixture(module);
            const indices = direction === 'right' || direction === 'left' ? [12, 13, 14, 15] : [2, 8, 14, 20];
            indices.forEach((i, index) => {
                required(engine.state.cells[i]).belt = { band: 1, direction };
                required(engine.state.cells[i]).piece = { color: index, ...(index === 3 ? { special: 'row' as const } : {}) };
            });
            const pieces = indices.map(i => engine.state.cells[i]?.piece);
            const step = direction === 'left' || direction === 'up' ? -1 : 1;
            engine.advanceBelts();
            indices.forEach((_, index) => {
                const to = required(indices[(index + step + 4) % 4]);
                equal(engine.state.cells[to]?.piece, pieces[index]);
                equal(engine.state.cells[to]?.belt, { band: 1, direction });
            });
            equal(engine.events.filter(e => e.type === 'belt').length, 4);
            const clone = engine.clone();
            engine.shuffle();
            clone.shuffle();
            equal(engine.snapshot(), clone.snapshot());
            for (const i of indices) equal(engine.state.cells[i]?.belt, { band: 1, direction });
        }
        const gravity = fixture(module);
        required(gravity.state.cells[6]).belt = { band: 0, direction: 'right' };
        required(gravity.state.cells[7]).belt = { band: 0, direction: 'right' };
        const piece = gravity.state.cells[0]?.piece;
        required(gravity.state.cells[6]).piece = null;
        gravity.gravity();
        equal(gravity.state.cells[6]?.piece, piece);
        gravity.advanceBelts();
        equal(gravity.state.cells[7]?.piece, piece, 'Le tapis transporte après la chute');
        const turn = fixture(module);
        for (const i of [30, 31, 32, 33, 34, 35]) required(turn.state.cells[i]).belt = { band: 3, direction: 'left' };
        const before = turn.snapshot();
        ok(!turn.swap(34, 35));
        equal(turn.snapshot(), before, 'Un refus ne déplace pas le tapis');
        ok(turn.swap(1, 7));
        equal(turn.events.filter(e => e.type === 'belt').length, 6, 'Une avancée par coup malgré les cascades');
        const firstBelt = turn.events.findIndex(e => e.type === 'belt');
        ok(turn.events.slice(0, firstBelt).some(e => e.type === 'fill'), 'La gravité précède le tapis');
        equal(turn.matches().length, 0);
        ok(turn.validMoves().length > 0);
    },
    G29(module = rules) {
        equal(regressionFingerprint(module, [8], 120), 1490700344);
    },
    G25(module = rules) {
        // Literal cargo position: a spectacular score competes with a delivery.
        // Level 63 supplies color weight 3; all geometry and objectives are explicit.
        const engine = fixture(module);
        const state = engine.snapshot();
        state.level = 62;
        state.width = 8;
        state.height = 8;
        state.colors = 5;
        state.rng = 3317413437;
        state.score = 1940;
        state.dropped = 0;
        state.collected = [8, 12, 30, 12, 4, 0, 0];
        state.broken.ice = 5;
        state.objectives = [{ kind: 'drop', target: 6 }, { kind: 'collect', color: 2, target: 30 }];
        const colors = [
            [2, 0, 1, 0, 1, 3, 3, 0],
            [1, 3, 4, 1, 0, 1, 1, 3],
            [2, 2, 2, 3, 2, 0, 3, 3],
            [2, 1, 2, 0, 0, 1, 0, 1],
            [2, 2, 2, 3, 2, 1, 0, 1],
            [1, 4, 2, 4, 2, 0, 2, 4],
            [2, 4, 2, 4, 1, 2, 1, 2],
            [4, 2, 0, 2, 4, 2, 2, 0],
        ];
        state.cells = colors.flat().map((color, i) => ({
            active: true, crate: 0, ice: [48, 49, 54].includes(i) ? 1 : 0,
            exit: i >= 56, piece: { color },
        }));
        for (const i of [16, 17, 34]) required(state.cells[i]).piece = { color: 2, drop: true };
        for (const [i, special] of [[0, 'row'], [18, 'color'], [37, 'wrapped'], [52, 'row']] as const) {
            required(required(state.cells[i]).piece).special = special;
        }
        engine.restore(state);
        const gain = (move: [number, number]): number => {
            const copy = engine.clone(false);
            copy.swap(...move);
            return engine.state.objectives.reduce((sum, o) => sum
                + Math.min(o.target, copy.progress(o)) - Math.min(o.target, engine.progress(o)), 0);
        };
        equal(gain([13, 21]), 0);
        equal(gain([57, 58]), 1);
        const chosen = module.greedyMove(engine);
        ok(chosen);
        const maximum = Math.max(...engine.validMoves().map(gain));
        equal(gain(chosen), maximum);
    },
    G24(module = rules) {
        equal(regressionFingerprint(module, [8]), 957090083);
    },
    G20() {
        for (const index of [1, 20, 40]) {
            const result = measureLevel(index, [37, 101]);
            checkBalance(result);
            if (index === 1) equal(result.randomLosses, 0);
            else ok(result.randomLosses >= 1, 'Le choix compte en Arcade');
        }
    },
};

function required<T>(value: T | null | undefined): T {
    if (value == null) throw new Error('Valeur attendue');
    return value;
}

export function regressionFingerprint(module: Rules = rules, seeds: readonly number[] = [8, 19, 37, 65, 101], count = 60): number {
    // Reference captured before extension: snapshots AND events, five campaign seeds.
    let hash = 2166136261;
    for (let index = 0; index < count; index++) {
        for (const seed of seeds) {
            const engine = new module.Engine('arcade');
            engine.loadLevel(index, seed);
            for (let step = 0; step < 6; step++) {
                const text = JSON.stringify([engine.snapshot(), engine.events]);
                for (let i = 0; i < text.length; i++) {
                    hash ^= text.charCodeAt(i);
                    hash = Math.imul(hash, 16777619) >>> 0;
                }
                const moves = engine.validMoves();
                engine.swap(...required(moves[step % moves.length]));
            }
        }
    }
    return hash;
}

export function geometryChecks(module: { LEVELS: typeof LEVELS; terrain: typeof terrain } = { LEVELS, terrain }) {
    // Literal silhouettes: necks, crosses, interrupted lanes and frozen bands.
    // # is an open cell; . is absent; 1/2 are the authored ice layers.
    const silhouettes: [number, string][] = [
        [3, '######/..###./..###./..###./..###./######'],
        [4, '..##../..###./######/######/.####./..###.'],
        [7, '..##../.####./######/#.##.#/.####./.####.'],
        [12, '..#.#../.##.##./###.###/#######/###.###/###.###/.##.##.'],
        [63, '.######/..###../..###../..###../..###../..###../#######'],
        [64, '..###../..###../#######/#######/#######/..###../..###..'],
        [67, '#######/#######/#######/#.###.#/#######/#######/#######'],
        [72, '####.###/####.###/####.###/########/####.###/####.###/####.###'],
        [83, '.######/..111../..111../..111../..111../..111../#######'],
        [84, '..###../..111../1111111/1111111/1111111/..111../..###..'],
        [87, '#######/1111111/1111111/1.111.1/1111111/1111111/#######'],
        [92, '####.###/1111.111/1111.111/11111111/1111.111/1111.111/####.###'],
        [103, '.22#22#/..2#2../..2#2../..2#2../..2#2../..2#2../#22#22#'],
        [104, '..2#2../..2#2../#22#22#/#22#22#/#22#22#/..2#2../..2#2..'],
        [107, '#22#22#/#22#22#/#22#22#/#.2#2.#/#22#22#/#22#22#/#22#22#'],
        [112, '#22#.2#2/#22#.2#2/#22#.2#2/#22#22#2/#22#.2#2/#22#.2#2/#22#.2#2'],
        [120, '###22###/###22###/###22###/###22###/###22###/###22###/###22###/###22###'],
        [121, '########/C######C/########/C######C/########/C######C/########'],
        [122, '########/C######C/########/C######C/########/C######C/########'],
        [123, '.#######/...###../...###../...###../...###../...###../C##C##C#'],
        [124, '...###../...###../########/C######C/########/...###../...###..'],
        [125, '########/C######C/########/C######C/########/C######C/########'],
        [126, '########/C######C/########/C######C/########/C######C/########'],
        [127, '########/C######C/########/C.####.C/########/C######C/########'],
        [128, '.#######/C######C/########/C######C/########/C######C/########/C##C##CC'],
        [129, '..####../C######C/########/C######C/########/C######C/########/C##C##CC'],
        [130, '########/C######C/########/C######C/########/C######C/########/C##C##CC'],
        [131, '########/C######C/########/C######C/########/C######C/########/C##C##CC'],
        [132, '####.###/C###.##C/####.###/C###.##C/########/C###.##C/####.###/C##C.#CC'],
        [133, '.#######/C######C/########/C######C/########/C######C/########/C##C##CC'],
        [134, '..####../C######C/########/C######C/########/C######C/########/C##C##CC'],
        [135, '#########/C#######C/#########/C#######C/#########/C#######C/#########/C##C##C#C'],
        [136, '#########/C#######C/#########/C#######C/#########/C#######C/#########/C##C##C#C'],
        [137, '#########/C#######C/#########/C#######C/#########/C#######C/#########/C##C##C#C'],
        [138, '.########/C#######C/#########/C#######C/#########/C#######C/#########/C##C##C#C'],
        [139, '..#####../C#######C/#########/C#######C/#########/C#######C/#########/C##C##C#C'],
        [140, '#########/C#######C/#########/C#######C/#########/C#######C/#########/C##C##C#C'],
        [141, 'FFFFFFFF/FFFFFFFF/FF##F##F/FF##F##F/FFFFFFFF/FF##F##F/FFFFFFFF'],
        [142, 'FFFFFFFF/FFFFFFFF/FF##F##F/FF##F##F/FFFFFFFF/FF##F##F/FFFFFFFF'],
        [143, '.FFFFFFF/...FFF../...#F#../...#F#../...FFF../...#F#../FFFFFFFF'],
        [144, '...FFF../...FFF../FF##F##F/FF##F##F/FFFFFFFF/...#F#../...FFF..'],
        [145, 'FFFFFFFF/FFFFFFFF/FF##F##F/FF##F##F/FFFFFFFF/FF##F##F/FFFFFFFF'],
        [146, 'FFFFFFFF/FFFFFFFF/FF##F##F/FF##F##F/FFFFFFFF/FF##F##F/FFFFFFFF'],
        [147, 'FFFFFFFF/FFFFFFFF/FF##F##F/F.##F#.F/FFFFFFFF/FF##F##F/FFFFFFFF'],
        [148, '.FFFFFFF/FFFFFFFF/FF##F##F/FF##F##F/FFFFFFFF/FF##F##F/FF##F##F/FFFFFFFF'],
        [149, '..FFFF../FFFFFFFF/FF##F##F/FF##F##F/FFFFFFFF/FF##F##F/FF##F##F/FFFFFFFF'],
        [150, 'FFFFFFFF/FFFFFFFF/FF##F##F/FF##F##F/FFFFFFFF/FF##F##F/FF##F##F/FFFFFFFF'],
        [151, 'FFFFFFFF/FFFFFFFF/FF##F##F/FF##F##F/FFFFFFFF/FF##F##F/FF##F##F/FFFFFFFF'],
        [152, 'FFFF.FFF/FFFF.FFF/FF##.##F/FF##.##F/FFFFFFFF/FF##.##F/FF##.##F/FFFF.FFF'],
        [153, '.FFFFFFF/FFFFFFFF/FF##F##F/FF##F##F/FFFFFFFF/FF##F##F/FF##F##F/FFFFFFFF'],
        [154, '..FFFF../FFFFFFFF/FF##F##F/FF##F##F/FFFFFFFF/FF##F##F/FF##F##F/FFFFFFFF'],
        [155, 'FFFFFFFFF/FFFFFFFFF/FF##F##FF/FF##F##FF/FFFFFFFFF/FF##F##FF/FF##F##FF/FFFFFFFFF'],
        [156, 'FFFFFFFFF/FFFFFFFFF/FF##F##FF/FF##F##FF/FFFFFFFFF/FF##F##FF/FF##F##FF/FFFFFFFFF'],
        [157, 'FFFFFFFFF/FFFFFFFFF/FF##F##FF/FF##F##FF/FFFFFFFFF/FF##F##FF/FF##F##FF/FFFFFFFFF'],
        [158, '.FFFFFFFF/FFFFFFFFF/FF##F##FF/FF##F##FF/FFFFFFFFF/FF##F##FF/FF##F##FF/FFFFFFFFF'],
        [159, '..FFFFF../FFFFFFFFF/FF##F##FF/FF##F##FF/FFFFFFFFF/FF##F##FF/FF##F##FF/FFFFFFFFF'],
        [160, 'FFFFFFFFF/FFFFFFFFF/FF##F##FF/FF##F##FF/FFFFFFFFF/FF##F##FF/FF##F##FF/FFFFFFFFF'],
        [161, '########/########/########/>>>>>>>>/<<<<<<<</########/########'],
        [162, '########/########/########/>>>>>>>>/<<<<<<<</########/########'],
        [163, '.##v#^##/...v#^../...v#^../...v#^../...v#^../...v#^../###v#^##'],
        [164, '...###../...###../########/>>>>>>>>/<<<<<<<</...###../...###..'],
        [165, '########/########/########/>>>>>>>>/<<<<<<<</########/########'],
        [166, '########/########/########/>>>>>>>>/<<<<<<<</########/########'],
        [167, '########/########/########/>.>>>>.>/<<<<<<<</########/########'],
        [168, '.#######/########/########/########/>>>>>>>>/<<<<<<<</########/########'],
        [169, '..####../########/########/########/>>>>>>>>/<<<<<<<</########/########'],
        [170, '########/########/########/########/>>>>>>>>/<<<<<<<</########/########'],
        [171, '########/########/########/########/>>>>>>>>/<<<<<<<</########/########'],
        [172, '###v.^##/###v.^##/###v.^##/###v.^##/###v#^##/###v.^##/###v.^##/###v.^##'],
        [173, '.#######/########/########/########/>>>>>>>>/<<<<<<<</########/########'],
        [174, '..####../########/########/########/>>>>>>>>/<<<<<<<</########/########'],
        [175, '#########/#########/#########/#########/>>>>>>>>>/<<<<<<<<</#########/#########'],
        [176, '#########/#########/#########/#########/>>>>>>>>>/<<<<<<<<</#########/#########'],
        [177, '#########/#########/#########/#########/>>>>>>>>>/<<<<<<<<</#########/#########'],
        [178, '.########/#########/#########/#########/>>>>>>>>>/<<<<<<<<</#########/#########'],
        [179, '..#####../#########/#########/#########/>>>>>>>>>/<<<<<<<<</#########/#########'],
        [180, '#########/#########/#########/#########/>>>>>>>>>/<<<<<<<<</#########/#########'],
    ];
    for (const [number, silhouette] of silhouettes) {
        const level = required(module.LEVELS[number - 1]);
        const cells = module.terrain(level);
        const rows = Array.from({ length: level.height }, (_, y) => cells
            .slice(y * level.width, (y + 1) * level.width)
            .map(c => !c.active ? '.' : c.ice ? String(c.ice) : c.chocolate ? 'C' : c.hedge ? 'F'
                : c.belt ? ({ right: '>', left: '<', down: 'v', up: '^' }[c.belt.direction]) : '#').join(''));
        equal(rows.join('/'), silhouette);
    }
}
