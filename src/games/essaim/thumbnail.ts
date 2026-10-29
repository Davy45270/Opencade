import { createDemo } from '../../engines/essaim/demo';
import { rect, circle, type Thumbnail } from '../thumbnail';
export { createDemo };
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed);
    return { step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        c.save(); c.fillStyle = '#101827'; c.fillRect(0, 0, 160, 120); c.scale(160 / 360, 120 / 640);
        const s = demo.engine.state;
        for (const p of s.enemies) { circle(c, p.x, p.y, 12, p.type === 'armor' ? '#ffb867' : '#d8a4ff'); rect(c, p.x - 20, p.y - 3, 40, 6, '#f080ab'); circle(c, p.x, p.y, 4, '#101827'); }
            rect(c, s.cannon - 18, 552, 36, 12, '#65e4d0'); rect(c, s.cannon - 5, 535, 10, 25, '#ffee91');
            for (const p of s.shots) rect(c, p.x - 2, p.y, 4, 18, p.owner === 'player' ? '#ffee91' : '#f080ab');
        c.restore();
    } };
}
