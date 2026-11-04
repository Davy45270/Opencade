import { Engine, FIXED } from './engine';
import { Pilot } from './pilot';
/** Pure attract-mode adapter, without a renderer or timers. */
export function createDemo(seed = 28) {
    const engine = new Engine(); let pilot = new Pilot(), level = 0;
    engine.loadLevel(level, seed);
    return { engine, step() {
        if (engine.status !== 'playing') { level = (level + 1) % 15; engine.loadLevel(level, seed); pilot = new Pilot(); }
        engine.input(pilot.readAction(engine)); engine.step(FIXED);
    } };
}
