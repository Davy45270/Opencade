import { Engine } from './engine';
import { solve } from './solver';
/** Catalogue demo: the first assembly taken apart along a solver line, one screw every three frames,
 * restarted on the next frame after the win (or after a dead end, which the line never meets). */
export function createDemo(seed = 28) {
    const engine = new Engine(); engine.loadLevel(0, seed);
    const line = solve(engine.board, engine.state)?.moves ?? [];
    let cursor = 0, frame = 0, restarts = 0;
    return { engine, get restarts() { return restarts; }, step() {
        if (engine.status !== 'playing' || engine.stuck || cursor >= line.length || frame > 300) { engine.loadLevel(0, seed); cursor = 0; frame = 0; restarts++; }
        if (frame++ % 3 === 0) { const i = line[cursor++]; if (i !== undefined) engine.tap(i); }
        engine.step(1000 / 15);
    } };
}
