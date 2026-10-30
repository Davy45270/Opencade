import { Engine, TICK } from './engine';
import { demo } from '../shared/demo';
import { pilot } from './pilot';
export function createDemo(seed = 28) {
    let tick = 0;
    return demo(new Engine(), seed, (_e, frame) => { tick = frame * 6; }, e => {
        for (let i = 0; i < 6 && e.status === 'playing'; i++) { pilot(e, tick++); e.step(TICK); }
    });
}
