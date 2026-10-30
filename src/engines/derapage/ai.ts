import { required } from './access';
import { at, nearest, wrap, difficulty, type Track } from './track';
import { jumpDuration, type Input, type Kart } from './physics';
export function controller(k: Kart, t: Track, noise = 0, brakeDelay = 0, n = nearest(t, k)): Input {
    const speed = Math.hypot(k.vx, k.vy);
    const jump = t.circuit.jumps.find(index => (required(t.distances[index]) - n.along + t.length) % t.length < 10);
    // Anticipate urban bends before the outer rail forces repeated rebounds.
    const target = jump === undefined ? at(t, n.along + (t.circuit.theme.urban ? 14 : 8) + speed * brakeDelay, true)
        : at(t, required(t.distances[jump]) + speed * jumpDuration(speed) / 1000 + 3, true);
    const error = wrap(Math.atan2(target.y - k.y, target.x - k.x) - k.angle);
    return { steer: Math.max(-1, Math.min(1, error * 2.8 + noise)), drift: false, bonus: k.item !== null };
}
export function aiInput(k: Kart, t: Track, level: number, noise: number, n = nearest(t, k)): Input {
    const d = difficulty(level);
    if (t.slalom.length) {
        const gate = t.slalom.find(g => {
            const gap = (required(t.distances[g.index]) - n.along + t.length) % t.length;
            return gap < 14;
        });
        if (gate) {
            // Stable per-kart error makes easier drivers occasionally miss a pole pair.
            const offset = d.error * 24 * (k.id % 2 ? 1 : -1);
            const target = { x: gate.x + gate.nx * offset, y: gate.y + gate.ny * offset };
            const error = wrap(Math.atan2(target.y - k.y, target.x - k.x) - k.angle);
            return { steer: Math.max(-1, Math.min(1, error * 2.8 + noise * d.error)), drift: false, bonus: k.item !== null };
        }
    }
    const jumpZone = jumpApproach(t, n.along);
    if (jumpZone !== undefined) {
        // Separate the five approaches before take-off; keep each lane through
        // landing, then merge gradually instead of aiming all noses at one point.
        const ahead = n.along + 14, target = at(t, ahead), next = at(t, ahead + 1);
        const length = Math.hypot(next.x-target.x,next.y-target.y);
        const blend = Math.min(1, (35-jumpZone)/15, (jumpZone+30)/15);
        const offset = (k.id-3)*2.8*Math.max(0,blend);
        const x = target.x-(next.y-target.y)/length*offset;
        const y = target.y+(next.x-target.x)/length*offset;
        const error = wrap(Math.atan2(y-k.y,x-k.x)-k.angle);
        return {steer:Math.max(-1,Math.min(1,error*2.8+noise*d.error)),drift:false,bonus:false};
    }
    return controller(k, t, noise * d.error, d.brakeDelay, n);
}

export function aiSpeed(k: Kart, t: Track, level: number, n = nearest(t, k)): number {
    const d = difficulty(level);
    const ahead = n.along + Math.hypot(k.vx, k.vy) * (.65 - d.brakeDelay);
    const a = at(t, ahead), b = at(t, ahead + 5), c = at(t, ahead + 10);
    const curvature = Math.abs(wrap(Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x))) / 5;
    const jumpSpeed = jumpApproach(t,n.along) === undefined ? d.aiSpeed : 18 + k.id*.25;
    return Math.min(jumpSpeed, Math.sqrt(8.5 / Math.max(.001, curvature)));
}

/** Signed distance to the one-way ramp: positive on approach, negative after it. */
function jumpApproach(t: Track, along: number): number | undefined {
    if (!t.circuit.jumpLanes) return undefined;
    const ramp = required(t.circuit.jumps[0]);
    const distance = (required(t.distances[ramp])-along+t.length*1.5)%t.length-t.length/2;
    return distance >= -30 && distance <= 35 ? distance : undefined;
}
