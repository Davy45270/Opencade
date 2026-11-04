import { type Engine, IDLE, tileCenter } from '../../engines/petits-pompiers/engine';
import { contextualAction, forkEngine } from './controls';
import { Pilot } from '../../engines/petits-pompiers/pilot';
/** Read-only human-latency adapter. Forecast held input; tolerate half a reaction step
 * around a waypoint when deciding the next direction. Never snaps the live player. */
export class TouchPilot {
    private pilot = new Pilot();
    readAction(engine: Engine) {
        const copy = forkEngine(engine);
        copy.step(150);
        const actual = { x: copy.player.x, y: copy.player.y }, center = tileCenter(copy.at);
        // At the fastest walking speed, a 150 ms sample spans just over half a tile.
        if (Math.abs(copy.player.x - center.x) <= 11) copy.player.x = center.x;
        if (Math.abs(copy.player.y - center.y) <= 11) copy.player.y = center.y;
        if (copy.status !== 'playing') return { ...IDLE };
        const intent = this.pilot.readAction(copy);
        copy.player.x = actual.x; copy.player.y = actual.y;
        const guide = copy.nextObjective();
        const expected = { safe: 'deposit', rescue_person: 'pickup', rescue_animal: 'pickup', ladder: 'climb', heal: 'heal', break: 'break', refill: 'refill', call: 'call' };
        const wanted = expected[guide.type as keyof typeof expected];
        if (intent.action && wanted && contextualAction(copy) !== wanted) {
            const goal = tileCenter(guide.at), dx = goal.x - actual.x, dy = goal.y - actual.y;
            return { ...IDLE, dx: Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0, dy: Math.abs(dx) < Math.abs(dy) ? Math.sign(dy) : 0 };
        }
        return intent;
    }
}
