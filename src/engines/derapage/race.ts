import { required } from './access';
import { distance, gateLine, nearest, onShortcut, type Track, type Vec } from './track';
import type { Kart } from './physics';
/** Five karts, one per mascot: the player and the four other mascots. */
export const KART_COUNT = 5;
/** Points by place; the sixth place only exists in the six-kart historical oracles (tests). */
export const POINTS = [10, 8, 6, 5, 4, 3] as const;
export function checkpoint(k: Kart, previous: Vec, t: Track, time: number): void {
    if (k.finishMs !== null)
        return;
    const index = required(t.gates[k.gate]), p = required(t.points[index]), before = required(t.points[(index + 95) % 96]), after = required(t.points[(index + 1) % 96]);
    const dx = after.x - before.x, dy = after.y - before.y;
    const a = (previous.x - p.x) * dx + (previous.y - p.y) * dy, b = (k.x - p.x) * dx + (k.y - p.y) * dy;
    const line = gateLine(t, k.gate), u = a / (a-b);
    const crossing = { x: previous.x+(k.x-previous.x)*u, y: previous.y+(k.y-previous.y)*u };
    const lateral = ((crossing.x-line.a.x)*(line.b.x-line.a.x)+(crossing.y-line.a.y)*(line.b.y-line.a.y)) / (required(t.widths[index])**2);
    const route = t.circuit.shortcut;
    const branchGate = route && index > route.from && index < route.to && onShortcut(t,crossing);
    if (a < 0 && b >= 0 && ((lateral >= 0 && lateral <= 1) || branchGate)) {
        k.passed++;
        if (k.gate === 0) {
            k.lap++;
            if (k.lap === 3)
                k.finishMs = time + (k.penaltyMs ?? 0);
        }
        k.gate = (k.gate + 1) % t.gates.length;
    }
}
export function ranking(karts: Kart[], t: Track): number[] {
    return [...karts].sort((a, b) => {
        if (a.finishMs !== null || b.finishMs !== null)
            return (a.finishMs ?? Infinity) - (b.finishMs ?? Infinity) || a.id - b.id;
        return b.passed - a.passed || distance(a, required(t.points[required(t.gates[a.gate])])) - distance(b, required(t.points[required(t.gates[b.gate])])) || a.id - b.id;
    }).map(k => k.id);
}
export class Cup {
    scores: number[];
    races = 0;
    constructor(readonly count: number = KART_COUNT) { this.scores = Array.from({ length: count }, () => 0); }
    record(order: number[]): void {
        if (this.races >= 4 || order.length !== this.count || new Set(order).size !== this.count || order.some(id => !Number.isInteger(id) || id < 0 || id >= this.count))
            throw new RangeError('Course invalide');
        order.forEach((id, place) => { this.scores[id] = required(this.scores[id]) + required(POINTS[place]); });
        this.races++;
    }
    standings(): number[] { return Array.from({ length: this.count }, (_, id) => id).sort((a, b) => required(this.scores[b]) - required(this.scores[a]) || a - b); }
}
/**
 * Beyond this distance from the road edge, a kart is lost rather than cutting a bend.
 * Legitimate lines in the recorded and historical races reach 24.9 units at most.
 */
export const LOST_MARGIN = 30;
/** Time a kart may stay lost before it is put back on the road. */
export const LOST_MS = 1500;
/**
 * Puts a kart lost far off the road back on the centre line, stopped, facing the race direction.
 * The point stays between the last gate passed and the next one, so a recovery never skips a gate;
 * restarting from a standstill costs about two seconds, so getting lost is never a shortcut.
 */
export function recover(k: Kart, t: Track, ms: number): boolean {
    if (k.finishMs !== null || k.jumpMs > 0 || k.bypassIndex !== undefined || onShortcut(t, k)) { delete k.lostMs; return false; }
    const n = nearest(t, k), count = t.points.length;
    if (n.distance - required(t.widths[n.index]) / 2 <= LOST_MARGIN) { delete k.lostMs; return false; }
    k.lostMs = (k.lostMs ?? 0) + ms;
    if (k.lostMs < LOST_MS) return false;
    const gates = t.gates.length, from = required(t.gates[(k.gate + gates - 1) % gates]), to = required(t.gates[k.gate]);
    const span = (to - from + count) % count || count;
    let offset = (n.index - from + count) % count;
    if (offset >= span) offset = offset < span + (count - span) / 2 ? span - 1 : 0;
    const index = (from + offset) % count, p = required(t.points[index]), q = required(t.points[(index + 1) % count]);
    k.x = p.x; k.y = p.y; k.angle = Math.atan2(q.y - p.y, q.x - p.x);
    k.vx = 0; k.vy = 0; k.driftMs = 0; k.slipMs = 0; k.boostMs = 0;
    delete k.lostMs;
    return true;
}
