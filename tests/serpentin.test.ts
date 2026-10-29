import { describe, it, expect } from 'vitest';
import { Engine, difficulty, reachable, same, type Cell, type State } from '../src/engines/serpentin/engine';
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
        // FNV-1a calculé avant optimisation, obstacles ordonnés, pomme et PRNG inclus.
        const data = JSON.stringify(Array.from({ length: 30 }, (_, level) => new Engine(level, 454).snapshot()));
        let hash = 2166136261;
        for (let i = 0; i < data.length; i++) hash = Math.imul(hash ^ data.charCodeAt(i), 16777619);
        expect((hash >>> 0).toString(16)).toBe('7b2da581');
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
    it('N10 difficulté monotone et strictement croissante aux extrêmes', () => {
        for (let i = 1; i < 30; i++) for (const key of ['speed', 'goal', 'obstacles', 'pattern'] as const) expect(difficulty(i)[key]).toBeGreaterThanOrEqual(difficulty(i - 1)[key]);
        expect(difficulty(0)).toMatchObject({ speed: 6, goal: 8, obstacles: 0 }); expect(difficulty(29)).toMatchObject({ speed: 16, goal: 30, obstacles: 40 });
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
});
