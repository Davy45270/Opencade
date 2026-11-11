import { Engine } from './engine';
import { LEVELS } from './levels';
/** Catalogue demo: level 3 played along its frozen shortest line, one move every eight frames; restarted as soon as the
 * game is over, or after 400 frames. */
export function createDemo(_seed = 28) {
    const engine = new Engine(); engine.loadLevel(2);
    const line = (LEVELS[2]?.solution ?? '').split(', ').filter(Boolean);
    let frame = 0, restarts = 0, played = 0;
    return { engine, get restarts() { return restarts; }, step() {
        if (engine.status !== 'playing' || frame > 400) { engine.loadLevel(2); frame = 0; played = 0; restarts++; }
        if (engine.status === 'playing' && frame % 8 === 0) {
            const [busId, how] = (line[played] ?? '').split(' ');
            if (busId && how) engine.move(busId, how.startsWith('f') ? 'forward' : 'backward', Number(how.slice(1)));
            played++;
        }
        frame++;
        engine.step(1000 / 15);
    } };
}
