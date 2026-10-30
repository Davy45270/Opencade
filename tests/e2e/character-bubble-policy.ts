import { Engine } from '../../src/engines/bubble/engine';
/** Different contact sockets can clear exactly the same group. Compare the whole
 * resolved outcome, including attached bubbles and the next deterministic colours. */
export function bubbleOutcome(model: Engine, angle: number): string {
    const trial = new Engine(model.seed, model); trial.aim(angle);
    if (!trial.shoot()) throw new Error('Cannot preview a shot');
    while (trial.flight) trial.step(1000 / 60);
    return JSON.stringify({ grid: trial.grid, status: trial.status, score: trial.score, next: trial.next, queued: trial.queued, drops: trial.drops, resolved: trial.resolved });
}
