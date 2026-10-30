import { Engine, DIAMETER } from './engine';
/** Aim at a visible run of the loaded colour; swap when the reserve offers a better run. */
export function target(e: Engine, color = e.current): {
    angle: number;
    value: number;
} | null {
    let best: {
        angle: number;
        value: number;
    } | null = null;
    e.chains.forEach((c, ci) => {
        const path = e.config.paths[ci];
        if (!path)
            return;
        c.beads.forEach((b, i) => {
            if (b.color !== color || e.hidden(b.s))
                return;
            const p = path.pointAt(b.s), o = e.config.shooter;
            const angle = Math.atan2(p.y - o.y, p.x - o.x), hit = e.trace(angle);
            if (Math.hypot(hit.x - o.x, hit.y - o.y) + DIAMETER + 3 < Math.hypot(p.x - o.x, p.y - o.y))
                return;
            let run = 1;
            for (let j = i - 1; j >= 0; j--) {
                const a = c.beads[j], z = c.beads[j + 1];
                if (!a || !z || a.color !== color || z.s - a.s > DIAMETER + .01)
                    break;
                run++;
            }
            for (let j = i + 1; j < c.beads.length; j++) {
                const a = c.beads[j - 1], z = c.beads[j];
                if (!a || !z || z.color !== color || z.s - a.s > DIAMETER + .01)
                    break;
                run++;
            }
            const value = run * 100 + b.s / path.length * 10 - Math.hypot(p.x - o.x, p.y - o.y) / 1000;
            if (!best || value > best.value)
                best = { angle, value };
        });
    });
    return best;
}
export function policy(e: Engine): void {
    if (e.flight || e.status !== 'playing')
        return;
    let aim = target(e);
    const reserve = target(e, e.next);
    if (reserve && (!aim || reserve.value > aim.value + 50)) {
        e.swap();
        aim = reserve;
    }
    if (aim) {
        e.aim(aim.angle);
        e.shoot();
    }
}
