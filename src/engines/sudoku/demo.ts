import { SudokuGame } from './game';
/** Catalogue card: level 3 (9 × 9, rich in clues) solved by the game's own hints, one ordinary action every third image; restarts after the win. */
export function createDemo(seed = 28) {
    const engine = new SudokuGame(); engine.loadLevel(2, seed);
    let frame = 0, restarts = 0;
    return { engine, get restarts() { return restarts; }, step() {
        if (engine.status !== 'playing') { engine.loadLevel(2, seed); frame = 0; restarts++; }
        if (frame++ % 3 === 0) {
            const hint = engine.state.hint;
            if (hint?.value && engine.state.selectedIndex === hint.index) engine.input(hint.value, false);
            else engine.hint();
        }
        engine.step(1000 / 15);
    } };
}
