import type { Engine } from '../../engines/collier/engine';

/** Only moving targets and shooter state: no path tables, actors or effects. */
export function readDriver(engine: Engine) {
    return {
        status: engine.status,
        shots: engine.shots,
        gameTimeMs: engine.time,
        current: engine.current,
        next: engine.next,
        angle: engine.angle,
        flight: Boolean(engine.flight),
        shooter: { ...engine.config.shooter },
        chains: engine.chains.map((chain, i) => {
            const path = engine.config.paths[i];
            const speed = engine.reverseMs > 0 ? -60 : path ? engine.speed(chain, path) : 0;
            return {
                head: chain.beads.at(-1)?.s ?? 0,
                beads: chain.beads.map(bead => {
                    const direction = path?.tangent(bead.s);
                    return {
                        id: bead.id,
                        color: bead.color,
                        s: bead.s,
                        ...path?.pointAt(bead.s),
                        hidden: engine.hidden(bead.s),
                        // Local velocity avoids sending path tables to the policy.
                        vx: (direction?.x ?? 0) * speed,
                        vy: (direction?.y ?? 0) * speed
                    };
                })
            };
        })
    };
}
export type DriverState = ReturnType<typeof readDriver>;
