import { required } from './access';
import { distance, gateLine, type Track, type Vec } from './track';
import type { Kart } from './physics';
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
    if (a < 0 && b >= 0 && lateral >= 0 && lateral <= 1) {
        k.passed++;
        if (k.gate === 0) {
            k.lap++;
            if (k.lap === 3)
                k.finishMs = time;
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
    scores = [0, 0, 0, 0, 0, 0];
    races = 0;
    record(order: number[]): void {
        if (this.races >= 4 || new Set(order).size !== 6 || order.some(id => !Number.isInteger(id) || id < 0 || id > 5))
            throw new RangeError('Course invalide');
        order.forEach((id, place) => { this.scores[id] = required(this.scores[id]) + required(POINTS[place]); });
        this.races++;
    }
    standings(): number[] { return [0, 1, 2, 3, 4, 5].sort((a, b) => required(this.scores[b]) - required(this.scores[a]) || a - b); }
}
