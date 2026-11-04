import { createDemo } from '../../engines/serpentin/demo';
import { difficulty } from '../../engines/serpentin/engine';
import { coin, stoneBlock, worldOf } from '../universal/art';
import { crystalMark, meadowScenery, segment } from './art';
import { bakeArt, castSprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The game's meadow at its own scale (360 × 640), framed on the head: same checker, rim,
 * rocks, coin, scaled snake and the chosen character riding its head. Each piece is baked once. */
const K = 160 / 360, VIEW = 120 / K, RES = K * 2;
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed), hero = thumbnailHero();
    // Grow through ordinary demo inputs before the first visible frame.
    for (let i = 0; i < 600 && demo.engine.state.segments.length < 14; i++) demo.step();
    let frame = 0, camera = -1;
    return { step: () => { demo.step(); frame++; }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine, s = e.state, world = worldOf(e.level), walls = difficulty(e.level).walls;
        const head = s.segments[0], headY = 34 + (head?.y ?? 10) * 22;
        // Keep the frame on the meadow: from the top rim down to the bottom rim.
        const target = Math.max(18, Math.min(502 - VIEW, headY - VIEW / 2));
        camera = camera < 0 ? target : camera + (target - camera) * .3;
        c.save(); c.scale(K, K); c.translate(0, -Math.round(camera));
        bakeArt(c, `serpentin-${world}-${String(walls)}`, 0, 0, 360, 640, RES, g => { meadowScenery(g, world, walls); });
        for (const o of s.obstacles) bakeArt(c, `serpentin-rock-${world}-${String(o.x + o.y)}`, 16 + o.x * 22, 33 + o.y * 22, 20, 20, RES, g => { stoneBlock(g, world, 0, 0, 20, o.x + o.y); });
        const spin = frame % 8;
        bakeArt(c, `serpentin-coin-${String(spin)}`, 14 + s.apple.x * 22, 31 + s.apple.y * 22, 24, 24, RES, g => { coin(g, 12, 12, 8, spin / 8 * Math.PI / 2.4); });
        if (s.crystal) bakeArt(c, 'serpentin-crystal', 16 + s.crystal.x * 22, 31 + s.crystal.y * 22, 20, 24, RES, g => { crystalMark(g, 10, 12); });
        // Paint tail first, the head plate and its rider last.
        [...s.segments.entries()].reverse().forEach(([i, p]) => {
            const x = 17 + p.x * 22, y = 34 + p.y * 22, kind = i === 0 ? 0 : 2 - i % 2;
            bakeArt(c, `serpentin-segment-${String(kind)}`, x - 1, y - 1, 20, 20, RES, g => { segment(g, kind, 1, 1); });
            if (i === 0) castSprite(c, hero, 'face', 'concentre', 'repos', frame / 2, x - 4, y - 5, 26, RES);
        });
        c.restore();
    } };
}
