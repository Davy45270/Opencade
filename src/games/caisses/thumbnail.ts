import { createDemo } from '../../engines/caisses/demo';
import { doorOpen } from '../../engines/caisses/rules';
import { backdrop, crate, worldOf } from '../universal/art';
import { boxPaint, cellMarks, workshopLayout, workshopScenery } from './art';
import { bakeArt, castSprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The game's workshop at its own scale (360 × 640), framed on the board: same sky, stone,
 * floor, marks, crates and character. Scenery and marks are baked per board, crates per colour. */
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed), hero = thumbnailHero();
    let frame = 0;
    return { step: () => { demo.step(); frame++; }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine, b = e.board, s = e.state, world = worldOf(e.level);
        const { unit, ox, oy } = workshopLayout(b), boardH = b.height * unit;
        // Window of 4:3 around the board, a little sky above and the slab below.
        const viewH = Math.min(640, boardH + 40), k = 120 / viewH, viewW = 160 / k, res = k * 2;
        const top = Math.max(0, Math.min(640 - viewH, oy + boardH / 2 - viewH / 2)), left = (360 - viewW) / 2;
        c.save(); c.scale(k, k); c.translate(-left, -top);
        const board = `${String(e.level)}-${String(b.width)}x${String(b.height)}-${b.walls.join('.')}`;
        if (viewW > 360) bakeArt(c, `caisses-wide-${world}-${String(Math.round(viewW))}`, left, 0, viewW, 640, res, g => { backdrop(g, world, viewW, 640); });
        bakeArt(c, `caisses-${world}-${board}`, 0, 0, 360, 640, res, g => { workshopScenery(g, world, b); });
        const open = doorOpen(b, { player: s.player, boxes: s.boxes, colors: s.colors, filled: s.filled });
        bakeArt(c, `caisses-marks-${board}-${String(open)}-${s.filled.join('.')}`, 0, 0, 360, 640, res, g => {
            for (let p = 0; p < b.width * b.height; p++) cellMarks(g, b, s, p, ox + p % b.width * unit, oy + Math.floor(p / b.width) * unit, unit, 0, open);
        });
        s.boxes.forEach((p, box) => {
            const x = ox + p % b.width * unit, y = oy + Math.floor(p / b.width) * unit, { color } = boxPaint(b, s, box, p);
            bakeArt(c, `caisses-crate-${color.toString(16)}-${String(Math.round(unit))}`, x + unit * .08, y + unit * .08, unit * .84, unit * .84, res, g => { crate(g, 0, 0, unit * .84, color); });
        });
        const size = unit * 1.55, px = ox + s.player % b.width * unit, py = oy + Math.floor(s.player / b.width) * unit;
        castSprite(c, hero, 'face', 'concentre', 'repos', frame / 2, px + (unit - size) / 2, py + unit - size, size, res);
        c.restore();
    } };
}
