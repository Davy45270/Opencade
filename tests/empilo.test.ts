import { test, expect } from 'vitest';
import { Engine, SHAPES, emptyBoard, rotate, difficulty, type State } from '../src/engines/empilo/engine';
function row(s: State, y: number): number[] { const value = s.board[y]; if (!value) throw new Error("Rangée absente"); return value; }
function position(e = new Engine()): State { return { ...e.state, board: emptyBoard(), active: { id: 0, cells: [{ x: 0, y: 0 }], x: 4, y: 15 }, score: 0, lines: 0, lockMs: 0, resets: 0 }; }
test('E01 collisions murs et blocs, déplacements refusés sans mutation', () => {
    const e = new Engine(); const s = position(e); s.active.x = 0; row(s, 15)[1] = 1; e.loadState(s);
    expect(e.input('left')).toBe(false); expect(e.input('right')).toBe(false); expect(e.state.active.x).toBe(0);
    e.state.active.y = 14; expect(e.input('right')).toBe(true); expect(e.input('soft')).toBe(false);
});
test('E02 rotation géométrique inverse et décalages 0, -1, +1, -2, +2 puis échec propre', () => {
    const bar = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }];
    expect(rotate(rotate(bar, 1), -1)).toEqual(bar);
    for (const [x, expected] of [[8, 6], [7, 6], [4, 4]]) {
        const e = new Engine(); const s = position(e); s.active = { id: 0, cells: bar, x: x ?? 0, y: 10 }; e.loadState(s);
        expect(e.input('clockwise')).toBe(true); expect(e.state.active.x).toBe(expected);
    }
    for (const offset of [1, 2]) {
        const e = new Engine(); const s = position(e); s.active = { id: 0, cells: [...(SHAPES[0] ?? [])], x: 3, y: 10 };
        for (let x = 1; x < 3 + offset; x++) row(s, 11)[x] = 1;
        e.loadState(s); expect(e.fits(e.state.active)).toBe(true);
        expect(e.input('counterclockwise')).toBe(true); expect(e.state.active.x).toBe(3 + offset);
    }
    const e = new Engine(); const s = position(e); s.active = { id: 0, cells: [...(SHAPES[0] ?? [])], x: 4, y: 10 }; s.board[11] = Array<number>(9).fill(1); e.loadState(s);
    expect(e.fits(e.state.active)).toBe(true);
    const before = e.snapshot(); expect(e.input('clockwise')).toBe(false); expect(e.snapshot()).toEqual(before);
});
test('E03 gravité fixe, verrouillage à 500 ms et plafond de 15 remises', () => {
    const e = new Engine(); const s = position(e); s.active.y = 0; e.loadState(s); e.step(1000); expect(e.state.active.y).toBe(1);
    e.loadState(position(e)); e.step(1000 / 60 * 29); expect(e.state.board.flat().some(Boolean)).toBe(false); e.step(1000 / 60); expect(e.state.board[15]?.[4]).toBe(1);
    e.loadState(position(e));
    for (let i = 0; i < 15; i++) { e.step(400); expect(e.input(i % 2 ? 'right' : 'left')).toBe(true); expect(e.state.lockMs).toBe(0); }
    expect(e.state.resets).toBe(15); e.step(400); e.input('right'); expect(e.state.lockMs).toBeCloseTo(400); e.step(100); expect(e.state.board.flat().filter(Boolean)).toHaveLength(1);
});
for (let count = 1; count <= 5; count++) test(`E04 effacement de ${String(count)} lignes et score`, () => {
    const e = new Engine(1); const s = position(e);
    for (let y = 16 - count; y < 16; y++) { s.board[y] = Array<number>(9).fill(1); row(s, y)[4] = 0; }
    s.active = { id: 0, x: 4, y: 16 - count, cells: Array.from({ length: count }, (_, y) => ({ x: 0, y })) }; e.loadState(s); e.input('drop');
    expect(e.state.lines).toBe(count); expect(e.state.score).toBe(([100, 300, 600, 1000, 1500][count - 1] ?? 0) * 2); expect(e.state.board.flat().some(Boolean)).toBe(false);
});
test('E05 points de descente et chute, aucun point contre le sol', () => {
    const e = new Engine(); const s = position(e); s.active.y = 10; e.loadState(s);
    expect(e.input('soft')).toBe(true); expect(e.state.score).toBe(1); e.input('drop'); expect(e.state.score).toBe(9);
    e.loadState(position(e)); expect(e.input('soft')).toBe(false); expect(e.state.score).toBe(0);
});
test('E06 sacs complets et fréquence déterministe sur plusieurs graines', () => {
    for (const level of [0, 5, 10, 15, 29]) {
        const size = difficulty(level).shapes; const counts = Array<number>(size).fill(0); const first = new Set<number>();
        for (let seed = 0; seed < 40; seed++) {
            const e = new Engine(level, seed); first.add(e.state.active.id); const sequence: number[] = [];
            for (let i = 0; i < size * 3; i++) {
                sequence.push(e.state.active.id); counts[e.state.active.id] = (counts[e.state.active.id] ?? 0) + 1;
                const s = position(e); s.active = { ...e.state.active, y: 0 }; e.loadState(s); e.input('drop');
            }
            for (let i = 0; i < 3; i++) expect(new Set(sequence.slice(i * size, (i + 1) * size)).size).toBe(size);
        }
        expect(first.size).toBe(size); expect(counts).toEqual(Array<number>(size).fill(120));
    }
});
test('E07 apparition bloquée, plateau saturé et positions interdites', () => {
    for (let seed = 0; seed < 80; seed++) {
        const e = new Engine(29, seed); const s = position(e);
        s.board[0] = Array<number>(9).fill(1); row(s, 0)[0] = 0;
        e.loadState(s); e.input('drop'); expect(e.status).toBe('lost'); expect(e.fits(e.state.active)).toBe(false);
        expect(e.input('drop')).toBe(false);
        const fresh = new Engine(29, seed); expect(fresh.fits(fresh.state.active)).toBe(true);
        for (const id of fresh.state.next) expect(id).toBeLessThan(difficulty(29).shapes);
    }
});
test('E08 victoire seulement à l’objectif', () => {
    const e = new Engine(); const s = position(e); s.lines = 4; s.board[15] = Array<number>(9).fill(1); row(s, 15)[4] = 0; e.loadState(s);
    expect(e.status).toBe('playing'); e.input('drop'); expect(e.status).toBe('won'); expect(e.state.lines).toBe(5); expect(e.input('left')).toBe(false);
});
test('E09 gravats à graine, trou garanti dans chaque rangée', () => {
    const holes = new Set<number>();
    for (let level = 0; level < 30; level++) for (let seed = 0; seed < 20; seed++) {
        const e = new Engine(level, seed); const rows = e.state.board.filter(row => row.some(Boolean)); expect(rows).toHaveLength(difficulty(level).rubble);
        for (const row of rows) { expect(row.filter(v => v === 0)).toHaveLength(1); holes.add(row.indexOf(0)); }
    }
    expect(holes.size).toBe(9);
});
test('E10 sceaux : première complétion fragilise, seconde efface', () => {
    const e = new Engine(); const s = position(e); s.board[15] = Array<number>(9).fill(2); row(s, 15)[4] = 0; e.loadState(s); e.input('drop');
    expect(e.state.lines).toBe(0); expect(e.state.score).toBe(0); expect(e.state.board[15]).toEqual([1, 1, 1, 1, 0, 1, 1, 1, 1]);
    e.state.active = position(e).active; e.input('drop'); expect(e.state.lines).toBe(1); expect(e.state.score).toBe(100);
});
test('E11 chaque paramètre croît dans le sens de la difficulté', () => {
    const keys = ['gravity', 'goal', 'rubble', 'sealed', 'shapes'] as const;
    for (const key of keys) { for (let i = 1; i < 30; i++) expect(difficulty(i)[key]).toBeGreaterThanOrEqual(difficulty(i - 1)[key]); expect(difficulty(29)[key]).toBeGreaterThan(difficulty(0)[key]); }
    expect(difficulty(0)).toEqual({ gravity: 1, goal: 5, rubble: 0, sealed: 0, shapes: 4 });
    expect(difficulty(29)).toEqual({ gravity: 18, goal: 40, rubble: 8, sealed: 4, shapes: 8 });
    expect(() => difficulty(30)).toThrow();
});
test('E12 déterminisme des entrées horodatées et pas indépendants de l’affichage', () => {
    const a = new Engine(12, 98), b = new Engine(12, 98);
    for (const action of ['left', 'clockwise', 'soft', 'drop', 'right', 'counterclockwise', 'drop'] as const) { a.step(100); for (let i = 0; i < 6; i++) b.step(1000 / 60); a.input(action); b.input(action); expect(a.snapshot()).toEqual(b.snapshot()); }
    expect(new Engine(12, 99).snapshot()).not.toEqual(new Engine(12, 98).snapshot());
    expect(SHAPES).toHaveLength(8); expect(SHAPES.map(s => s.length)).toEqual([3, 3, 4, 4, 5, 5, 5, 5]);
    expect(SHAPES.filter(s => s.length === 4)).toHaveLength(2);
    for (const shape of SHAPES) { expect(new Set(shape.map(c => `${String(c.x)},${String(c.y)}`)).size).toBe(shape.length); expect(shape.length).toBeGreaterThanOrEqual(3); expect(shape.length).toBeLessThanOrEqual(5); }
    expect(() => { a.step(-1); }).toThrow();
});
