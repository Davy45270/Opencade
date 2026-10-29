import { required } from './access';
import { Random } from '../shared/random';
export interface Vec {
    x: number;
    y: number;
}
export interface Track {
    points: Vec[];
    racingLine: Vec[];
    widths: number[];
    gates: number[];
    walls: boolean[];
    length: number;
    distances: number[];
}
export function difficulty(level: number) {
    const n = Math.max(0, Math.min(29, level));
    return { width: 20 - n * .27, aiSpeed: 15 + n * .23, error: .18 - n * .005, brakeDelay: .45 - n * .012, bend: .015 + n * .0015, wallFraction: .12 + n * .02, grassGrip: .75 - n * .008 };
}
export const LEVELS = Array.from({ length: 30 }, (_, i) => ({ name: i < 28 ? `Coupe ${String(1 + Math.floor(i / 4))} · ${String(i % 4 + 1)}` : `Entraînement ${String(i - 27)}` }));
export function createTrack(level: number, seed = 28): Track {
    const r = new Random(seed + level * 997), phase = r.next() * Math.PI * 2, d = difficulty(level);
    const points = Array.from({ length: 96 }, (_, i) => {
        const a = i * Math.PI / 48, radius = 65 * (1 + d.bend * Math.cos(3 * a + phase));
        return { x: Math.cos(a) * radius * (1.12 + r.state % 3 * .02), y: Math.sin(a) * radius };
    });
    const distances = [0];
    for (let i = 0; i < 96; i++)
        distances.push(required(distances[i]) + distance(required(points[i]), required(points[(i + 1) % 96])));
    return { points, racingLine: points.map(p => ({ x: p.x * .99, y: p.y * .99 })), widths: points.map((_, i) => d.width + .5 * (1 + Math.sin(i * Math.PI / 24))), gates: Array.from({ length: 12 }, (_, i) => i * 8), walls: points.map((_, i) => i % 24 < Math.round(d.wallFraction * 24)), length: required(distances[96]), distances };
}
export const distance = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);
export const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
export function nearest(t: Track, p: Vec) {
    let best = { index: 0, distance: Infinity, x: 0, y: 0, along: 0, nx: 0, ny: 0 };
    for (let i = 0; i < t.points.length; i++) {
        const a = required(t.points[i]), b = required(t.points[(i + 1) % t.points.length]), dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
        const u = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (len * len)));
        const x = a.x + dx * u, y = a.y + dy * u, dist = Math.hypot(p.x - x, p.y - y);
        if (dist < best.distance)
            best = { index: i, distance: dist, x, y, along: required(t.distances[i]) + len * u, nx: -dy / len, ny: dx / len };
    }
    return best;
}
export function at(t: Track, along: number, ideal = false): Vec {
    const s = ((along % t.length) + t.length) % t.length;
    let i = 0;
    while (i < 95 && required(t.distances[i + 1]) < s)
        i++;
    const line = ideal ? t.racingLine : t.points;
    const a = required(line[i]), b = required(line[(i + 1) % 96]), u = (s - required(t.distances[i])) / (required(t.distances[i + 1]) - required(t.distances[i]));
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}
export function validateTrack(t: Track): boolean {
    const cross = (a: Vec, b: Vec, c: Vec) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if (t.points.length !== 96 || t.widths.some(w => w < 12) || t.gates.some((g, i) => g !== i * 8))
        return false;
    for (let i = 0; i < 96; i++)
        for (let j = i + 2; j < 96; j++) {
            if (i === 0 && j === 95)
                continue;
            const a = required(t.points[i]), b = required(t.points[(i + 1) % 96]), c = required(t.points[j]), d = required(t.points[(j + 1) % 96]);
            if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0)
                return false;
        }
    return distance(required(t.points[95]), required(t.points[0])) < 8;
}
