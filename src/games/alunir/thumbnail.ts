import { createDemo } from '../../engines/alunir/demo';
import type { GameCharacter } from '../../characters/game';
import { lunarGround, lunarModule, lunarSky, scoreMark } from './presentation';
import { bakeArt, canvasGraphics, castSprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The game's own drawings at their own scale, framed on the lander: the baked lunar sky and
 * cratered ground, the pads with their multipliers, and the module with the hero in its canopy. */
const K = 160 / 360, VIEW = 120 / K, RES = K * 2, FLAT = .88;
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed), hero = thumbnailHero();
    let frame = 0, camera = -1;
    return { step: () => { demo.step(); frame++; }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine, s = e.state;
        const target = Math.max(0, Math.min(640 - VIEW, s.y * FLAT - VIEW * .45));
        camera = camera < 0 ? target : camera + (target - camera) * .3;
        c.save(); c.scale(K, K); c.translate(0, -Math.round(camera));
        bakeArt(c, 'alunir-sky', 0, 0, 360, 640, RES, g => { lunarSky(g, e, true); });
        c.save(); c.scale(1, FLAT);
        bakeArt(c, `alunir-ground-${String(e.level)}-${String(e.seed)}`, 0, 0, 360, 728, RES, g => { lunarGround(g, e); });
        const g = canvasGraphics(c);
        for (const p of e.terrain.pads) {
            g.lineStyle(5, p.role === 'service' ? 0xffcc66 : 0x64e4cc); g.lineBetween(p.x, p.y, p.x + p.width, p.y);
            g.fillStyle(0x263b66); g.fillRoundedRect(p.x, p.y + 3, p.width, 22, 4);
            scoreMark(g, p.x + p.width / 2 - 9, p.y + 7, p.multiplier);
        }
        // The module paints its pilot through `draw`: the card hands it the game's own character drawing.
        const pilot = { draw: (_g: unknown, x: number, y: number, size: number) => { castSprite(c, hero, 'face', 'concentre', 'repos', frame / 4, x, y, size, RES * 1.2); } } as unknown as GameCharacter;
        lunarModule(g, e, pilot, false);
        c.restore(); c.restore();
    } };
}
