import assert from './bubble-assert';
import { Engine, key, neighbors, type Cell } from '../src/engines/bubble/engine';
import { LEVELS, generateLevel } from '../src/engines/bubble/levels';
function resolve(e: Engine, target: Cell): void {
    assert.equal(e.shoot(), true);
    if (!e.flight) throw new Error('Missing flight');
    e.flight.trajectory = { target, length: 0, segments: [], struck: e.flight.trajectory.struck };
    e.advance(10000);
}
const sorted = (cells: Cell[]) => cells.map(key).sort();
/** B-CAT-01 leaf: a popped leaf sweeps its whole row; stone, ice, crystal and star survive; leaves chain. */
export function leaf(EngineClass = Engine): void {
    const e = new EngineClass();
    e.load([{ row: 0, col: 4, color: 0, kind: 'leaf' }, { row: 1, col: 4, color: 0 }, { row: 0, col: 0, color: 1 },
        { row: 0, col: 1, color: 2, kind: 'stone' }, { row: 0, col: 7, color: 3, kind: 'ice', ice: 2 }, { row: 0, col: 8, color: 1 },
        { row: 2, col: 0, color: 3 }]);
    resolve(e, { row: 2, col: 4, color: 0 });
    // Row 0: leaf, its two plain neighbours go; stone and ice stay. Row 2 is untouched.
    assert.deepEqual(sorted(e.last.popped), ['0:0', '0:4', '0:8', '1:4', '2:4']);
    assert.deepEqual(sorted(e.grid), ['0:1', '0:7']);
    // Ice survives the sweep itself; its swept neighbour still cracks it, as any adjacent pop does.
    assert.equal(e.grid.find(c => c.kind === 'ice')?.ice, 1);
    assert.deepEqual(e.last.fallen.map(key), ['2:0']);
    // Chain: the swept row holds a second leaf, which sweeps its own row in turn.
    e.load([{ row: 0, col: 2, color: 0, kind: 'leaf' }, { row: 1, col: 2, color: 0 }, { row: 0, col: 6, color: 1, kind: 'leaf' },
        { row: 1, col: 6, color: 2 }, { row: 2, col: 6, color: 2 }, { row: 1, col: 0, color: 1 }, { row: 0, col: 0, color: 1 }], 0);
    resolve(e, { row: 2, col: 2, color: 0 });
    assert.deepEqual(sorted(e.last.popped), ['0:0', '0:2', '0:6', '1:2', '2:2']);
    assert.deepEqual(sorted(e.last.fallen), ['1:0', '1:6', '2:6']);
    assert.equal(e.status, 'won');
    // Stars survive both a leaf sweep in their row and a neighbouring blast.
    e.load([{ row: 0, col: 2, color: 0, kind: 'leaf' }, { row: 1, col: 2, color: 0 }, { row: 0, col: 6, color: 1, kind: 'star' },
        { row: 0, col: 3, color: 0, kind: 'bomb' }, { row: 0, col: 4, color: 1, kind: 'star' }], 0);
    resolve(e, { row: 2, col: 2, color: 0 });
    assert.deepEqual(sorted(e.grid), ['0:4', '0:6']);
}
/** B-CAT-02 crystal: fixed, never pops nor falls, anchors what hangs on it, ignored by the loss line and the win. */
export function crystal(EngineClass = Engine): void {
    const e = new EngineClass();
    e.load([{ row: 0, col: 4, color: 0 }, { row: 1, col: 4, color: 0 }, { row: 2, col: 4, color: 1 },
        { row: 4, col: 1, color: 2, kind: 'crystal' }, { row: 5, col: 1, color: 3 }, { row: 1, col: 0, color: 3 }, { row: 0, col: 0, color: 3 },
        { row: 3, col: 4, color: 2, kind: 'bomb' }, { row: 3, col: 5, color: 2 }], 0);
    resolve(e, { row: 1, col: 3, color: 0 });
    // (2,4) and the bomb pair lost row 0 and fall; the crystal keeps (5,1) up.
    assert.deepEqual(sorted(e.last.fallen), ['2:4', '3:4', '3:5']);
    assert.ok(e.grid.some(c => c.kind === 'crystal') && e.grid.some(c => key(c) === '5:1'));
    // A blast next to a crystal leaves it.
    e.load([{ row: 0, col: 4, color: 0, kind: 'bomb' }, { row: 1, col: 4, color: 0 }, { row: 0, col: 5, color: 1, kind: 'crystal' }, { row: 0, col: 0, color: 1 }], 0);
    resolve(e, { row: 2, col: 4, color: 0 });
    assert.deepEqual(sorted(e.grid), ['0:0', '0:5']);
    // Only crystals left: won without dealing a colour; a crystal at the loss line never loses.
    e.load([{ row: 0, col: 4, color: 0 }, { row: 1, col: 4, color: 0 }, { row: 11, col: 2, color: 1, kind: 'crystal' }], 0);
    const state = e.random.state;
    resolve(e, { row: 2, col: 4, color: 0 });
    assert.equal(e.status, 'won'); assert.equal(e.random.state, state);
    e.load([{ row: 0, col: 4, color: 1 }, { row: 12, col: 2, color: 1, kind: 'crystal' }], 1);
    assert.equal(e.status, 'playing');
    resolve(e, { row: 0, col: 0, color: 1 });
    assert.equal(e.status, 'playing');
}
/** B-CAT-03 prism: wild in a group of any colour, passes the group on, deals no colour of its own. */
export function prism(EngineClass = Engine): void {
    const e = new EngineClass();
    e.load([{ row: 0, col: 4, color: 0 }, { row: 1, col: 4, color: 5, kind: 'prism' }, { row: 0, col: 0, color: 2 }], 0);
    resolve(e, { row: 2, col: 4, color: 0 });
    assert.deepEqual(sorted(e.last.popped), ['0:4', '1:4', '2:4']);
    // The same prism joins a group of another colour, and links two partial groups through itself.
    e.load([{ row: 0, col: 3, color: 1 }, { row: 0, col: 4, color: 3, kind: 'prism' }, { row: 0, col: 5, color: 1 }, { row: 0, col: 0, color: 2 }], 1);
    resolve(e, { row: 1, col: 4, color: 1 });
    assert.deepEqual(sorted(e.last.popped), ['0:3', '0:4', '0:5', '1:4']);
    // Chain reaction: prism completes a group with a bomb, the blast takes a leaf, the leaf sweeps its row.
    e.load([{ row: 0, col: 4, color: 0, kind: 'bomb' }, { row: 1, col: 4, color: 4, kind: 'prism' }, { row: 0, col: 5, color: 2, kind: 'leaf' },
        { row: 0, col: 8, color: 3 }, { row: 1, col: 0, color: 3 }, { row: 0, col: 0, color: 3 }], 0);
    resolve(e, { row: 2, col: 4, color: 0 });
    assert.deepEqual(sorted(e.last.popped), ['0:0', '0:4', '0:5', '0:8', '1:4', '2:4']);
    assert.equal(e.status, 'won');
    // Never dealt: a prism-only colour is refused by load() and never offered as next or queued.
    let refused = false;
    try { e.load([{ row: 0, col: 4, color: 0 }, { row: 0, col: 5, color: 5, kind: 'prism' }], 5); } catch { refused = true; }
    assert.equal(refused, true);
    for (let seed = 1; seed <= 40; seed++) {
        // Spread seeds: the first LCG draw of neighbouring seeds is nearly identical.
        e.load([{ row: 0, col: 4, color: 0 }, { row: 0, col: 5, color: 5, kind: 'prism' }], 0, seed * 104729 % 2147483647);
        assert.ok(e.next !== 5 && e.queued !== 5);
    }
}
function groups(grid: Cell[]): number[] {
    const cells = new Map(grid.map(c => [key(c), c])), seen = new Set<string>(), sizes: number[] = [];
    for (const start of grid) {
        if (seen.has(key(start))) continue;
        let size = 0; const queue = [start];
        while (queue.length) {
            const cell = queue.pop(); if (!cell || seen.has(key(cell))) continue;
            seen.add(key(cell)); size++;
            for (const n of neighbors(cell)) { const next = cells.get(key(n)); if (next && next.color === cell.color) queue.push(next); }
        }
        sizes.push(size);
    }
    return sizes;
}
/** B-CAT-04 catalogue boards: positions, mechanics and what makes each one distinct. */
export function catalogueBoards(generate = generateLevel): void {
    const at = (code: string) => LEVELS.findIndex(l => l.catalogue === code);
    assert.deepEqual(['P01', 'P02', 'P03'].map(at), [11, 19, 25]);
    assert.deepEqual([11, 19, 25].map(i => LEVELS[i]?.name), ['Jardin gourmand', 'Automne enchanté', 'Cristaux célestes']);
    const p01 = generate(11, LEVELS[11]?.seed ?? 0), p02 = generate(19, LEVELS[19]?.seed ?? 0), p03 = generate(25, LEVELS[25]?.seed ?? 0);
    // P01: no obstacle, four colours, broad simple groups: mean group at least twice ordinary L11, none under 4.
    assert.equal(p01.some(c => c.kind), false); assert.equal(new Set(p01.map(c => c.color)).size, 4);
    const sizes = groups(p01), mean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const l11 = groups(generate(10, LEVELS[10]?.seed ?? 0)), ordinary = l11.reduce((a, b) => a + b, 0) / l11.length;
    assert.ok(mean >= 2 * ordinary); assert.ok(Math.min(...sizes) >= 4);
    // Literal positions, written independently of the generator's table.
    const kinds = (grid: Cell[], kind: string) => grid.filter(c => c.kind === kind).map(c => `${String(c.row)}:${String(c.col)}`).sort();
    assert.deepEqual(kinds(p02, 'ice'), ['3:1', '3:6', '5:2', '5:5']);
    assert.equal(p02.filter(c => c.kind === 'ice').every(c => c.ice === 1), true);
    assert.deepEqual(kinds(p02, 'leaf'), ['2:4', '4:1', '6:6']);
    assert.deepEqual(kinds(p03, 'crystal'), ['4:2', '4:6', '6:4']);
    assert.deepEqual(kinds(p03, 'prism'), ['2:4', '5:1', '5:6']);
    assert.deepEqual(kinds(p03, 'bomb'), ['3:2', '3:5']);
    assert.equal(p02.some(c => c.kind && c.kind !== 'ice' && c.kind !== 'leaf'), false);
    assert.equal(p03.some(c => c.kind && !['crystal', 'prism', 'bomb'].includes(c.kind)), false);
    assert.ok(LEVELS[25]?.mechanics?.includes('bumper') && !LEVELS[25].mechanics.includes('star'));
    // Each catalogue board is also playable on another seed (shuffled palette, moved gap).
    for (const i of [11, 19, 25]) assert.ok(JSON.stringify(generate(i, 10)) !== JSON.stringify(generate(i, 11)));
}
