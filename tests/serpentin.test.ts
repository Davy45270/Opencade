import { describe, it, expect } from 'vitest';
import * as serpentin from '../src/engines/serpentin/engine';
import { Engine, difficulty, reachable, same, layout, mechanismCells, patrolAt, follow, LAYOUTS, type Cell, type State } from '../src/engines/serpentin/engine';
import { serpentinDiversity } from '../scripts/serpentin-diversity.js';
import { levelTip } from '../src/engines/serpentin/tips';
function state(patch: Partial<State> = {}): State {
    return { segments: [{ x: 7, y: 10 }, { x: 6, y: 10 }, { x: 5, y: 10 }], direction: 'right', apple: { x: 2, y: 2 }, obstacles: [], eaten: 0, score: 0, crystal: null, crystalUntil: 0, ...patch };
}
function engine(patch: Partial<State> = {}, level = 0): Engine { const e = new Engine(level); e.loadState(state(patch)); return e; }
const move = (e: Engine): void => { e.step(Math.ceil(60 / difficulty(e.level).speed) * 1000 / 60); };
describe('Serpentin', () => {
    it('N01 avance une case et conserve trois segments', () => {
        const e = engine(); move(e); expect(e.state.segments).toEqual([{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }]);
    });
    it('N02 ignore le demi-tour direct et dans la file', () => {
        const e = engine(); e.input('left'); move(e); expect(e.state.direction).toBe('right');
        e.input('up'); e.input('down'); expect(e.snapshot().queue).toEqual(['up']);
    });
    it('N03 conserve deux virages puis les applique sur deux pas', () => {
        const e = engine(); e.input('up'); e.input('left'); e.input('down');
        expect(e.snapshot().queue).toEqual(['up', 'left']); move(e); expect(e.state.segments[0]).toEqual({ x: 7, y: 9 });
        move(e); expect(e.state.segments[0]).toEqual({ x: 6, y: 9 });
    });
    it('N04 pomme grandit et score multiplié par niveau', () => {
        const e = engine({ apple: { x: 8, y: 10 } }, 2); move(e); expect(e.state.segments).toHaveLength(4); expect(e.state.score).toBe(30); expect(e.state.eaten).toBe(1);
    });
    it('N05 mur et obstacle causent la défaite', () => {
        const e = engine({ segments: [{ x: 14, y: 10 }, { x: 13, y: 10 }, { x: 12, y: 10 }] }); move(e); expect(e.status).toBe('lost');
        const obstacle = engine({ obstacles: [{ x: 8, y: 10 }] }); move(obstacle); expect(obstacle.status).toBe('lost');
    });
    it('N06 corps fatal mais queue libérée autorisée et queue croissante fatale', () => {
        const segments = [{ x: 7, y: 10 }, { x: 7, y: 9 }, { x: 8, y: 9 }, { x: 8, y: 10 }];
        const e = engine({ segments }); move(e); expect(e.status).toBe('playing'); expect(e.state.segments[0]).toEqual({ x: 8, y: 10 });
        const growing = engine({ segments, apple: { x: 8, y: 10 } }); move(growing); expect(growing.status).toBe('lost');
        const body = engine({ segments: [...segments, { x: 9, y: 10 }] }); move(body); expect(body.status).toBe('lost');
    });
    it('N07 tore traverse les quatre bords', () => {
        for (const [head, direction, target] of [
            [{ x: 14, y: 10 }, 'right', { x: 0, y: 10 }], [{ x: 0, y: 10 }, 'left', { x: 14, y: 10 }],
            [{ x: 7, y: 0 }, 'up', { x: 7, y: 20 }], [{ x: 7, y: 20 }, 'down', { x: 7, y: 0 }],
        ] as const) { const e = engine({ segments: [head], direction }, 4); move(e); expect(e.state.segments[0]).toEqual(target); expect(e.status).toBe('playing'); }
    });
    it('N08 empreinte des 30 grilles et snapshots initiaux, graine 454', () => {
        // FNV-1a des 30 salles de la passe 401, obstacles ordonnés, pomme et PRNG inclus.
        const data = JSON.stringify(Array.from({ length: 30 }, (_, level) => new Engine(level, 454).snapshot()), (key, value: unknown) => ['specialUses', 'specialArmed', 'specialMs'].includes(key) ? undefined : value);
        let hash = 2166136261;
        for (let i = 0; i < data.length; i++) hash = Math.imul(hash ^ data.charCodeAt(i), 16777619);
        expect((hash >>> 0).toString(16)).toBe('262e7702');
    });
    it('N08 générations et pommes libres accessibles sur 30 niveaux et 12 graines', () => {
        for (let level = 0; level < 30; level++) for (let seed = 1; seed <= 12; seed++) {
            const e = new Engine(level, seed), d = difficulty(level), head = e.state.segments[0];
            expect(head).toBeDefined(); if (!head) throw new Error('Départ absent');
            expect(e.state.obstacles).toHaveLength(d.obstacles);
            expect(reachable(head, e.state.obstacles, d.walls)).toHaveLength(315 - d.obstacles);
            expect(e.state.segments.some(c => same(c, e.state.apple))).toBe(false);
            expect(reachable(head, [...e.state.obstacles, ...e.state.segments.slice(1)], d.walls)).toContainEqual(e.state.apple);
            e.loadState(state({ apple: { x: 8, y: 10 } })); move(e);
            expect(e.state.segments.some(c => same(c, e.state.apple))).toBe(false);
            expect(reachable(e.state.segments[0] ?? head, e.state.segments.slice(1), d.walls)).toContainEqual(e.state.apple);
        }
    });
    it('N08 pommes sur grille presque pleine et défaite sans case libre', () => {
        const cells = Array.from({ length: 315 }, (_, i) => ({ x: i % 15, y: Math.floor(i / 15) }));
        for (let seed = 1; seed <= 200; seed++) for (const freeCount of [0, 1, 2, 4]) {
            const head = { x: 7, y: 10 }, apple = { x: 8, y: 10 };
            const obstacles = [{ x: 0, y: 0 }, { x: 14, y: 20 }];
            const free = [{ x: 9, y: 10 }, { x: 8, y: 9 }, { x: 8, y: 11 }, { x: 10, y: 10 }].slice(0, freeCount);
            const segments = [head, ...cells.filter(c => ![head, apple, ...obstacles, ...free].some(v => same(c, v)))];
            const e = new Engine(0, seed);
            e.loadState(state({ segments, apple, obstacles })); move(e);
            expect(e.state.eaten).toBe(1);
            expect(e.status).toBe(freeCount ? 'playing' : 'lost');
            if (freeCount) {
                expect(e.state.segments.some(c => same(c, e.state.apple))).toBe(false);
                expect(obstacles.some(c => same(c, e.state.apple))).toBe(false);
                expect(free.some(c => same(c, e.state.apple))).toBe(true);
            }
        }
    });
    it('N08 cristaux sur grille presque pleine et absence sans case libre', () => {
        // Cycle de 300 cases : le corps peut suivre sa queue pendant dix secondes.
        const cycle = [{ x: 0, y: 0 }];
        for (let y = 0; y < 20; y++) for (let i = 0; i < 14; i++) cycle.push({ x: y % 2 ? 14 - i : i + 1, y });
        for (let y = 19; y > 0; y--) cycle.push({ x: 0, y });
        for (let seed = 1; seed <= 200; seed++) for (const full of [false, true]) {
            const e = new Engine(0, seed);
            const start = 281 - 59;
            const cellAt = (cells: Cell[], index: number): Cell => {
                const cell = cells[index];
                if (!cell) throw new Error('Case du cycle absente');
                return cell;
            };
            const ordered = [...cycle.slice(start), ...cycle.slice(0, start)];
            const obstacles = Array.from({ length: 13 }, (_, x) => ({ x: x + 2, y: 20 }));
            e.loadState(state({ segments: [cellAt(ordered, 0), ...ordered.slice(1).reverse()], direction: 'up', apple: { x: 0, y: 20 }, obstacles: full ? [...obstacles, { x: 1, y: 20 }] : obstacles }));
            let index = start;
            for (let tick = 0; tick < 600; tick++) {
                if (tick % 10 === 0) {
                    const head = cellAt(cycle, index), next = cellAt(cycle, (index + 1) % cycle.length);
                    e.input(next.x > head.x ? 'right' : next.x < head.x ? 'left' : next.y > head.y ? 'down' : 'up');
                    index = (index + 1) % cycle.length;
                }
                e.step(1000 / 60);
            }
            expect(e.status).toBe('playing');
            expect(e.snapshot().ticks).toBe(600);
            expect(e.state.crystal).toEqual(full ? null : { x: 1, y: 20 });
            if (e.state.crystal) {
                expect(e.state.segments).not.toContainEqual(e.state.crystal);
                expect(e.state.obstacles).not.toContainEqual(e.state.crystal);
                expect(e.state.crystal).not.toEqual(e.state.apple);
            }
        }
    });
    it('N09 victoire exactement à objectif', () => {
        const e = engine({ eaten: 6, apple: { x: 8, y: 10 } }); move(e); expect(e.status).toBe('playing');
        e.loadState(state({ eaten: 7, apple: { x: 8, y: 10 } })); move(e); expect(e.status).toBe('won');
        const snapshot = e.snapshot(); e.step(0); expect(e.snapshot()).toEqual(snapshot);
    });
    it('N10 campagne : une règle neuve tous les 4 à 5 niveaux, défi chronométré tous les 5, respiration après chaque nouveauté', () => {
        const first = (has: (i: number) => boolean) => Array.from({ length: 30 }, (_, i) => i).find(has);
        expect(first(i => layout(i).portals.length > 0)).toBe(3);
        expect(first(i => layout(i).gates.length > 0)).toBe(7);
        expect(first(i => layout(i).prey > 0)).toBe(11);
        expect(first(i => layout(i).currents.length > 0)).toBe(15);
        expect(first(i => layout(i).scissors)).toBe(20);
        expect(first(i => layout(i).patrols.length > 0)).toBe(25);
        expect(Array.from({ length: 30 }, (_, i) => i).filter(i => layout(i).timeMs > 0)).toEqual([4, 9, 14, 19, 24]);
        // Une salle d'introduction n'accélère jamais par rapport à la précédente.
        for (const intro of [3, 7, 11, 15, 25]) expect(layout(intro).speed).toBeLessThanOrEqual(layout(intro - 1).speed);
        // Respiration : la salle qui suit chaque défi est plus lente que lui.
        for (const challenge of [4, 9, 14, 19, 24]) expect(layout(challenge + 1).speed).toBeLessThan(layout(challenge).speed);
        const final = layout(29);
        expect(final.portals.length > 0 && final.gates.length > 0 && final.currents.length > 0 && final.patrols.length > 0 && final.prey > 0 && final.scissors).toBe(true);
        expect(difficulty(0)).toMatchObject({ speed: 6, goal: 8, obstacles: 0, walls: true });
        expect(Math.max(...LAYOUTS.map(l => l.speed))).toBeLessThanOrEqual(13);
        expect(new Set(LAYOUTS.map(l => l.name)).size).toBe(30);
        for (let i = 0; i < 30; i++) expect(levelTip(i).length).toBeLessThanOrEqual(32);
        expect(levelTip(3)).toMatch(/Portails/); expect(levelTip(25)).toMatch(/Sentinelles/); expect(levelTip(4)).toMatch(/chrono/);
    });
    it('N10 diversité mesurée : score <= 25, aucun clone, et des salles identiques seraient détectées', () => {
        const r = serpentinDiversity(serpentin);
        expect(r.score).toBeLessThanOrEqual(25); expect(r.cloneShare).toBe(0); expect(r.maxGapWithoutNovelty).toBeLessThanOrEqual(5);
        expect(r.noveltyLevels).toEqual([2, 3, 4, 5, 8, 12, 16, 21, 26]);
        const clones = serpentinDiversity(serpentin, Array<number>(30).fill(6));
        expect(clones.cloneShare).toBe(1); expect(clones.score).toBeGreaterThan(90);
    });
    it('N11 déterminisme entrées horodatées et cadence de rendu indépendante', () => {
        const a = new Engine(4, 123), b = new Engine(4, 123);
        for (const direction of ['up', 'left', 'down', 'right'] as const) { a.input(direction); b.input(direction); a.step(500); for (let i = 0; i < 30; i++) b.step(1000 / 60); }
        expect(a.snapshot()).toEqual(b.snapshot()); expect(new Engine(4, 124).state).not.toEqual(new Engine(4, 123).state);
        expect(JSON.parse(JSON.stringify(a.snapshot()))).toEqual(a.snapshot());
        const c = engine(), d = engine(); c.step(2000);
        for (let i = 0; i < 120; i++) d.step(1000 / 60);
        expect(c.status).toBe('lost'); expect(c.snapshot()).toEqual(d.snapshot());
    });
    it('N12 cristal apparaît après 10s, expire après 5s et donne un score sans croissance', () => {
        const e = engine({ segments: [{ x: 0, y: 0 }] }, 4);
        e.step(10000); expect(e.state.crystal).not.toBeNull(); expect(e.state.crystalUntil).toBe(900);
        e.step(5000); expect(e.state.crystal).toBeNull();
        const bonus = engine({ crystal: { x: 8, y: 10 }, crystalUntil: 300 }, 2); move(bonus);
        expect(bonus.state.score).toBe(150); expect(bonus.state.segments).toHaveLength(3); expect(bonus.state.eaten).toBe(0); expect(bonus.state.crystal).toBeNull();
    });
    it('N13 portail : la tête ressort à l\'autre bout dans le même sens ; sortie occupée = règles ordinaires', () => {
        const e = engine({ segments: [{ x: 1, y: 3 }, { x: 0, y: 3 }] }, 3); move(e);
        expect(e.state.segments[0]).toEqual({ x: 12, y: 17 }); expect(e.state.direction).toBe('right'); expect(e.events).toContain('portal');
        move(e); expect(e.state.segments[0]).toEqual({ x: 13, y: 17 });
        const back = engine({ segments: [{ x: 13, y: 17 }, { x: 14, y: 17 }], direction: 'left' }, 3); move(back); expect(back.state.segments[0]).toEqual({ x: 2, y: 3 });
        const blocked = engine({ segments: [{ x: 1, y: 3 }, { x: 0, y: 3 }], obstacles: [{ x: 12, y: 17 }] }, 3); move(blocked);
        expect(blocked.status).toBe('lost'); expect(blocked.reason).toBe('obstacle');
        expect(follow(0, { x: 1, y: 3 }, 'right')).toEqual({ x: 2, y: 3 });
    });
    it('N14 écluse : fermée = défaite, ouverte = passage, elle peut se fermer sous le corps', () => {
        // Salle 9, écluse (7,17) : période 240, ouverture 150, phase 120 → ouverte pour t < 30, fermée pour 30 ≤ t < 120.
        const open = engine({ segments: [{ x: 6, y: 17 }, { x: 5, y: 17 }, { x: 4, y: 17 }] }, 8); move(open);
        expect(open.status).toBe('playing'); expect(open.state.segments[0]).toEqual({ x: 7, y: 17 });
        const closed = engine({ segments: [{ x: 2, y: 17 }, { x: 1, y: 17 }, { x: 0, y: 17 }] }, 8); for (let i = 0; i < 5; i++) move(closed);
        expect(closed.status).toBe('lost'); expect(closed.reason).toBe('gate'); expect(closed.state.segments[0]).toEqual({ x: 6, y: 17 });
        const under = engine({ segments: Array.from({ length: 8 }, (_, i) => ({ x: 9 - i, y: 17 })) }, 8); under.step(37 * 1000 / 60);
        expect(under.gateClosedAt({ x: 7, y: 17 })).toBe(true); expect(under.state.segments).toContainEqual({ x: 7, y: 17 }); expect(under.status).toBe('playing');
    });
    it('N15 courant : le pas suivant est imposé, le virage en file sert après les flèches, un demi-tour en file est abandonné', () => {
        const e = engine({ segments: [{ x: 1, y: 5 }, { x: 1, y: 6 }], direction: 'up', apple: { x: 9, y: 9 } }, 15);
        move(e); expect(e.state.segments[0]).toEqual({ x: 1, y: 4 }); expect(e.events).toContain('current');
        e.input('down'); expect(e.snapshot().queue).toEqual([]);
        e.input('left'); move(e); expect(e.state.segments[0]).toEqual({ x: 2, y: 4 }); expect(e.state.direction).toBe('right');
        // 'left' est devenu un demi-tour après la flèche : abandonné, le serpent continue.
        move(e); expect(e.state.direction).toBe('right'); expect(e.status).toBe('playing');
        // Tête sur la colonne montante x = 1 : le virage à droite attend la fin des six flèches.
        const kept = engine({ segments: [{ x: 1, y: 15 }, { x: 1, y: 16 }], direction: 'up', apple: { x: 9, y: 2 } }, 15); move(kept); kept.input('right');
        const trail: string[] = []; for (let i = 0; i < 7; i++) { move(kept); trail.push(`${String(kept.state.segments[0]?.x)},${String(kept.state.segments[0]?.y)}`); }
        expect(trail).toEqual(['1,13', '1,12', '1,11', '1,10', '1,9', '1,8', '2,8']);
        for (let i = 0; i < 30; i++) for (const k of layout(i).currents) {
            const exit = follow(i, k.cell, k.direction); expect(exit).not.toBeNull();
            if (exit) expect(new Engine(i).state.obstacles.some(o => same(o, exit))).toBe(false);
        }
    });
    it('N16 luciole : fuit d\'une case strictement plus loin tous les N pas, reste si coincée', () => {
        const e = engine({ apple: { x: 12, y: 10 } }, 11);
        move(e); move(e); expect(e.state.apple).toEqual({ x: 12, y: 10 });
        move(e); const head = e.state.segments[0] ?? { x: 0, y: 0 };
        expect(Math.abs(e.state.apple.x - 12) + Math.abs(e.state.apple.y - 10)).toBe(1); expect(e.events).toContain('flee');
        expect(Math.abs(e.state.apple.x - head.x) + Math.abs(e.state.apple.y - head.y)).toBe(3);
        const corner = engine({ segments: [{ x: 0, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 0 }], direction: 'down', apple: { x: 14, y: 20 } }, 11);
        for (let i = 0; i < 3; i++) move(corner);
        expect(corner.state.apple).toEqual({ x: 14, y: 20 });
        const still = engine({ apple: { x: 12, y: 10 } }, 0); for (let i = 0; i < 2; i++) move(still); expect(still.state.apple).toEqual({ x: 12, y: 10 });
    });
    it('N17 ciseaux : apparaissent dès 10 segments, coupent le corps en deux (au moins 3), sans toucher au compte de pommes', () => {
        const body = Array.from({ length: 10 }, (_, i) => ({ x: 12 - i, y: 15 }));
        const e = engine({ segments: body, apple: { x: 2, y: 2 }, eaten: 4 }, 20); move(e);
        expect(e.state.scissors).not.toBeNull();
        const cut = engine({ segments: body, apple: { x: 2, y: 2 }, scissors: { x: 13, y: 15 }, eaten: 4 }, 20); move(cut);
        expect(cut.state.segments).toHaveLength(5); expect(cut.state.eaten).toBe(4); expect(cut.state.score).toBe(105); expect(cut.events).toContain('scissors');
        const short = engine({ segments: body.slice(0, 4), apple: { x: 2, y: 2 }, scissors: { x: 13, y: 15 } }, 20); move(short); expect(short.state.segments).toHaveLength(3);
        const none = engine({ segments: body, apple: { x: 2, y: 2 } }, 0); move(none); expect(none.state.scissors).toBeNull();
    });
    it('N18 chrono : défaite exactement à zéro, rien sur une salle sans chrono', () => {
        const e = new Engine(4); expect(e.state.timeLeft).toBe(35000);
        e.loadState({ ...state({ segments: [{ x: 0, y: 0 }] }), timeLeft: 100 }); e.input('down');
        e.step(5 * 1000 / 60); expect(e.status).toBe('playing'); e.step(1000 / 60); expect(e.status).toBe('lost'); expect(e.reason).toBe('time');
        const free = engine({ segments: [{ x: 0, y: 0 }], direction: 'down' }, 3); free.step(200); expect(free.state.timeLeft).toBe(0); expect(free.status).toBe('playing');
    });
    it('N19 sentinelle : va-et-vient, toucher la sentinelle ou être touché est fatal', () => {
        const p = layout(25).patrols[0]; if (!p) throw new Error('sentinelle');
        expect([0, 2, 4, 12, 14].map(m => patrolAt(p, m))).toEqual([{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 8, y: 4 }, { x: 7, y: 4 }]);
        const head = engine({ segments: [{ x: 2, y: 5 }, { x: 2, y: 6 }], direction: 'up', apple: { x: 9, y: 9 } }, 25); move(head);
        expect(head.status).toBe('lost'); expect(head.reason).toBe('patrol');
        const hit = engine({ segments: [{ x: 4, y: 5 }, { x: 4, y: 4 }, { x: 4, y: 3 }], direction: 'down', apple: { x: 9, y: 9 }, moves: 3 }, 25); move(hit);
        expect(hit.status).toBe('lost'); expect(hit.reason).toBe('patrol');
        const safe = engine({ segments: [{ x: 4, y: 5 }, { x: 4, y: 4 }, { x: 4, y: 3 }], direction: 'down', apple: { x: 9, y: 9 }, moves: 7 }, 25); move(safe);
        expect(safe.status).toBe('playing');
    });
    it('N20 cases de mécanisme jamais occupées par pomme, obstacle ou bonus ; salles connexes sur 12 graines', () => {
        for (let level = 0; level < 30; level++) for (const seed of [1, 7, 454]) {
            const e = new Engine(level, seed), cells = mechanismCells(level);
            expect(cells.some(c => same(c, e.state.apple))).toBe(false);
            expect(e.state.obstacles.some(o => cells.some(c => same(c, o)))).toBe(false);
            for (const k of layout(level).portals) for (const c of [k.a, k.b]) expect(c.x >= 0 && c.x < 15 && c.y >= 0 && c.y < 21).toBe(true);
        }
    });
});
