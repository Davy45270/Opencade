import { createDemo } from '../../engines/empilo/demo';
import { gemBlock, worldOf } from '../universal/art';
import { PIECE_COLORS, cellCenter, settledColor, wellScenery } from './art';
import { bakeArt, castSprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The game's well at its own scale (360 × 640), framed on its lower half where the stack
 * grows: same stone frame, crystals, falling piece and character beside the shaft.
 * The well is baked per world, each crystal colour once. */
const K = 160 / 360, VIEW = 120 / K, TOP = 224, RES = K * 2;
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed), hero = thumbnailHero();
    let frame = 0;
    return { step: () => { demo.step(); frame++; }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine, s = e.state, world = worldOf(e.level);
        const crystal = (x: number, y: number, color: number): void => {
            const p = cellCenter(x, y);
            if (p.y + 13 < TOP || p.y - 13 > TOP + VIEW) return;
            bakeArt(c, `empilo-crystal-${color.toString(16)}`, p.x - 13, p.y - 13, 26, 26, RES, g => { gemBlock(g, 0, 0, 26, color); });
        };
        c.save(); c.scale(K, K); c.translate(0, -TOP);
        bakeArt(c, `empilo-well-${world}`, 0, 0, 360, 640, RES, g => { wellScenery(g, world); });
        s.board.forEach((row, y) => { row.forEach((v, x) => { if (v) crystal(x, y, settledColor(v, x, y, world)); }); });
        const a = s.active;
        for (const cell of a.cells) crystal(cell.x + a.x, cell.y + a.y, PIECE_COLORS[a.id] ?? PIECE_COLORS[0] ?? 0);
        castSprite(c, hero, 'face', 'concentre', 'repos', frame / 2, 274, 230, 84, RES);
        c.restore();
    } };
}
