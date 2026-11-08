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

/**
 * Rival drivers (since 2026-11-08). The same racing line and target speed as before, plus what a
 * player expects from opponents: each mascot has its own pace and lane, a kart ahead in the same
 * lane is passed on the side with room (or followed at its speed when there is none), a rival far
 * behind the player gains a little pace and one far ahead eases off (bounded, never above the
 * player's top speed), items are kept for the moment they help, and a rival that stops making
 * progress is put back on the road. No random draw is added: the race stays deterministic.
 */
export const RIVAL_TOP_SPEED = 23;
export const PERSONALITIES = [
    { pace: 1, lane: 0 }, { pace: 1.03, lane: -.3 }, { pace: .985, lane: .24 }, { pace: 1.015, lane: -.1 }, { pace: .97, lane: .34 }, { pace: 1, lane: 0 },
] as const;
const personality = (id: number) => required(PERSONALITIES[id % PERSONALITIES.length]);
/** Kart position in track coordinates: distance along the centre line and signed offset to its left. */
function frame(t: Track, k: Kart, n = nearest(t, k)) { return { along: n.along, lateral: (k.x - n.x) * n.nx + (k.y - n.y) * n.ny, n }; }
/** Signed along-track distance from a to b, in [-length/2, length/2). */
function ahead(t: Track, a: number, b: number): number { return ((b - a) % t.length + t.length * 1.5) % t.length - t.length / 2; }
/** Item hold timers and progress watch stay outside the replayable kart state. */
const held = new WeakMap<Kart, number>();
const watch = new WeakMap<Kart, { best: number; still: number; along: number; travelled: number }>();
export interface RivalPlan { input: Input; speed: number; lane: number; blocked: boolean }
export function rival(k: Kart, karts: readonly Kart[], t: Track, level: number, noise: number, ms: number, n = nearest(t, k)): RivalPlan {
    const me = frame(t, k, n), half = required(t.widths[n.index]) / 2, room = Math.max(0, half - 2.2);
    const player = karts[0], p = personality(k.id);
    let lane = Math.max(-room, Math.min(room, p.lane * half)), blocked = false, follow = Infinity;
    let behindClose = false;
    for (const o of karts) {
        if (o === k || o.finishMs !== null) continue;
        const other = frame(t, o), gap = ahead(t, me.along, other.along), side = other.lateral - me.lateral;
        if (gap > -12 && gap < -1 && Math.abs(side) < 4) behindClose = true;
        // Predictive avoidance: a kart up to 10 units ahead in our lane, or alongside and touching.
        if ((gap > 0 && gap < 10 && Math.abs(side) < 2.8) || (Math.abs(gap) <= 2.6 && Math.abs(side) < 2.5)) {
            const left = other.lateral + 3.2, right = other.lateral - 3.2;
            const canLeft = left <= room, canRight = right >= -room;
            if (canLeft || canRight) lane = canLeft && (!canRight || Math.abs(left - lane) <= Math.abs(right - lane)) ? left : right;
            else if (gap > 0) blocked = true;
            // Until the move to the free side is done, hold behind instead of pushing.
            if (gap > 0) follow = Math.min(follow, Math.hypot(o.vx, o.vy) * .97);
        }
    }
    const base = rivalBase(k, t, level, noise, n, lane);
    // Catch-up, bounded: 3 % per gate behind the player beyond the first, up to 12 % (and never above
    // RIVAL_TOP_SPEED, below the player's 24); easing off by up to 5 % when far ahead.
    const gates = (player?.passed ?? k.passed) - k.passed;
    const catchUp = gates > 1 ? Math.min(CATCH_UP_MAX, (gates - 1) * CATCH_UP_PER_GATE) : gates < -1 ? -Math.min(.05, (-gates - 1) * .01) : 0;
    const speed = Math.min(RIVAL_TOP_SPEED, rivalSpeed(k, t, level, n) * p.pace * (1 + catchUp), follow);
    const bonus = useNow(k, t, level, n, behindClose, blocked, ms);
    return { input: { ...base, bonus }, speed, lane, blocked };
}
/**
 * Rival pace, tuned on 60 simulated races (30 levels x 2 seeds) against the human model of
 * scripts/derapage-human.js: rivals keep the straight-line speed of a good driver and take corners
 * with the grip the player has, so the human model no longer wins every race (44/60 instead of 58/60).
 */
export const RIVAL_STRAIGHT = (_level: number): number => RIVAL_TOP_SPEED;
export const RIVAL_CORNER = 30;
export const CATCH_UP_MAX = .12;
export const CATCH_UP_PER_GATE = .03;
function rivalSpeed(k: Kart, t: Track, level: number, n: ReturnType<typeof nearest>): number {
    const d = difficulty(level);
    const look = n.along + Math.hypot(k.vx, k.vy) * (.65 - d.brakeDelay);
    const a = at(t, look), b = at(t, look + 5), c = at(t, look + 10);
    const curvature = Math.abs(wrap(Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x))) / 5;
    const straight = jumpApproach(t, n.along) === undefined ? RIVAL_STRAIGHT(level) : 18 + k.id * .25;
    return Math.min(straight, Math.sqrt(RIVAL_CORNER / Math.max(.001, curvature)));
}
/** Steering towards the racing line shifted by `lane` (special sections keep their own lines). */
function rivalBase(k: Kart, t: Track, level: number, noise: number, n: ReturnType<typeof nearest>, lane: number): Input {
    const special = aiInput(k, t, level, noise, n);
    const gateNear = t.slalom.some(g => (required(t.distances[g.index]) - n.along + t.length) % t.length < 14);
    if (gateNear || jumpApproach(t, n.along) !== undefined || t.circuit.jumps.some(index => (required(t.distances[index]) - n.along + t.length) % t.length < 10)) return special;
    const d = difficulty(level), speed = Math.hypot(k.vx, k.vy), look = n.along + (t.circuit.theme.urban ? 14 : 8) + speed * d.brakeDelay;
    const a = at(t, look, true), b = at(t, look + 1, true), len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const x = a.x - (b.y - a.y) / len * lane, y = a.y + (b.x - a.x) / len * lane;
    const error = wrap(Math.atan2(y - k.y, x - k.x) - k.angle);
    return { steer: Math.max(-1, Math.min(1, error * 2.8 + noise * d.error)), drift: false, bonus: false };
}
/** Items for the moment they help: turbo on a straight, a puddle for a kart on our tail, the bubble or the spring when blocked or followed; held at most eight seconds. */
function useNow(k: Kart, t: Track, level: number, n: ReturnType<typeof nearest>, behindClose: boolean, blocked: boolean, ms: number): boolean {
    if (!k.item) { held.delete(k); return false; }
    const time = (held.get(k) ?? 0) + ms; held.set(k, time);
    const straight = aiSpeed(k, t, level, n) >= difficulty(level).aiSpeed;
    const use = time >= 8000 || (k.item === 'turbo' && straight) || (k.item === 'flaque' && behindClose) || (k.item === 'bulle' && (behindClose || blocked)) || (k.item === 'ressort' && (blocked || (straight && time >= 3000)));
    if (use) held.delete(k);
    return use;
}
/** True when a rival made no progress along the road for 1.5 s (outside jumps and managed decks): it is put back on the road. */
export function stalled(k: Kart, t: Track, ms: number, n = nearest(t, k)): boolean {
    const w = watch.get(k) ?? { best: 0, still: 0, along: n.along, travelled: 0 };
    w.travelled += ahead(t, w.along, n.along); w.along = n.along;
    if (k.finishMs !== null || k.jumpMs > 0 || k.bypassIndex !== undefined || w.travelled > w.best + .3) { w.best = Math.max(w.best, w.travelled); w.still = 0; }
    else w.still += ms;
    watch.set(k, w);
    if (w.still < 1500) return false;
    w.still = 0; return true;
}
