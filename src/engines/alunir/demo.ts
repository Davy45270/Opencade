import { Engine, pilot } from './engine';
import { demo } from '../shared/demo';
export function createDemo(seed = 28) {
    return demo(new Engine(), seed, () => {}, e => {
        for (let i = 0; i < 4; i++) { e.input(pilot(e)); e.step(1000 / 60); }
    });
}
