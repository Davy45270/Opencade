import { createDemo } from '../../engines/collier/demo';
import { Engine } from '../../engines/collier/engine';
import { policy } from '../../engines/collier/policy';
import { drawList } from '../../characters/model';
import { colors, type Thumbnail } from '../thumbnail';
import { drawDecor, drawMotif } from './art';
import { canvasSize, fieldView, shooterLayout, themeIndex, themes } from './presentation';
import { bakeArt, canvasGraphics, castSprite, sprite, thumbnailHero } from '../thumbnail-art';
export { createDemo };
/** The game's canvas (360 × 736) with its baked big-top decor, the course in the universe's colours,
 * the game's pearls (same palette, same motifs), the chain's leader and the chosen hero at the shooter. */
/** The whole course in frame, big top above it: the window spans the canvas from the garland to
 * below the course, and the baked decor is widened to the card's 4:3 so no plain margin shows. */
const TOP = 20, WINDOW = 540, K = 120 / WINDOW, WIDE = 160 / K, RES = K * 2;
/** The card's own attract loop, on the game's engine and pilot: the course is primed with a long
 * chain (600 steps, about 13 pearls), the pilot shoots once every 45 steps so the chain stays
 * readable, and the level restarts when fewer than 7 pearls remain (measured: 9 to 13 pearls). */
const PRIME = 600, SHOT_EVERY = 45, MIN_PEARLS = 7;
function cardDemo(seed: number) {
    const engine = new Engine(0, seed);
    let restarts = 0, frame = 0;
    const prime = (): void => { for (let i = 0; i < PRIME; i++) engine.step(1000 / 60); };
    prime();
    return {
        engine,
        get restarts() { return restarts; },
        step() {
            const pearls = engine.chains.reduce((n, chain) => n + chain.beads.length, 0);
            if (engine.status !== 'playing' || (frame > 60 && pearls < MIN_PEARLS)) {
                restarts++; engine.loadLevel(restarts % 8, seed + restarts); frame = 0; prime();
            }
            if (frame++ % SHOT_EVERY === 0) policy(engine);
            engine.step(1000 / 60);
        },
    };
}
const pigment = (index: number): number => Number.parseInt((colors[index] ?? colors[0] ?? '#ffffff').slice(1), 16);
export function createThumbnail(seed = 300): Thumbnail {
    const demo = cardDemo(seed), hero = thumbnailHero(), leader = hero === 'singe' ? 'panda' : 'singe';
    let frame = 0;
    return {
        step: () => { demo.step(); frame++; },
        get restarts() { return demo.restarts; },
        read: () => demo.engine.snapshot(),
        draw(c) {
            const e = demo.engine, universe = themeIndex(e.level), theme = themes[universe] ?? themes[0];
            const view = fieldView(e.config), o = e.config.shooter, layout = shooterLayout(o, e.angle, view.scale);
            const top = TOP;
            c.save(); c.scale(K, K); c.translate((WIDE - canvasSize.width) / 2, -top);
            const g = canvasGraphics(c);
            c.save(); c.translate(-(WIDE - canvasSize.width) / 2, 0); c.scale(WIDE / 360, canvasSize.height / 640);
            bakeArt(c, `collier-decor-${String(universe)}`, 0, 0, 360, 640, RES, d => { drawDecor(d, universe); });
            c.restore();
            c.save(); c.translate(view.x, view.y); c.scale(view.scale, view.scale);
            const res = RES * view.scale;
            // Course: the universe's light rail with its accent core, baked once per level; the hole stays live.
            bakeArt(c, `collier-course-${String(e.level)}-${String(universe)}`, 0, 0, canvasSize.width / view.scale, canvasSize.height / view.scale, res, r => {
                for (const path of e.config.paths) for (const [width, color] of [[11, theme.light], [7, theme.accent], [2, theme.light]] as const) {
                    r.lineStyle(width, color, .95); r.beginPath();
                    path.samples.forEach((p, i) => { if (i) r.lineTo(p.x, p.y); else r.moveTo(p.x, p.y); });
                    r.strokePath();
                }
            });
            for (const path of e.config.paths) {
                const hole = path.pointAt(path.length);
                g.fillStyle(theme.accent); g.fillEllipse(hole.x, hole.y - 2, 48, e.danger ? 42 : 24);
                g.fillStyle(theme.sky); g.fillEllipse(hole.x, hole.y - 7, 40, e.danger ? 34 : 14);
            }
            // Pearls keep the game's on-screen size (radius 11.5 screen px) whatever the course's scale.
            const pearl = (x: number, y: number, color: number): void => {
                c.save(); c.translate(x, y); c.scale(1 / view.scale, 1 / view.scale);
                bakeArt(c, `collier-pearl-${String(color)}`, -12, -12, 24, 24, RES, b => {
                    b.fillStyle(pigment(color)); b.fillCircle(12, 12, 11.5); drawMotif(b, 12, 12, color, 11.5);
                });
                c.restore();
            };
            e.chains.forEach((chain, i) => {
                const path = e.config.paths[i];
                if (!path) return;
                for (const b of chain.beads) {
                    if (e.hidden(b.s)) continue;
                    const p = path.pointAt(b.s);
                    pearl(p.x, p.y, b.color);
                }
                if (chain.beads.length) {
                    const p = path.pointAt((chain.beads.at(-1)?.s ?? 0) + 24), size = 80 / view.scale;
                    castSprite(c, leader, 'face', e.danger ? 'surprise' : 'concentre', 'marche', frame / 2, p.x - size / 2, p.y - size * .7, size, res);
                }
            });
            g.fillStyle(theme.accent);
            const a = layout.arrow, t = e.angle;
            g.fillTriangle(a.x + Math.cos(t) * 9, a.y + Math.sin(t) * 9, a.x + Math.cos(t + 2.2) * 8, a.y + Math.sin(t + 2.2) * 8, a.x + Math.cos(t - 2.2) * 8, a.y + Math.sin(t - 2.2) * 8);
            // Aiming sight: the game's dotted line along the aim, marching so the card stays alive.
            g.fillStyle(theme.light, .9);
            for (let i = 0; i < 6; i++) { const d = 60 / view.scale + i * 12 + frame % 12; g.fillCircle(o.x + Math.cos(t) * d, o.y + Math.sin(t) * d, 2); }
            sprite(c, `collier-hero-${hero}`, () => drawList(hero, 'face', 'concentre', 'repos', 0), o.x - layout.size / 2, o.y - layout.size / 2, layout.size, res);
            pearl(layout.current.x, layout.current.y, e.current);
            pearl(layout.next.x, layout.next.y, e.next);
            if (e.flight) pearl(e.flight.x, e.flight.y, e.flight.color);
            c.restore();
            c.restore();
        },
    };
}
