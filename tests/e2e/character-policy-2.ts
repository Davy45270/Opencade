import { nearest, at } from '../../src/engines/derapage/track';
import type { Engine as Race } from '../../src/engines/derapage/engine';
export function racingHeading(s: ReturnType<Race['snapshot']>): number {
    const k = s.karts[0]; if (!k) return 0;
    const n = nearest(s.track, { x: k.x + k.vx * 0.15, y: k.y + k.vy * 0.15 });
    const target = at(s.track, n.along + 14, true);
    return Math.atan2(target.y - k.y, target.x - k.x);
}
