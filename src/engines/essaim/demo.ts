import { Engine } from './engine';
import { demo } from '../shared/demo';
export function createDemo(seed = 28) {
    return demo(new Engine(), seed, (e, frame) => {
        e.moveTo(180 + Math.sin(frame / 22) * 125); e.holdFire(true);
    }, e => { e.step(1000 / 15); });
}
