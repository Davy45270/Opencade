import { createDemo } from '../../engines/collier/demo';
import { circle, colors, type Thumbnail } from '../thumbnail';
import { drawList } from '../../characters/model';
import { renderCharacter } from '../../characters/canvas';
export { createDemo };
export function createThumbnail(seed = 300): Thumbnail {
    const demo = createDemo(seed);
    const hero = drawList('panda', 'face', 'concentre', 'repos', 0);
    const leader = drawList('singe', 'face', 'joie', 'marche', 0), worried = drawList('singe', 'face', 'surprise', 'marche', 0);
    return {
        step: () => {
            demo.step();
        },
        get restarts() {
            return demo.restarts;
        },
        read: () => demo.engine.snapshot(),
        draw(c) {
            const e = demo.engine;
            c.save();
            c.fillStyle = '#152a2c';
            c.fillRect(0, 0, 160, 120);
            c.scale(160 / 360, 120 / 640);
            for (const path of e.config.paths) {
                c.strokeStyle = '#b49b67';
                c.lineWidth = 9;
                c.beginPath();
                path.samples.forEach((p, i) => {
                    if (i)
                        c.lineTo(p.x, p.y);
                    else
                        c.moveTo(p.x, p.y);
                });
                c.stroke();
                const h = path.pointAt(path.length);
                circle(c, h.x, h.y, 20, '#091b20');
            }
            e.chains.forEach((chain, i) => {
                const path = e.config.paths[i];
                if (!path)
                    return;
                for (const b of chain.beads) {
                    if (e.hidden(b.s))
                        continue;
                    const p = path.pointAt(b.s);
                    circle(c, p.x, p.y, 10, colors[b.color] ?? '#ffffff');
                    circle(c, p.x - 3, p.y - 3, 2, '#ffffff');
                }
                const p = path.pointAt((chain.beads.at(-1)?.s ?? 0) + 20);
                renderCharacter(c, e.danger ? worried : leader, p.x - 20, p.y - 30, 40);
            });
            const o = e.config.shooter;
            renderCharacter(c, hero, o.x - 22, o.y - 30, 44);
            circle(c, o.x + Math.cos(e.angle) * 23, o.y + Math.sin(e.angle) * 23, 9, colors[e.current] ?? '#ffffff');
            if (e.flight)
                circle(c, e.flight.x, e.flight.y, 10, colors[e.flight.color] ?? '#ffffff');
            // A rotating dotted sight is part of the rendered aiming state, even while a shot travels.
            for (let i = 1; i < 5; i++)
                circle(c, o.x + Math.cos(e.angle + e.time / 3000) * i * 15, o.y + Math.sin(e.angle + e.time / 3000) * i * 15, 2, '#ffee91');
            c.restore();
        }
    };
}
