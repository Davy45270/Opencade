import { DT, Engine } from './engine';
import { pilot } from './pilot';
import { demo } from '../shared/demo';
export function createDemo(seed = 28) {
    return demo(new Engine(), seed, pilot, e => {
        e.step(DT);
        for (let i = 0; i < 5; i++) { pilot(e); e.step(DT); }
    });
}
