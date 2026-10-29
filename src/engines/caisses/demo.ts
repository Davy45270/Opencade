import { Engine } from './engine';
import { solve } from './solver';
export function createDemo(seed = 28) {
    const engine = new Engine(); engine.loadLevel(2, seed);
    let inputs = solve(engine.board)?.inputs ?? [], cursor = 0, restarts = 0;
    return { engine, get restarts() { return restarts; }, step() {
        if (engine.status !== 'playing' || cursor >= inputs.length) { engine.loadLevel(2, seed); inputs = solve(engine.board)?.inputs ?? []; cursor = 0; restarts++; }
        const d = inputs[cursor++]; if (d) engine.input(d); engine.step(1000 / 15);
    } };
}
