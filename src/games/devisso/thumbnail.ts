import { createDemo } from '../../engines/devisso/demo';
import { coveredBy } from '../../engines/devisso/rules';
import { shape, rotate } from '../../engines/devisso/shapes';
import { BOARD, ROWS, backdrop, boardFrame, boxArt, crateArt, plate, screwHead, slotArt, toWorld } from './art';
import { bakeArt, canvasGraphics, castSprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The game's own board at its own scale (360 × 640), framed 4:3 on the box, the buffer and the plates:
 * same backdrop, plates, screws and boxes as the scene. The backdrop is baked once per theme. */
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed), hero = thumbnailHero();
    let frame = 0;
    return { step: () => { demo.step(); frame++; }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine, s = e.state, b = e.board;
        const top = ROWS.boxes, viewH = BOARD.y + BOARD.h - top, k = 120 / viewH, viewW = 160 / k, left = (360 - viewW) / 2, res = k * 2;
        c.save(); c.scale(k, k); c.translate(-left, -top);
        bakeArt(c, `devisso-wide-${String(Math.round(viewW))}`, left, top, viewW, viewH, res, g => { backdrop(g, 'atelier', viewW, viewH); });
        bakeArt(c, 'devisso-frame', 0, BOARD.y, 360, BOARD.h, res, g => { g.translateCanvas(0, -BOARD.y); boardFrame(g, 'atelier'); });
        const g = canvasGraphics(c);
        const active = s.slots[0] ?? null;
        boxArt(g, 12, ROWS.boxes + 8, 152, 52, active ? active.color : null, active ? active.filled : 0);
        for (let n = 0; n < 5; n++) { slotArt(g, 38 + n * 49, ROWS.buffer, 40, false); const color = s.buffer[n]; if (color !== undefined) screwHead(g, 58 + n * 49, ROWS.buffer + 20, { color }, 13); }
        b.plates.map((p, n) => ({ p, n })).filter(({ n }) => s.plates[n]).sort((a, z) => a.p.z - z.p.z).forEach(({ p, n }) => {
            const [dx, dy] = s.shift[n] ?? [0, 0];
            const holes = shape(p.shape).holes.map(([hx, hy]) => { const [x, y] = rotate(hx, hy, p.rot); return [p.x + dx + x, p.y + dy + y] as [number, number]; });
            plate(g, { shape: p.shape, x: p.x + dx, y: p.y + dy, rot: p.rot, tint: p.tint, material: p.material }, holes, 1, p.z * 2);
            b.screws.forEach((screw, i) => {
                if (screw.plate !== n || !s.present[i]) return;
                const cover = coveredBy(b, s, i), [x, y] = toWorld(...e.position(i));
                screwHead(g, x, y, { color: screw.color }, 14, frame * 0.2, cover.plates.length + cover.crates.length > 0 ? 0.55 : 0);
            });
        });
        b.crates.forEach((crate, n) => { const hp = s.crates[n] ?? 0; if (hp > 0) crateArt(g, crate.x, crate.y, hp); });
        castSprite(c, hero, 'face', e.status === 'won' ? 'joie' : 'concentre', 'repos', frame / 2, 290, ROWS.boxes, 64, res);
        c.restore();
    } };
}
