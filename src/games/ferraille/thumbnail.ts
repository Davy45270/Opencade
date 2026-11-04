import { createDemo } from '../../engines/ferraille/demo';
import { PALETTES } from '../../engines/ferraille/appearance';
import { TILE } from '../../engines/ferraille/engine';
import { actionThemes, emblems, type FighterView } from '../../characters/arcade-art';
import { enemyArt, weaponArt } from './actors-art';
import { drawModule } from './modules-art';
import { sceneryMotion, sceneryTheme } from './scenery';
import { DECOR_PARTS, VIEW, decorFactor, decorKey, decorPart, decorWidth, doorArt, fighterBody, fighterGait, platformArt, tileArt } from './world-art';
import { bakeArt, canvasGraphics, sprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The game's screen (360 × 640, same camera and scale), framed on the hero: the baked parallax
 * city, the tiles, platforms, modules, robots and the chosen hero's fighter come from the game's art. */
const K = 160 / 360, WINDOW = 120 / K, RES = K * 2;
export function createThumbnail(seed = 1000): Thumbnail {
    const demo = createDemo(seed), hero = thumbnailHero(), motif = actionThemes[hero].primary;
    // Seed 1000 opens with a moving platform over a gap: start next to it.
    for (let i = 0; i < 280; i++) {
        const s = demo.engine.state;
        if (s.blocks.some(b => b.gap > 0 && (b.start + 7) * 16 > s.hero.x && (b.start + 7) * 16 < s.hero.x + 72)) break;
        demo.step();
    }
    let framing = -1;
    return { step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine, s = e.state, h = s.hero, level = e.level;
        const camera = Math.max(0, Math.min(s.columns * TILE - VIEW.width / VIEW.scale, h.x - 42)), top = Math.max(88, h.y - 146);
        const xx = (x: number): number => (x - camera) * VIEW.scale, yy = (y: number): number => (y - top) * VIEW.scale + VIEW.worldTop;
        const feet = yy(h.y + h.h), target = Math.max(0, Math.min(640 - WINDOW, feet - WINDOW * .72));
        framing = framing < 0 ? target : framing + (target - framing) * .3;
        c.save(); c.scale(K, K); c.translate(0, -Math.round(framing));
        const theme = sceneryTheme(level, s.theme), palette = PALETTES[s.theme];
        for (let part = 0; part < DECOR_PARTS; part++) {
            const width = decorWidth(part), shift = camera * decorFactor(part) % width;
            for (let x = -shift; x < 360; x += width) bakeArt(c, decorKey(theme, part), x, 0, width, 640, RES, g => { decorPart(g, theme, part); });
        }
        const g = canvasGraphics(c);
        sceneryMotion(g, level, camera, s.ticks, false, s.theme);
        const size = TILE * VIEW.scale, first = Math.max(0, Math.floor(camera / TILE)), last = Math.min(s.columns, first + Math.ceil(VIEW.width / size) + 1);
        for (let y = 0; y < 20; y++) for (let x = first; x < last; x++) if (s.tiles[y * s.columns + x]) {
            const cap = y === 16 || !s.tiles[(y - 1) * s.columns + x];
            bakeArt(c, `ferraille-tile-${s.theme}-${cap ? 'cap' : 'body'}`, xx(x * TILE), yy(y * TILE), size, size, RES, b => { tileArt(b, palette, 0, 0, size, cap); });
        }
        for (const m of s.modules ?? []) {
            if (m.x + m.w < camera || m.x > camera + 280) continue;
            const platform = m.kind === 'lift' || m.kind === 'chain' ? s.platforms.find(p => p.originX === m.x - 32) : undefined;
            drawModule(g, platform ? { ...m, x: platform.x, y: platform.y, w: platform.w } : m, xx, yy, VIEW.scale, s.ticks, false);
        }
        for (const p of s.platforms) {
            const width = p.w * VIEW.scale;
            bakeArt(c, `ferraille-platform-${String(width)}`, xx(p.x) - 2, yy(p.y) - 2, width + 4, 16, RES, b => { platformArt(b, 2, 2, width); });
        }
        doorArt(g, xx(s.door), yy(216), VIEW.scale);
        for (const r of s.enemies) {
            if (r.x + r.w < camera || r.x > camera + VIEW.width / VIEW.scale) continue;
            bakeArt(c, `ferraille-enemy-${r.kind}`, xx(r.x) - 34, yy(r.y) - 26, 92, 76, RES, b => { enemyArt(b, r.kind, 24, 16); });
        }
        for (const p of s.shots) if (p.friendly) sprite(c, `emblem-${motif}`, () => emblems[motif], xx(p.x) - 6, yy(p.y) - 6, 17, RES);
        const running = Boolean(h.vx && s.grounded), stride = running ? Math.sin(s.ticks * .55) * 3 : 0;
        const view: FighterView = s.crouched ? s.facing < 0 ? 'accroupi-gauche' : 'accroupi' : !s.grounded ? s.facing < 0 ? 'saut-gauche' : 'saut' : h.vx ? s.facing < 0 ? 'gauche' : 'marche' : s.input.fire ? s.facing < 0 ? 'gauche' : 'tir' : s.input.y < 0 ? 'dos' : s.facing < 0 ? 'gauche' : 'droite';
        const cx = xx(h.x + h.w / 2), cy = feet - 48 + stride;
        if (running && (view === 'marche' || view === 'gauche')) {
            const gait = s.input.fire && view === 'marche' ? 'tir' : view, frame = Math.floor(s.ticks / 6) % 4;
            sprite(c, `ferraille-gait-${hero}-${gait}-${String(frame)}`, () => fighterGait(hero, gait, frame), cx - 64, cy - 64, 128, RES);
        } else {
            const body = s.input.fire && view === 'marche' ? 'tir' : view;
            sprite(c, `ferraille-body-${hero}-${body}`, () => fighterBody(hero, body), cx - 64, cy - 64, 128, RES);
        }
        if (!s.vehicle) weaponArt(g, hero, cx, feet - 37 + stride, s.facing, s.input.fire, s.ticks, false);
        c.restore();
    } };
}
