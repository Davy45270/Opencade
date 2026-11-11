import { createDemo } from '../../engines/fusio/demo';
import { backdrop, boardFrame, cellXY, layout, tile } from './art';
import { bakeArt, canvasGraphics, castSprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The demo board (challenge 3 played by the agent) with the scene's own frame and tiles, in 160 × 120. */
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed), hero = thumbnailHero(), l = layout(4, 112, 112);
    let frameCount = 0;
    // A 112 × 112 board layout placed at the left of the card.
    const board = { ...l, board: { ...l.board, x: 8, y: 8, w: 104, h: 104, gap: 4, cell: (104 - 20) / 4 } };
    return { step: () => { demo.step(); frameCount++; }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine;
        bakeArt(c, 'fusio-backdrop', 0, 0, 160, 120, 2, g => { backdrop(g, 'classique', 160, 120); boardFrame(g, 'classique', 8, 8, 104, 4, 4); });
        const g = canvasGraphics(c);
        e.state.board.forEach((v, i) => { if (!v) return; const [x, y] = cellXY(board, i); tile(g, v, x, y, board.board.cell); });
        castSprite(c, hero, 'face', e.status === 'won' ? 'joie' : 'concentre', 'repos', frameCount / 2, 138, 70, 40, 2);
    } };
}
