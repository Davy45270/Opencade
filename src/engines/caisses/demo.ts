import { Engine } from './engine';
import { solve } from './solver';
export function createDemo(seed = 28) {
    const engine = new Engine(); engine.loadLevel(2, seed);
    const inputs = solve(engine.board)?.inputs ?? [];
    let cursor = 0, frame = 0, restarts = 0;
    return { engine, get restarts() { return restarts; }, step() {
        if (engine.status !== 'playing' || cursor >= inputs.length) { engine.loadLevel(2, seed); cursor = 0; frame = 0; restarts++; }
        // Keep moves readable and the short room from looping within 600 ms.
        // Restart on the very next image after victory, without a terminal pause.
        if (frame++ % 3 === 0) {
            const d = inputs[cursor++]; if (d) engine.input(d);
        }
        engine.step(1000 / 15);
    } };
}
