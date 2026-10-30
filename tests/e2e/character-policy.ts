import { pilot, type Engine as Lander } from '../../src/engines/alunir/engine';
import { transition, castawayAt, type Action, type Engine as Crossing } from '../../src/engines/traverse/engine';

export const crossingInputWindowMs = 300;

/** Replan from the observed cell/phase on every traffic quantum. */
export function crossingAction(s: ReturnType<Crossing['snapshot']>): Action {
    const target = s.board.shelters.find(x => !s.occupied.includes(x));
    if (target === undefined) return 'wait';
    // Pass 404: with a castaway on the river, reach them before any shelter (shelters stay shut until then).
    const nodes = [{ p: s.player, phase: s.phase, used: s.specialUses === 0, aboard: !s.board.castaway || !!s.rescued, first: 'wait' as Action }];
    const seen = new Set<string>();
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]; if (!n || n.phase - s.phase > 100) continue;
        for (const action of ['bond', 'up', 'wait', 'left', 'right', 'down'] as const) {
            if (action === 'bond' && n.used) continue;
            const p = transition(s.board, n.p, n.phase, action, s.level);
            if (!p || (p.y === 0 && (p.x !== target || !n.aboard))) continue;
            const used = n.used || action === 'bond', first = i === 0 ? action : n.first;
            if (p.y === 0) return first;
            const c = n.aboard ? null : castawayAt(s.board, n.phase + 1), aboard = n.aboard || (!!c && c.x === p.x && c.y === p.y);
            // Lights and tides are not 108-periodic: key on the absolute phase (depth is capped at 100).
            const key = `${String(p.x)},${String(p.y)},${String(n.phase + 1)},${String(used)},${String(aboard)}`;
            if (seen.has(key)) continue;
            seen.add(key); nodes.push({ p, phase: n.phase + 1, used, aboard, first });
        }
    }
    throw new Error('No live crossing route');
}

/** Leave braking margin for touch transport overhead during final descent. */
export function landingControl(model: Lander): ReturnType<typeof pilot> {
    const control = pilot(model, 170), pad = model.terrain.pads[0];
    if (pad && pad.y - model.state.y < 80 && Math.abs(pad.x + pad.width / 2 - model.state.x) < 8) control.thrust = model.state.vy > .5;
    return control;
}
