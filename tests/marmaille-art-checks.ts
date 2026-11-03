import { Engine, type Tile } from '../src/engines/marmaille/engine';
import { LEVELS } from '../src/engines/marmaille/levels';
import * as art from '../src/games/marmaille/art';
import type { World } from '../src/games/marmaille/art';
type Art = typeof art;
import { replay } from './marmaille-cases';
import { solutions } from './marmaille-solutions';
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
/** A Graphics stand-in that only counts drawing calls. */
function recorder(): { g: never; calls: () => number } {
    let n = 0;
    const g: unknown = new Proxy({}, { get: () => (): unknown => { n++; return g; } });
    return { g: g as never, calls: () => n };
}
const WORLDS: World[] = ['bambou', 'roses', 'mine'];
/** Budgets per call site: the backdrop is baked once per world, cells and props are small. */
export const BUDGET = { backdrop: 700, cell: 40, portals: 60, prop: 14, repaintPerTick: 27, boxPerTick: 30 };
export const marmailleArtCases: Record<string, (A?: Art) => void> = {
    'MA-A1 décor statique : budgets d’appels du fond, des cases, des portes et des accessoires': (A = art) => {
        for (const world of WORLDS) {
            const r = recorder(); A.backdrop(r.g, world, 0x2f7a3a, 436); check(r.calls() > 50 && r.calls() <= BUDGET.backdrop, `${world} backdrop ${String(r.calls())} calls`);
            for (const tile of ['#', 'X', '~'] as Tile[]) for (const built of [false, true]) {
                const c = recorder(); A.paintCell(c.g, world, tile, { up: ' ', left: ' ', right: ' ' }, built, 3, 3, 18, 40); check(c.calls() > 0 && c.calls() <= BUDGET.cell, `${world} ${tile} cell ${String(c.calls())} calls`);
            }
            const e = recorder(); A.paintCell(e.g, world, ' ', { up: ' ', left: ' ', right: ' ' }, false, 0, 0, 18, 40); check(e.calls() === 0, 'empty cells draw nothing');
        }
        const p = recorder(); A.portals(p.g, { x: 2, y: 14 }, { x: 17, y: 17 }, 1, 18, 40); check(p.calls() > 20 && p.calls() <= BUDGET.portals, `portals ${String(p.calls())}`);
        // The exit arch stands on the exit cell: its dark tunnel is centred there, its floor on the cell's bottom edge.
        const arch: unknown[][] = [], spy: unknown = new Proxy({}, { get: (_, m) => (...args: unknown[]): unknown => { if (m === 'fillRoundedRect') arch.push(args); return spy; } });
        A.portals(spy as never, { x: 2, y: 14 }, { x: 17, y: 17 }, 1, 18, 40);
        check(arch.some(a => a[0] === 17 * 18 + 9 - 9 && a[1] === 40 + 18 * 18 - 26 && a[2] === 18 && a[3] === 26), 'exit tunnel on the exit cell');
        for (const state of ['walk', 'fall', 'block', 'build', 'dig', 'bash', 'climb']) {
            const r = recorder(); A.roleProp(r.g, state, state === 'fall', state === 'fall', 50, 50, 1, 300);
            check(r.calls() <= BUDGET.prop && (state === 'walk') === (r.calls() === 0), `${state} prop ${String(r.calls())}`);
        }
        check(A.worldOf(0) === 'bambou' && A.worldOf(9) === 'bambou' && A.worldOf(10) === 'roses' && A.worldOf(19) === 'roses' && A.worldOf(20) === 'mine' && A.worldOf(29) === 'mine', 'three worlds of ten boards');
    },
    'MA-A2 terrain : rien n’est repeint tant que rien ne change, une case creusée repeint son voisinage': (A = art) => {
        const e = new Engine(5), painted = e.tiles.map(r => r.join(''));
        check(A.dirtyCells(painted, e.tiles).length === 0, 'unchanged board repaints nothing');
        const row = e.tiles[13]; if (row) row[6] = ' ';
        const cells = A.dirtyCells(painted, e.tiles);
        check(cells.length === 9 && cells.every(([x, y]) => Math.abs(x - 6) <= 1 && Math.abs(y - 13) <= 1), 'one dug cell repaints itself and its eight neighbours');
        // One clear box covers every dirty cell (a render texture ignores a second clear before it is drawn).
        const box = A.repaintBox(painted, e.tiles);
        check(box !== null && box.x0 === 5 && box.y0 === 12 && box.x1 === 7 && box.y1 === 14, 'clear box around the dug cell');
        const far = e.tiles.map(r => [...r]); const r2 = far[20]; if (r2) r2[18] = r2[18] === 'X' ? ' ' : 'X'; const r1 = far[13]; if (r1) r1[6] = ' ';
        const both = A.repaintBox(painted, far);
        check(both !== null && A.dirtyCells(painted, far).every(([x, y]) => x >= both.x0 && x <= both.x1 && y >= both.y0 && y <= both.y1), 'two distant changes share one clear box');
        check(A.repaintBox(painted, e.tiles.map(r => [...r])) !== null && A.repaintBox(e.tiles.map(r => r.join('')), e.tiles) === null, 'no box when nothing changed');
        const corner = e.tiles.map(r => [...r]); const c0 = corner[0]; if (c0) c0[0] = c0[0] === 'X' ? ' ' : 'X';
        check(A.dirtyCells(e.tiles.map(r => r.join('')), corner).length === 4, 'corner cell clipped to the board');
    },
    'MA-A3 sur les 30 solutions rejouées, au plus trois cases changées par tick (27 repeintes)': (A = art) => {
        let worst = 0, ticks = 0, total = 0;
        LEVELS.forEach((_, level) => {
            const actions = solutions[level] ?? [], e = new Engine(level);
            let painted = e.tiles.map(r => r.join('')), i = 0;
            while (e.status === 'playing' && e.tick < 5000) {
                e.update();
                while (i < actions.length && actions[i]?.[0] === e.tick) { const [, kid, role] = actions[i] ?? [0, 0, 'block']; e.assign(kid, role); i++; }
                const n = A.dirtyCells(painted, e.tiles).length; worst = Math.max(worst, n); total += n; ticks++;
                const b = A.repaintBox(painted, e.tiles); check(!b || (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1) <= BUDGET.boxPerTick, `M${String(level + 1)} clear box too large at tick ${String(e.tick)}`);
                painted = e.tiles.map(r => r.join(''));
            }
            check(replay(Engine, level, actions).status === 'won', `M${String(level + 1)} still won`);
        });
        check(worst > 0 && worst <= BUDGET.repaintPerTick, `worst repaint ${String(worst)} cells per tick`);
        check(total / ticks < 2, `mean repaint ${String(total / ticks)} cells per tick`);
    },
};
