import { Engine, TICK_MS, type Role } from './engine';
/** Attract mode: the bridge board, where the first kid builds the stairs over the water (deterministic, no randomness). */
const BOARDS: readonly { level: number; trigger: [number, Role, number] | null }[] = [{ level: 3, trigger: [0, 'build', 8] }, { level: 0, trigger: null }, { level: 7, trigger: [0, 'bash', 8] }];
export function createDemo(seed = 0) {
    let restarts = 0;
    const engine = new Engine(BOARDS[0]?.level ?? 0, seed);
    return {
        engine,
        get restarts() { return restarts; },
        step() {
            if (engine.status !== 'playing') { restarts++; engine.loadLevel(BOARDS[restarts % BOARDS.length]?.level ?? 0, seed); }
            const board = BOARDS[restarts % BOARDS.length], t = board?.trigger, k = t ? engine.kids.find(c => c.id === t[0]) : undefined;
            if (t && k && k.state === 'walk' && k.x === t[2]) engine.assign(t[0], t[1]);
            // One full tick per frame: the attract mode runs fast and changes every step.
            engine.step(TICK_MS);
        },
    };
}
