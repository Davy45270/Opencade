import { createDemo } from '../../engines/essaim/demo';
import { CANNON_Y } from '../../engines/essaim/engine';
import { actionArt } from '../../characters/arcade-art';
import { essaimBackdrop, essaimDrift, essaimEnemy, essaimEnemyShot, essaimFlames } from './art-shapes';
import { PLAYER_ART_SIZE } from './geometry';
import { bakeArt, canvasGraphics, sprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The game's own drawings at their own scale: baked sky, planet and motifs, the enemy hulls,
 * enemy shots, and the hero's ship. The board's height is folded into the card by bringing the
 * swarm and the ship closer together; every drawing keeps its real shape. */
const K = 160 / 360, VIEW = 120 / K, RES = K * 2;
const fold = (y: number): number => 8 + (y - 40) * (VIEW - 8) / 580;
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed), hero = thumbnailHero(), ships = actionArt[hero].ships;
    // Start after entry, with the formation and a real diving enemy if available.
    for (let i = 0; i < 90; i++) {
        const enemies = demo.engine.state.enemies;
        if (enemies.some(e => e.phase === 'formation') && enemies.some(e => e.phase === 'dive' && e.y > 180)) break;
        demo.step();
    }
    let frame = 0, last = 180, tilt = 0;
    return { step: () => { demo.step(); frame++; }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine, s = e.state;
        c.save(); c.scale(K, K);
        c.save(); c.beginPath(); c.rect(0, 0, 360, VIEW); c.clip();
        bakeArt(c, `essaim-bg-${String(e.level)}`, 0, -160, 360, 640, RES, g => { essaimBackdrop(g, e.level); essaimDrift(g, e.level, 0); });
        c.restore();
        const g = canvasGraphics(c), clock = frame * 1000 / 15;
        for (const enemy of s.enemies) essaimEnemy(g, { ...enemy, y: fold(enemy.y) }, false, clock, false);
        for (const shot of s.shots) if (shot.owner === 'enemy') essaimEnemyShot(g, { ...shot, y: fold(shot.y) });
        else { c.fillStyle = '#8bcfc3'; c.fillRect(shot.x - 2, fold(shot.y) - 8, 4, 16); }
        tilt += (Math.max(-.2, Math.min(.2, (s.cannon - last) / 22)) - tilt) * .5; last = s.cannon;
        const y = fold(CANNON_Y);
        c.save(); c.translate(0, y - CANNON_Y); essaimFlames(g, s.cannon, .5 + Math.sin(frame) * .5); c.restore();
        const view = tilt < -.03 ? 'gauche' : tilt > .03 ? 'droite' : 'face';
        sprite(c, `essaim-ship-${hero}-${view}`, () => ships[view], s.cannon - PLAYER_ART_SIZE / 2, y - 2 - PLAYER_ART_SIZE / 2, PLAYER_ART_SIZE, RES);
        c.restore();
    } };
}
