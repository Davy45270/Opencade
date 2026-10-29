import { Engine } from './engine';
import { demo } from '../shared/demo';
export function createDemo(seed = 28) {
    return demo(new Engine(), seed, (e) => {
        e.moveTo(e.state.probes[0]?.x ?? 180); e.holdFire(true);
    }, e => { e.step(1000 / 15); });
}
