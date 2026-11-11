import { Engine } from './engine';
import { bestMove } from './solver';
/** Catalogue demo: challenge 3 (4 × 4, 128, raining fours) played by the agent at depth 1, one move every three
 * frames; restarted on the next frame after the end or 300 frames. */
export function createDemo(_seed = 28) {
    const engine = new Engine(); engine.loadChallenge(2);
    let frame = 0, restarts = 0;
    return { engine, get restarts() { return restarts; }, step() {
        if (engine.status !== 'playing' || frame > 300) { engine.loadChallenge(2); frame = 0; restarts++; }
        if (frame++ % 3 === 0) { const d = bestMove(engine.config, engine.state.board, 1)?.direction; if (d) engine.move(d); }
        engine.step(1000 / 15);
    } };
}
