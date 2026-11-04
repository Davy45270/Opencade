import { required } from '../../engines/derapage/access';
import { createDemo } from '../../engines/derapage/demo';
import { vehicleDrawing } from '../../characters/arcade-art';
import { others } from '../../characters/model';
import { drawRoad, paintRoadLayer, roadBounds } from './road';
import { bakeArt, canvasGraphics, sprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The game's default chase view (scale 5, fixed north-up camera on the hero's kart): the track's baked road
 * layer — landscape, road, rails, trees and props from the game's own painter — and the cast's karts
 * seen from above, the chosen hero first. Each frame is one bitmap plus a few kart sprites. */
const K = 160 / 360, WINDOW = 120 / K, RES = K * 2, KART_Y = 368;
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed), hero = thumbnailHero(), drivers = [hero, ...others(hero)];
    return { step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const t = demo.engine.track, p = required(demo.engine.karts[0]);
        const box = roadBounds(t), top = KART_Y - WINDOW * .55;
        c.save(); c.scale(K, K); c.translate(0, -top);
        const g = canvasGraphics(c);
        g.fillStyle(t.circuit.theme.ground); g.fillRect(0, top, 360, WINDOW);
        c.save(); c.translate(180 + (box.left - p.x) * 5, KART_Y + (box.top - p.y) * 5);
        bakeArt(c, `derapage-road-${String(demo.engine.level)}`, 0, 0, box.width, box.height, RES, b => { paintRoadLayer(b, t, box.left, box.top); }, b => {
            // Without a raster surface (Node, tests) the road alone, not its tens of thousands of decor commands.
            drawRoad(b, t, (x, y) => ({ x: (x - box.left) * 5, y: (y - box.top) * 5 }), 5);
        });
        c.restore();
        for (const k of demo.engine.karts) {
            const x = 180 + (k.x - p.x) * 5, y = KART_Y + (k.y - p.y) * 5;
            if (y < top - 30 || y > top + WINDOW + 30 || x < -30 || x > 390) continue;
            const id = drivers[k.id] ?? hero;
            c.save(); c.translate(x, y); c.rotate(k.angle + Math.PI / 2);
            sprite(c, `kart-${id}-concentre`, () => vehicleDrawing(id, 'dessus', 'concentre'), -23, -23, 46, RES);
            c.restore();
        }
        c.restore();
    } };
}
