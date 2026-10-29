import { required } from '../../engines/derapage/access';
import { createDemo } from '../../engines/derapage/demo';
import { rect, circle, type Thumbnail } from '../thumbnail';
export { createDemo };
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed);
    return { step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
            c.save();
            rect(c, 0, 0, 160, 120, '#285a45');
            const t = demo.engine.track;
            c.lineWidth = 12;
            c.strokeStyle = '#38434d';
            c.beginPath();
            t.points.forEach((p, i) => { if (i === 0)
                c.moveTo(80 + p.x * .85, 60 + p.y * .72);
            else
                c.lineTo(80 + p.x * .85, 60 + p.y * .72); });
            c.closePath();
            c.stroke();
            for (const k of demo.engine.karts) {
                circle(c, 80 + k.x * .85, 60 + k.y * .72, 3, required(['#ffdb70', '#ff786a', '#67d9ec', '#c797ff', '#9ee278', '#f29acd'][k.id]));
            }
            c.restore();
        } };
}
