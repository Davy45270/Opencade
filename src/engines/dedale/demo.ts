import { Engine } from './engine';
import { route } from './solver';
import { demo } from '../shared/demo';
export function createDemo(seed = 28) {
    let turn = -1;
    return demo(new Engine(), seed, e => {
        const current = e.state.journey?.turn ?? 0;
        if (current === turn) return;
        turn = current;
        const first = route(e)?.[0];
        if (first) e.input(first);
    }, e => { e.step(1000 / 15); });
}
