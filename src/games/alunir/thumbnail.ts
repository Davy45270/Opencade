import { createDemo } from '../../engines/alunir/demo';
import { polygon } from '../../engines/alunir/engine';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed);
    return { step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        c.save(); c.fillStyle = '#101827'; c.fillRect(0, 0, 160, 120);
        c.translate(44, 0); c.scale(0.2, 0.2);
        const e = demo.engine, s = e.state;
        c.strokeStyle = '#8794b5'; c.lineWidth = 5; c.beginPath();
        e.terrain.points.forEach((p, i) => { if (i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); }); c.stroke();
        c.strokeStyle = '#64e4cc'; c.lineWidth = 12;
        for (const p of e.terrain.pads) { c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + p.width, p.y); c.stroke(); }
        c.fillStyle = '#ffd080'; c.beginPath();
        polygon(s.x, s.y, s.angle).forEach((p, i) => { if (i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); }); c.closePath(); c.fill();
        c.strokeStyle = '#ff9955'; c.lineWidth = 6;
        if (e.controls.thrust) { c.beginPath(); c.moveTo(s.x, s.y + 8); c.lineTo(s.x, s.y + 35); c.stroke(); }
        c.restore();
    } };
}
