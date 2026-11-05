import { createDemo } from '../../engines/bubble/demo';
import { center, ORIGIN, type Color } from '../../engines/bubble/engine';
import { aimBarrelDrawing, arcadeArt, launcherDrawing } from '../../characters/arcade-art';
import { bubbleBackdropKey, drawBubbleBackdrop } from './backdrop';
import { bakeArt, sprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The game's own board at its own scale: the world's baked scenery, the hero's bubbles, the
 * launcher and its aiming barrel. The card shows the ceiling band and the launcher band. */
const K = 160 / 360, RES = K * 2;
const BANDS: readonly (readonly [number, number, number])[] = [[0, 170, 0], [520, 620, 170]];
/** World rows between the two bands, not shown on the card. */
const HIDDEN_TOP = 170, HIDDEN_BOTTOM = 520;
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed), hero = thumbnailHero(), bubbles = arcadeArt[hero].bubbles;
    const bubble = (c: CanvasRenderingContext2D, x: number, y: number, color: Color, size = 40): void => {
        sprite(c, `bubble-${hero}-${String(color)}`, () => bubbles[color] ?? [], x - size / 2, y - size / 2, size, RES);
    };
    return { step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine, level = e.level;
        c.save(); c.scale(K, K);
        for (const [from, to, at] of BANDS) {
            c.save(); c.beginPath(); c.rect(0, at, 360, to - from); c.clip(); c.translate(0, at - from);
            bakeArt(c, `bubble-thumb-${bubbleBackdropKey(level)}`, 0, 0, 360, 640, RES, g => { drawBubbleBackdrop(g, level); });
            for (const cell of e.grid) { const p = center(cell, e.drops); bubble(c, p.x, p.y, cell.color); }
            const view = e.flight ? 'tir' : e.angle < -.3 ? 'gauche' : e.angle > .3 ? 'droite' : 'face';
            sprite(c, `launcher-${hero}-${view}`, () => launcherDrawing(hero, view, 'concentre'), 157 - 63, 579 - 63, 126, RES);
            c.save(); c.translate(ORIGIN.x, ORIGIN.y); c.rotate(e.angle);
            sprite(c, `barrel-${hero}`, () => aimBarrelDrawing(hero), -53, -53, 106, RES);
            c.restore();
            if (!e.flight) bubble(c, ORIGIN.x, ORIGIN.y, e.next);
            // The card hides the middle of the board: a bubble flying there is shown as a trace rising along the
            // bottom edge of the ceiling band, so a shot never leaves the card still.
            const p = e.projectile();
            if (p && e.flight) bubble(c, p.x, p.y > HIDDEN_TOP && p.y < HIDDEN_BOTTOM ? HIDDEN_TOP - 5 - (HIDDEN_BOTTOM - p.y) / (HIDDEN_BOTTOM - HIDDEN_TOP) * 15 : p.y, e.flight.color);
            bubble(c, 300, 585, e.queued, 32);
            c.restore();
        }
        c.restore();
    } };
}
