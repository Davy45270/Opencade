import { Engine, center, neighbors } from './engine';
import { demo } from '../shared/demo';
export function createDemo(seed = 28) {
    return demo(new Engine(), seed, (e) => {
        if (!e.flight) {
            let best = -Infinity, angle = 0;
            for (let i = -12; i <= 12; i++) {
                const a = i / 10, target = e.trace(a).target;
                if (!target) continue;
                const score = neighbors(target).filter(n => e.grid.some(c => c.row === n.row && c.col === n.col && c.color === e.next)).length * 100 - center(target).y;
                if (score > best) { best = score; angle = a; }
            }
            e.aim(angle); e.shoot();
        }
    }, e => { e.advance(1000 / 15); });
}
