import { Engine } from './engine';
import { policy } from './policy';
export function createDemo(seed = 300) {
    const engine = new Engine(0, seed);
    let restarts = 0;
    return {
        engine,
        get restarts() {
            return restarts;
        },
        step() {
            if (engine.status !== 'playing') {
                restarts++;
                engine.loadLevel(restarts % 8, seed + restarts);
            }
            policy(engine);
            engine.step(1000 / 60);
        }
    };
}
