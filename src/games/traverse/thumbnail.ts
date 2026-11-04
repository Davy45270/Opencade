import { createDemo } from '../../engines/traverse/demo';
import { shelterOpen } from '../../engines/traverse/engine';
import { car, log, turtle, worldOf } from '../universal/art';
import { CAR_PAINTS, crossingScenery, hut, laneRuns } from './art';
import { bakeArt, castSprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The game's crossing at its own scale (360 × 640), framed on the hero: same scenery,
 * cars, logs, turtles, huts and character, each baked once and shown as bitmaps. */
const K = 160 / 360, VIEW = 120 / K, RES = K * 2;
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed), hero = thumbnailHero();
    let frame = 0, camera = -1;
    return { step: () => { demo.step(); frame++; }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine, s = e.state, world = worldOf(e.level);
        const heroY = Math.max(64, 52 + s.player.y * 38);
        const target = Math.max(0, Math.min(640 - VIEW, heroY - VIEW * .55));
        camera = camera < 0 ? target : camera + (target - camera) * .25;
        c.save(); c.scale(K, K); c.translate(0, -Math.round(camera));
        bakeArt(c, `traverse-${world}-${String(e.level)}-${JSON.stringify(e.board.rocks ?? [])}-${e.board.lanes.map(l => `${l.kind[0] ?? ''}${String(l.y)}`).join('')}`, 0, 0, 360, 640, RES, g => { crossingScenery(g, world, e.board); });
        for (const lane of e.board.lanes) {
            const top = 64 + lane.y * 38;
            if (top + 38 < camera || top > camera + VIEW) continue;
            for (const [run, x] of laneRuns(lane, s.phase, e.level)) {
                const left = 11 + run * 38, width = (x - run) * 38 - 4;
                if (lane.kind === 'road') { const paint = CAR_PAINTS[(lane.y + run) % CAR_PAINTS.length] ?? 0xff5f5f; bakeArt(c, `traverse-car-${paint.toString(16)}-${String(width)}-${String(lane.direction)}`, left, top + 5, width, 30, RES, b => { car(b, 0, 2, width, 24, paint, lane.direction); }); }
                else if (lane.diver) for (let k = run; k < x; k++) bakeArt(c, `traverse-turtle-${String(lane.direction)}`, 9 + k * 38, top + 6, 38, 26, RES, b => { turtle(b, 19, 13, 12, lane.direction); });
                else bakeArt(c, `traverse-log-${String(width)}`, left, top + 6, width, 26, RES, b => { log(b, 0, 0, width, 26); });
            }
        }
        for (const x of e.board.shelters) {
            const state = s.occupied.includes(x) ? 'done' : shelterOpen(e.board, s.occupied, s.rescued ?? false, x) ? 'open' : 'closed';
            bakeArt(c, `traverse-hut-${state}`, 10 + x * 38, 62, 38, 40, RES, b => { hut(b, state); });
        }
        castSprite(c, hero, 'face', 'concentre', 'marche', frame / 2, 3 + s.player.x * 38, heroY, 50, RES);
        c.restore();
    } };
}
