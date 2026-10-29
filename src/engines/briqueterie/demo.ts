import { Engine } from './engine';
import { demo } from '../shared/demo';
export function createDemo(seed = 28) {
    return demo(new Engine(), seed, (e) => {
        e.move((e.state.balls[0]?.x ?? 180) + 12); e.launch();
    }, e => { e.step(1000 / 15); });
}
