import { expect, test } from 'vitest';
import { Engine, type Cell } from '../src/engines/bubble/engine';
import { LEVELS } from '../src/engines/bubble/levels';

test('C01 une et deux couleurs sur 200 résolutions par graine', () => {
    for (const seed of [1, 42, 452, 99999]) for (const colors of [[1], [1, 2]] as const) {
        const e = new Engine(seed);
        for (let i = 0; i < 200; i++) {
            const grid: Cell[] = colors.map((color, col) => ({ row: 0, col, color }));
            e.load(grid, 1, seed + i);
            expect(colors).toContain(e.next); expect(colors).toContain(e.queued);
            e.aim(0); expect(e.shoot()).toBe(true); e.advance(10000);
            const present = e.grid.map(c => c.color);
            expect(present).toContain(e.next); expect(present).toContain(e.queued);
        }
    }
});
for (const fall of [false, true]) test(`${fall ? 'C03' : 'C02'} disparition par ${fall ? 'chute' : 'éclatement'} et remplacement des deux propositions`, () => {
    const e = new Engine();
    const grid: Cell[] = [{ row: 0, col: 4, color: 0 }, { row: 1, col: 4, color: 0 }, { row: 0, col: 0, color: 1 }];
    if (fall) grid.push({ row: 1, col: 5, color: 2 });
    // Select a seed whose queued color is the one about to disappear.
    let seed = 0;
    do { e.load(grid, 0, seed++ * 7919); } while (e.queued !== (fall ? 2 : 0) && seed < 1000);
    expect(e.queued).toBe(fall ? 2 : 0);
    expect(e.shoot()).toBe(true); e.advance(10000);
    expect(e.last.popped).toHaveLength(3); expect(e.last.fallen).toHaveLength(fall ? 1 : 0);
    expect(e.grid).toEqual([{ row: 0, col: 0, color: 1 }]);
    expect(e.next).toBe(1); expect(e.queued).toBe(1);
});
test('C04 déterminisme des propositions et témoin différent', () => {
    function play(seed: number) {
        const e = new Engine(seed); const states = [];
        for (const angle of [0, 0.2, -0.3, 0.7]) {
            e.aim(angle); e.shoot(); e.advance(10000); states.push(e.snapshot());
        }
        return states;
    }
    expect(play(452)).toEqual(play(452)); expect(play(453)).not.toEqual(play(452));
});
test('C05 démarrage de chaque niveau et graine initiale', () => {
    expect(new Engine().snapshot()).toEqual((() => { const e = new Engine(); e.loadLevel(0); return e.snapshot(); })());
    LEVELS.forEach((_, index) => {
        const e = new Engine(); e.loadLevel(index);
        expect(e.grid.map(c => c.color)).toContain(e.next);
        expect(e.grid.map(c => c.color)).toContain(e.queued);
    });
});
test('C06 chargement et setNext stricts sans mutation, repli vide et victoire sans tirage', () => {
    const e = new Engine(); e.load([{ row: 0, col: 0, color: 1 }], 1);
    const before = e.snapshot();
    expect(() => { e.setNext(0); }).toThrow('Invalid color');
    expect(() => { e.load([{ row: 0, col: 0, color: 1 }], 0); }).toThrow('Invalid color');
    expect(e.snapshot()).toEqual(before);
    e.load([], 0); expect(e.queued).toBeLessThan((LEVELS[0]?.colors ?? 0));
    e.load([{ row: 0, col: 4, color: 0 }, { row: 1, col: 4, color: 0 }]);
    const state = e.random.state; e.shoot(); e.advance(10000);
    expect(e.status).toBe('won'); expect(e.random.state).toBe(state);
});
