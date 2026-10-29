import { Engine, difficulty, transition, type Direction } from './engine';
import { demo } from '../shared/demo';
export function createDemo(seed = 28) {
    return demo(new Engine(), seed, e => {
        if (e.snapshot().frames !== 0) return;
        // Greedy local policy: advance when safe, otherwise seek a neighboring window.
        for (const action of ['up', 'left', 'right'] as Direction[]) {
            const p = transition(e.board, e.state.player, e.state.phase, action, e.level);
            if (p && (p.y !== 0 || !e.state.occupied.includes(p.x))) { e.input(action); break; }
        }
    }, e => { e.step(difficulty(e.level).flowFrames * 1000 / 60); });
}
