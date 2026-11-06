import { expect, test } from 'vitest';
import { Engine } from '../src/engines/bubble/engine';

// A rainbow shot used to take the colour of the bubble it touched, even when its own colour
// already completed a group: the marble changed colour on landing and the aimed group stayed.
test('B-RAINBOW-02 a rainbow shot keeps its colour when that colour already pops a group', () => {
    const e = new Engine(); e.loadLevel(16);
    // Shot straight up: it touches the colour 1 bubble at 0:4 and settles in 1:3, beside 0:3 and 1:2.
    e.load([{ row: 0, col: 4, color: 1 }, { row: 0, col: 3, color: 0 }, { row: 1, col: 2, color: 0 }, { row: 0, col: 8, color: 2 }], 0);
    expect(e.rainbow).toBe(true);
    e.aim(0);
    const aimed = e.trace();
    expect(aimed.struck).toMatchObject({ row: 0, col: 4, color: 1 });
    expect(aimed.target).toMatchObject({ row: 1, col: 3, color: 0 });
    expect(e.shoot()).toBe(true);
    const shown = e.flight?.color;
    const result = e.advance(10000);
    expect(shown).toBe(0);
    expect(result?.attached).toMatchObject({ row: 1, col: 3, color: 0 });
    expect(result?.popped.map(c => `${String(c.row)}:${String(c.col)}`).sort()).toEqual(['0:3', '1:2', '1:3']);
    expect(e.grid).toEqual([{ row: 0, col: 4, color: 1 }, { row: 0, col: 8, color: 2 }]);
});

test('B-RAINBOW-03 a rainbow shot still takes the touched colour when its own would not pop', () => {
    const e = new Engine(); e.loadLevel(16);
    e.load([{ row: 0, col: 4, color: 1 }, { row: 0, col: 5, color: 1 }, { row: 0, col: 3, color: 0 }, { row: 0, col: 8, color: 2 }], 0);
    expect(e.rainbow).toBe(true);
    e.aim(0);
    expect(e.shoot()).toBe(true);
    const result = e.advance(10000);
    expect(result?.attached?.color).toBe(1);
    expect(result?.popped.length).toBe(3);
});
