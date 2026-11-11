import { createDemo } from '../../engines/demineur/demo';
import { LEVELS } from '../../engines/demineur/levels';
import { backdrop, coveredTile, digit, flag, frame, mine, openTile } from './art';
import { bakeArt, canvasGraphics, castSprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The demo board (grid 3, solved by proven deductions) with the scene's own tiles, digits and flags, in 160 × 120. */
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed), hero = thumbnailHero(), theme = LEVELS[2]?.theme ?? 'classique';
    let frameCount = 0;
    return { step: () => { demo.step(); frameCount++; }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine, s = Math.floor(104 / e.height), x0 = 10, y0 = (120 - s * e.height) / 2;
        bakeArt(c, 'demineur-backdrop', 0, 0, 160, 120, 2, g => { backdrop(g, theme, 160, 120); });
        const g = canvasGraphics(c);
        frame(g, theme, x0, y0, s * e.width, s * e.height);
        for (const cell of e.state.cells) {
            const x = x0 + cell.x * s, y = y0 + cell.y * s;
            if (cell.revealed) { openTile(g, theme, x, y, s, cell.mine ? 0xe5413b : undefined); if (cell.mine) mine(g, x + s / 2, y + s / 2, s); else if (cell.adjacent) digit(g, cell.adjacent, x + s / 2, y + s / 2, s); }
            else if (e.status === 'won' && cell.mine) { openTile(g, theme, x, y, s); flag(g, x + s / 2, y + s / 2, s); }
            else { coveredTile(g, theme, x, y, s); if (cell.mark === 'flag') flag(g, x + s / 2, y + s / 2, s); }
        }
        castSprite(c, hero, 'face', e.status === 'won' ? 'joie' : 'concentre', 'repos', frameCount / 2, 132, 70, 44, 2);
    } };
}
