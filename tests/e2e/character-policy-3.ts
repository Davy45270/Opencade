import { SHAPES, BOMB, rotate, settle, slide, type Cell, type Conveyor, type State } from '../../src/engines/empilo/engine';
export interface Placement { rotations: number; x: number; value: number }
function candidates(board: number[][], id: number, conveyors: readonly Conveyor[] = []) {
    const results: { placement: Placement; board: number[][]; cleared: number }[] = [];
    let cells: readonly Cell[] = SHAPES[id] ?? [];
    for (let rotations = 0; rotations < (id === BOMB ? 1 : 4); rotations++, cells = rotate(cells, 1)) {
        const width = Math.max(...cells.map(c => c.x)) + 1;
        for (let x = 0; x <= 9 - width; x++) {
            const fits = (y: number) => cells.every(c => y + c.y < 16 && board[y + c.y]?.[x + c.x] === 0);
            if (!fits(0)) continue;
            let y = 0; while (fits(y + 1)) y++;
            // Same landing resolution as the engine (bomb, seals, padlocks, gems, key).
            const settled = settle(board, cells, x, y, id === BOMB), retained = slide(settled.board, conveyors), cleared = settled.cleared + settled.gems * 2 + (settled.key ? 3 : 0);
            results.push({ placement: { rotations, x, value: 0 }, board: retained, cleared });
        }
    }
    return results;
}
function cost(board: number[][]): number {
    let holes = 0;
    const heights = Array.from({ length: 9 }, (_, x) => {
        const top = board.findIndex(row => row[x] !== 0);
        if (top < 0) return 0;
        for (let y = top; y < 16; y++) if (board[y]?.[x] === 0) holes++;
        return 16 - top;
    });
    return holes * 12 + heights.reduce((a, b) => a + b, 0) * .8 + Math.max(...heights) * 2
        + heights.slice(1).reduce((a, h, i) => a + Math.abs(h - (heights[i] ?? 0)), 0) * .5;
}
/** Beam search over three known pieces; ordinary controls, no reserve required. */
export function empiloPlacement(s: State, conveyors: readonly Conveyor[] = []): Placement | undefined {
    let beam = candidates(s.board, s.active.id, conveyors).map(c => ({ ...c, first: c.placement, value: cost(c.board) - c.cleared * 8 }));
    for (const id of s.next.slice(0, 2)) {
        beam.sort((a, b) => a.value - b.value);
        beam = beam.slice(0, 12).flatMap(previous => candidates(previous.board, id, conveyors).map(c => ({
            ...c, first: previous.first, cleared: previous.cleared + c.cleared,
            value: cost(c.board) - (previous.cleared + c.cleared) * 8 + previous.value * .05,
        })));
    }
    beam.sort((a, b) => a.value - b.value);
    const best = beam[0]; return best ? { ...best.first, value: best.value } : undefined;
}
