import { Engine, solid } from './engine';
import { demo } from '../shared/demo';
export function createDemo(seed = 28) {
    return demo(new Engine(), seed, (e) => {
        const s = e.state, h = s.hero;
        const x = Math.floor((h.x + h.w + 24) / 16), y = Math.floor((h.y + h.h) / 16);
        e.input({ x: 1, y: 0, fire: true, jump: s.grounded ? solid(s, x, y - 1) || !solid(s, x, y + 1) : s.input.jump });
    }, e => { e.step(1000 / 15); });
}
