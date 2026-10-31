import { createDemo } from '../../engines/artificiers/demo';
import { drawList } from '../../characters/model';
import { renderCharacter } from '../../characters/canvas';
import { circle, type Thumbnail } from '../thumbnail';
export { createDemo };
export function createThumbnail(seed = 220): Thumbnail {
    const demo = createDemo(seed);
    return {
        step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(),
        draw(c) {
            const e = demo.engine;
            c.save(); c.fillStyle = '#88d6ef'; c.fillRect(0, 0, 160, 120);
            c.scale(160 / 360, 120 / 380); c.translate(0, -250);
            // Vertical runs keep a live destructible miniature under a few hundred fills.
            for (let x = 0; x < 360; x += 4) {
                let start = 250, previous = 0;
                for (let y = 250; y <= 606; y += 2) {
                    const material = y < 606 ? e.terrain.material[e.terrain.index(x, y)] ?? 0 : 0;
                    if (material === previous) continue;
                    if (previous) { c.fillStyle = previous === 2 ? '#58647b' : previous === 3 ? '#d3a65a' : '#a77d48'; c.fillRect(x, start, 4, y - start); }
                    previous = material; start = y;
                }
            }
            c.fillStyle = '#2aafd4'; c.fillRect(0, e.water, 360, 640 - e.water);
            for (const u of e.units) if (u.hp > 0) renderCharacter(c, drawList(u.hero), u.x - 23, u.y - 34, 46);
            for (const p of e.trace({ angle: e.angle, power: e.power, weapon: e.weapon }, 35).points) circle(c, p.x, p.y, 2, '#fff9d5');
            if (e.projectile) circle(c, e.projectile.x, e.projectile.y, 5, '#ffb944');
            c.restore();
        },
    };
}
