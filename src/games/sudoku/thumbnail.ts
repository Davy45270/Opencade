import { createDemo } from '../../engines/sudoku/demo';
import { backdrop, drawGrid, layout, PALETTE } from './art';
import { bakeArt, canvasGraphics, castSprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The game's own board, pad and companion (same drawing code as the scene), framed on the grid at 4:3. */
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed), hero = thumbnailHero();
    let frame = 0;
    return { step: () => { demo.step(); frame++; }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine, s = e.state, l = layout(e.puzzle.size);
        // A 4:3 window on the board panel; the sky runs on past the stage's sides.
        const top = l.panel.y - 14, viewH = l.panel.h + 28, k = 120 / viewH, viewW = 160 / k, left = (360 - viewW) / 2;
        c.save(); c.scale(k, k); c.translate(-left, -top);
        bakeArt(c, 'sudoku-wide', left, top, viewW, viewH, k * 2, g => { g.fillStyle(PALETTE.sky); g.fillRect(0, 0, viewW, viewH); });
        bakeArt(c, 'sudoku-backdrop', 0, 0, 360, 640, k * 2, g => { backdrop(g); });
        const g = canvasGraphics(c);
        drawGrid(g, l, { size: l.size, boxRows: e.puzzle.boxRows, boxCols: e.puzzle.boxCols, givens: e.puzzle.givens, values: s.values, notes: s.notes,
            selected: s.selectedIndex, conflicts: [], hintCells: s.hint ? s.hint.cells : [] });
        castSprite(c, hero, 'face', e.status === 'won' ? 'joie' : 'concentre', 'repos', frame / 2, l.grid.x + l.grid.w - 4, l.grid.y - 30, 80, k * 2);
        c.restore();
    } };
}
