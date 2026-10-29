import { createDemo } from '../../engines/bubble/demo';
import { rect, circle, colors, type Thumbnail } from '../thumbnail';
import { center } from '../../engines/bubble/engine';
export { createDemo };
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed);
    return { step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        c.save(); c.fillStyle = '#101827'; c.fillRect(0, 0, 160, 120); c.scale(160 / 360, 120 / 640);
        const e = demo.engine;
        for (const p of e.grid) { const q = center(p, e.drops); circle(c, q.x, q.y, 19, colors[p.color] ?? '#65e4d0'); circle(c, q.x - 5, q.y - 5, 4, '#ffffff'); }
            rect(c, 164, 565, 32, 30, '#455773');
            c.save(); c.translate(180, 570); c.rotate(e.angle); rect(c, -5, -45, 10, 45, '#65e4d0'); c.restore();
            circle(c, 180, 570, 19, colors[e.next] ?? '#65e4d0');
            const p = e.projectile(); if (p) circle(c, p.x, p.y, 19, colors[e.flight?.color ?? 0] ?? '#65e4d0');
        c.restore();
    } };
}
