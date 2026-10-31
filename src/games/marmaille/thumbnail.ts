import { createDemo } from '../../engines/marmaille/demo';
import { COLS, ROWS } from '../../engines/marmaille/engine';
import { circle, type Thumbnail } from '../thumbnail';
import { drawList } from '../../characters/model';
import { renderCharacter } from '../../characters/canvas';
export { createDemo };
export function createThumbnail(seed = 0): Thumbnail {
    const demo = createDemo(seed);
    return {
        step: () => { demo.step(); },
        get restarts() { return demo.restarts; },
        read: () => demo.engine.snapshot(),
        draw(c) {
            const e = demo.engine, s = 160 / (COLS * 18);
            c.save();
            c.fillStyle = '#1d2a33'; c.fillRect(0, 0, 160, 120);
            c.translate(0, 120 - ROWS * 18 * s); c.scale(s, s);
            for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
                const t = e.tile(x, y);
                if (t === ' ') continue;
                c.fillStyle = t === '#' ? '#8a5a32' : t === 'X' ? '#5c6670' : '#3d8fd6';
                c.fillRect(x * 18, y * 18, 18, 18);
            }
            c.fillStyle = '#f2c45a'; c.fillRect(e.def.exit.x * 18 - 2, e.def.exit.y * 18 - 18, 22, 36);
            for (const k of e.kids) {
                if (k.state === 'saved' || k.state === 'dead') continue;
                renderCharacter(c, drawList('panda', 'profil', 'joie', 'marche', e.tick * 125 + k.id * 90), k.x * 18 - 4, k.y * 18 - 8, 26);
            }
            circle(c, e.def.spawn.x * 18 + 9, e.def.spawn.y * 18, 8, '#3a2a20');
            c.restore();
        },
    };
}
