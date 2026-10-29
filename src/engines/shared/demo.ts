/** Fixed-step, seeded attract mode. Policies only use ordinary engine inputs. */
export function demo<E extends { status: string; loadLevel(level: number, seed: number): void }>(engine: E, seed: number, decide: (engine: E, frame: number) => void, advance: (engine: E) => void) {
    let frame = 0;
    let restarts = 0;
    engine.loadLevel(2, seed);
    return { engine, get restarts() { return restarts; }, step() {
        if (engine.status !== 'playing' || frame >= 300) { engine.loadLevel(2, seed); frame = 0; restarts++; }
        decide(engine, frame++);
        advance(engine);
    } };
}
