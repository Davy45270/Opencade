import { createDemo } from '../../engines/briqueterie/demo';
import { actionArt, actionThemes, ballDrawing, emblems, liveries, type Emblem } from '../../characters/arcade-art';
import { renderCharacter } from '../../characters/canvas';
import { ballEmblem, brickBackdrop, brickParticles, brickCatalogue, brickDecorId, brickEmblem, brickGarden, brickKey, brickView, drawBrickBody } from './presentation';
import { bake, bakeArt, canvasGraphics, sprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The game's own wall at its own scale: baked companion backdrop and garden, the same brick
 * bodies and emblems, the hero's paddle and ball. The card shows two bands of the board, the
 * wall and the paddle lane, joined where the board is empty. */
const K = 160 / 360, RES = K * 2;
const BANDS: readonly (readonly [number, number, number])[] = [[60, 250, 0], [530, 610, 190]];
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed), hero = thumbnailHero(), theme = actionThemes[hero];
    const color = Number.parseInt(liveries[hero].light.slice(1), 16);
    const icon = (c: CanvasRenderingContext2D, kind: Emblem, x: number, y: number, size: number): void => {
        sprite(c, `emblem-${kind}`, () => emblems[kind], x - size / 2, y - size / 2, size, RES);
    };
    let frame = 0;
    return { step: () => { demo.step(); frame++; }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine, s = e.state, level = e.level, band = Math.floor(level / 6);
        const view = brickView(level, s.balls[0]?.x ?? s.paddle), catalogue = brickCatalogue(level), decor = brickDecorId(level, hero);
        c.save(); c.scale(K, K);
        for (const [from, to, at] of BANDS) {
            c.save(); c.beginPath(); c.rect(0, at, 360, to - from); c.clip(); c.translate(0, at - from);
            bake(c, `brick-thumb-${decor}-${String(band)}-${catalogue || hero}`, 0, 0, 360, 640, RES, k => {
                const g = canvasGraphics(k); brickBackdrop(g, decor, band, 0, true); brickGarden(g, catalogue || hero);
                for (let i = 0; i < 24; i++) {
                    const kind = catalogue === 'stars' ? 'etoile' : catalogue === 'autumn' ? 'feuille' : theme.primary;
                    k.save(); k.globalAlpha = .65; k.translate(i % 2 ? 338 : 22, 70 + Math.floor(i / 2) * 44); k.rotate(i % 2 ? .3 : -.3);
                    renderCharacter(k, emblems[kind], -23, -23, 46); k.restore();
                }
            });
            // The game's drifting motes keep the card alive while the ball waits to be served.
            brickParticles(canvasGraphics(c), hero, band, frame * 250, false);
            for (const source of s.bricks) {
                const b = { ...source, x: view.x(source.x - 2), y: view.y(source.y), w: view.width, h: view.y(source.y + source.h) - view.y(source.y) };
                const local = { ...b, x: 2, y: 8 };
                bakeArt(c, `briqueterie-${brickKey(b, source, catalogue, color)}`, b.x - 2, b.y - 8, 48, Math.ceil(b.h + 16), RES, g => { drawBrickBody(g, local, source, catalogue, color); });
                const emblem = brickEmblem(source, b, catalogue, theme.primary);
                if (emblem) icon(c, emblem, b.x + b.w / 2, b.y + b.h / 2 - 1, Math.min(34, b.h - 4));
            }
            const width = s.width * 1.08;
            c.save(); c.translate(s.paddle - width / 2, 584 - 36); c.scale(width / 72, 1);
            sprite(c, `briqueterie-paddle-${hero}`, () => actionArt[hero].paddles.face, 0, 0, 72, RES);
            c.restore();
            for (const ball of s.balls) {
                const x = view.x(ball.x, ball.y), y = view.y(ball.y);
                sprite(c, `ball-${hero}`, () => ballDrawing(hero), x - 8, y - 8, 16, RES);
                icon(c, ballEmblem(hero), x, y, 24);
            }
            c.restore();
        }
        c.restore();
    } };
}
