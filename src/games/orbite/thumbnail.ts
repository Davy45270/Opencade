import { createDemo } from '../../engines/orbite/demo';
import { CANNON_Y, SHIELD_Y } from '../../engines/orbite/engine';
import { backdrop, playerShip, probeShip, shieldCells, worldOf, PROBE_COLORS, SHIP_COLORS } from './art';
import { bakeArt, canvasGraphics, castSprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The game's own board at its own scale: baked world backdrop, probes, shields, the hero's ship
 * and the hero riding it. The 640-unit board is folded into the card by spacing the rows
 * (formation, shields, ship) closer together; every drawing keeps its real shape and size. */
const K = 160 / 360, VIEW = 120 / K, RES = K * 2;
const fold = (y: number): number => (y - 100) * VIEW / 540;
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed), hero = thumbnailHero(), hull = SHIP_COLORS[hero] ?? 0x78ead5;
    let frame = 0;
    return { step: () => { demo.step(); frame++; }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine, s = e.state, world = worldOf(e.level);
        c.save(); c.scale(K, K);
        // The lower band of the backdrop holds its ringed planet.
        c.save(); c.beginPath(); c.rect(0, 0, 360, VIEW); c.clip();
        bakeArt(c, `orbite-bg-${world}`, 0, VIEW - 640, 360, 640, RES, g => { backdrop(g, world); });
        c.restore();
        const g = canvasGraphics(c);
        c.save(); c.translate(0, fold(SHIELD_Y) - SHIELD_Y); shieldCells(g, world, s.shields, SHIELD_Y); c.restore();
        for (const p of s.probes) if (e.visible(p)) probeShip(g, p.x, fold(p.y), PROBE_COLORS[p.row] ?? 0xffffff, Math.sin(s.ticks / 6 + p.column));
        for (const shot of s.shots) { c.fillStyle = shot.owner === 'player' ? '#c2fff2' : '#ff91ac'; c.fillRect(shot.x - 1.5, fold(shot.y) - 5, 3, 10); }
        const y = fold(CANNON_Y);
        playerShip(g, s.cannon, y, hull, Math.abs(Math.sin(s.ticks / 4)));
        castSprite(c, hero, 'face', 'concentre', 'repos', frame / 3, s.cannon - 14, y - 44, 28, RES);
        c.restore();
    } };
}
