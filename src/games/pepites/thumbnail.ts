import { createDemo } from '../../engines/pepites/demo';
import { W, H } from '../../engines/pepites/engine';
import { CELL, MINE_GROUND, TOP, creature, mineTile } from './art';
import { bakeArt, canvasGraphics, castSprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The game's mine at its own scale (360 × 640), framed on the miner: same earth, rock,
 * boulders, diamonds, creatures and character. Each kind of tile is baked once. */
const K = 160 / 360, VIEW = 120 / K, RES = K * 2;
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed), hero = thumbnailHero();
    let frame = 0, camera = -1;
    return { step: () => { demo.step(); frame++; }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine, s = e.state, open = e.open, sorting = s.sorting > 0;
        const heroY = TOP + s.player.y * CELL;
        const target = Math.max(TOP - 8, Math.min(TOP + H * CELL - VIEW, heroY - VIEW / 2));
        camera = camera < 0 ? target : camera + (target - camera) * .3;
        c.save(); c.scale(K, K); c.translate(0, -Math.round(camera));
        canvasGraphics(c).fillStyle(MINE_GROUND).fillRect(0, camera, 360, VIEW);
        for (let y = 0; y < H; y++) {
            const py = TOP + y * CELL;
            if (py + CELL < camera || py > camera + VIEW) continue;
            for (let x = 0; x < W; x++) {
                const t = e.at(x, y);
                if (t === ' ') continue;
                const state = t === 'E' ? String(open) : t === 'm' ? String(sorting) : '';
                bakeArt(c, `pepites-${t}${state}`, x * CELL, py, CELL, CELL, RES * 2, g => { mineTile(g, t, 0, 0, open, 0, sorting); });
            }
        }
        for (const n of s.enemies) bakeArt(c, `pepites-creature-${n.kind}`, n.x * CELL, TOP + n.y * CELL, CELL, CELL, RES * 2, g => { creature(g, n.kind, 15, 15); });
        castSprite(c, hero, 'face', 'concentre', 'repos', frame / 2, s.player.x * CELL - 3, heroY - 5, 36, RES);
        c.restore();
    } };
}
