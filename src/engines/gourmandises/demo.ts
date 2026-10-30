import { Engine } from './engine';
export function createDemo(seed = 28) {
    const engine = new Engine();
    engine.loadLevel(2, seed);
    let frame = 0;
    let restarts = 0;
    return {
        engine,
        get restarts() { return restarts; },
        step(): void {
            if (engine.status !== 'playing' || frame >= 300) {
                engine.loadLevel(2, seed);
                frame = 0;
                restarts++;
            }
            engine.advance(1000 / 60);
            if (frame++ % 4 === 0) {
                const move = engine.validMoves()[0];
                if (move) engine.swap(...move);
            }
        },
    };
}
