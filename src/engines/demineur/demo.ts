import { Engine } from './engine';
/** Catalogue demo: grid 3 (the arrow) solved by the hint service, one deduction every four frames (a proven safe cell
 * is dug, a proven mine is flagged); restarted on the next frame after the win, a defeat or 300 frames. */
export function createDemo(seed = 28) {
    const engine = new Engine(); engine.loadLevel(2, seed);
    let frame = 0, restarts = 0;
    return { engine, get restarts() { return restarts; }, step() {
        if (engine.status !== 'playing' || frame > 300) { engine.loadLevel(2, seed); frame = 0; restarts++; }
        if (frame++ % 4 === 0) {
            const h = engine.hint();
            if (h.status === 'safe_move') engine.reveal(h.x, h.y);
            else if (h.status === 'mine_proven') for (const i of h.cells) { if (engine.state.cells[i]?.mark !== 'flag') engine.flag(i % engine.width, Math.floor(i / engine.width)); }
        }
        engine.step(1000 / 15);
    } };
}
