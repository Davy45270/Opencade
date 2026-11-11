import { createDemo } from '../../engines/busfolie/demo';
import { backdrop, canopy, cone, exitGate, passenger, vehicle, yard } from './art';
import { bakeArt, canvasGraphics, castSprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The demo yard (level 3 played along its shortest line) with the scene's own buses, cones, exits and queue, in 160 × 120. */
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed), hero = thumbnailHero();
    let frameCount = 0;
    return { step: () => { demo.step(); frameCount++; }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine, L = e.level, w = L.board.width, h = L.board.height, s = Math.floor(88 / h), x0 = 10, y0 = 28;
        bakeArt(c, 'busfolie-backdrop', 0, 0, 160, 120, 2, g => { backdrop(g, 160, 120); });
        const g = canvasGraphics(c);
        canopy(g, 6, 4, 116, 20);
        const next = L.passengerQueue.slice(e.state.passengerQueueIndex, e.state.passengerQueueIndex + 5);
        next.forEach((grp, k) => { passenger(g, grp.color, 16 + k * 22, 16, 12); });
        yard(g, x0, y0, w, h, s);
        for (const ex of L.exits) exitGate(g, ex, x0, y0, w, h, s);
        for (const o of L.obstacles) cone(g, x0 + (o.x + 0.5) * s, y0 + (o.y + 0.5) * s, s);
        for (const b of L.buses) { const p = e.state.busPositions[b.id]; if (p) vehicle(g, b, x0 + p.x * s, y0 + p.y * s, s); }
        castSprite(c, hero, 'face', e.status === 'won' ? 'joie' : 'concentre', 'repos', frameCount / 2, 136, 74, 40, 2);
    } };
}
