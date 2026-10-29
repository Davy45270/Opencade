import { required } from './access';
import { Engine } from './engine';
import { controller } from './ai';
/** A full ordinary race, restarted only after its result. */
export function createDemo(seed = 28) {
    const engine = new Engine(0, seed);
    let restarts = 0;
    return { engine, get restarts() { return restarts; }, step() {
        if (engine.status !== 'playing') { engine.loadLevel(0, seed); restarts++; }
        engine.input(controller(required(engine.karts[0]), engine.track));
        engine.step(1000 / 15);
    } };
}
