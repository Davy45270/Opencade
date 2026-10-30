import { Engine } from './engine';
import { pilot } from './pilot';
import { demo } from '../shared/demo';
export function createDemo(seed = 28) {
    return demo(new Engine(), seed, pilot, e => { e.step(1000 / 15); });
}
