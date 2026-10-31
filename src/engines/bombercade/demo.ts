import { Engine } from './engine';
export function createDemo(seed = 28) {
    const engine = new Engine(); engine.loadLevel(0, seed);
    let restarts = 0;
    return { engine, get restarts() { return restarts; }, step() {
        if (engine.status !== 'playing' || engine.time > 24000) { restarts++; engine.loadLevel(restarts % 6, seed + restarts); }
        const intent = engine.policy(); engine.input(intent.direction); if (intent.bomb) engine.place(); engine.step(1000 / 15);
    } };
}
