import { at, nearest, wrap, difficulty, type Track } from './track';
import type { Input, Kart } from './physics';
export function controller(k: Kart, t: Track, noise = 0, brakeDelay = 0): Input {
    const n = nearest(t, k), target = at(t, n.along + 8 + Math.hypot(k.vx, k.vy) * brakeDelay, true);
    const error = wrap(Math.atan2(target.y - k.y, target.x - k.x) - k.angle);
    return { steer: Math.max(-1, Math.min(1, error * 2.8 + noise)), drift: false, bonus: k.item !== null };
}
export function aiInput(k: Kart, t: Track, level: number, noise: number): Input {
    const d = difficulty(level); return controller(k, t, noise * d.error, d.brakeDelay);
}

export function aiSpeed(k: Kart, t: Track, level: number): number {
    const d = difficulty(level), n = nearest(t, k);
    const ahead = n.along + Math.hypot(k.vx, k.vy) * (.65 - d.brakeDelay);
    const a = at(t, ahead), b = at(t, ahead + 5), c = at(t, ahead + 10);
    const curvature = Math.abs(wrap(Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x))) / 5;
    return Math.min(d.aiSpeed, Math.sqrt(8.5 / Math.max(.001, curvature)));
}
