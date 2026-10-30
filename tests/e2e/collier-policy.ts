import type { DriverState } from '../../src/games/collier/driver';
export type CollierState = Pick<DriverState, 'current' | 'next' | 'shooter'> & {
    chains: { beads: (Omit<DriverState['chains'][number]['beads'][number], 'vx' | 'vy'>
        & { vx?: number; vy?: number })[] }[];
};
export function decision(state: CollierState, view = { x: 0, y: 0, scale: 1 }, horizon = 0): {
    x: number;
    y: number;
    swap: boolean;
} | null {
    // Predict in game milliseconds, never in host wall time.
    state = {
        ...state,
        chains: state.chains.map(chain => ({
            beads: chain.beads.map(bead => ({
                ...bead,
                x: bead.x === undefined ? undefined : bead.x + (bead.vx ?? 0) * horizon / 1000,
                y: bead.y === undefined ? undefined : bead.y + (bead.vy ?? 0) * horizon / 1000
            }))
        }))
    };
    const o = state.shooter, visible = state.chains.flatMap(c => c.beads).filter(b => !b.hidden && b.x !== undefined && b.y !== undefined);
    let best: {
        x: number;
        y: number;
        swap: boolean;
        value: number;
    } | null = null;
    for (const chain of state.chains)
        for (const [i, b] of chain.beads.entries()) {
            if (b.hidden || b.x === undefined || b.y === undefined || b.color !== state.current && b.color !== state.next)
                continue;
            const distance = Math.hypot(b.x - o.x, b.y - o.y);
            if (distance < 25)
                continue;
            const dx = (b.x - o.x) / distance, dy = (b.y - o.y) / distance;
            const blocked = visible.some(other => {
                if (other.id === b.id || other.x === undefined || other.y === undefined)
                    return false;
                const x = other.x - o.x, y = other.y - o.y, t = x * dx + y * dy;
                return t > 0 && t < distance - 21 && x * x + y * y - t * t < 400;
            });
            if (blocked)
                continue;
            let run = 1;
            for (let j = i - 1; j >= 0; j--) {
                const a = chain.beads[j], c = chain.beads[j + 1];
                if (!a || !c || a.color !== b.color || c.s - a.s > 20.01)
                    break;
                run++;
            }
            for (let j = i + 1; j < chain.beads.length; j++) {
                const a = chain.beads[j - 1], c = chain.beads[j];
                if (!a || !c || c.color !== b.color || c.s - a.s > 20.01)
                    break;
                run++;
            }
            const swap = b.color !== state.current, value = (run >= 2 ? 1000 : 0) + run * 100 + b.s / 100 - (swap ? 5 : 0);
            // Extend beyond the target so ±12 screen pixels perturb the aiming angle less.
            const left = (20 - view.x) / view.scale, right = (340 - view.x) / view.scale;
            const top = (60 - view.y) / view.scale, bottom = (530 - view.y) / view.scale;
            const reach = Math.min(dx > 0 ? (right - o.x) / dx : dx < 0 ? (left - o.x) / dx : 1000,
                dy > 0 ? (bottom - o.y) / dy : dy < 0 ? (top - o.y) / dy : 1000);
            const candidate = {
                x: o.x + dx * reach,
                y: o.y + dy * reach,
                swap,
                value
            };
            if (!best || value > best.value)
                best = candidate;
        }
    return best;
}
