import { required } from './access';
import { circuits, type Circuit } from './circuits';
import { Random } from '../shared/random';
export interface Vec {
    x: number;
    y: number;
}
export interface Track {
    circuit: Circuit;
    slalom: (Vec & { nx: number; ny: number; half: number; index: number })[];
    heights: number[];
    bermEdges: { a: Vec; b: Vec }[];
    finishLine: { a: Vec; b: Vec };
    boosts: (Vec & { radius: number; index: number })[];
    trees: (Vec & { radius: number })[];
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
    return { width: 20 - n * .27, aiSpeed: 15 + n * .23, error: .18 - n * .005, brakeDelay: .45 - n * .012, bend: .015 + n * .0015, wallFraction: .12 + n * .02, grassGrip: .45 - n * .001 };
}
export const LEVELS = circuits.map(c => ({ name: c.name }));
export function createTrack(level: number, seed = 28): Track {
    const r = new Random(seed + level * 997), d = difficulty(level), circuit = required(circuits[level]);
    const dense: Vec[] = [], denseWidths: number[] = [];
    const controls = circuit.controls, size = controls.length;
    for (let i = 0; i < size; i++) {
        const a = required(controls[(i + size - 1) % size]), b = required(controls[i]), c = required(controls[(i + 1) % size]), e = required(controls[(i + 2) % size]);
        for (let j = 0; j < 40; j++) {
            const u = j / 40;
            const value = (axis: 0 | 1) => {
                const smooth = ((1-u)**3*a[axis] + (3*u**3-6*u*u+4)*b[axis] + (-3*u**3+3*u*u+3*u+1)*c[axis] + u**3*e[axis])/6;
                const interpolated = .5*(2*b[axis]+(-a[axis]+c[axis])*u+(2*a[axis]-5*b[axis]+4*c[axis]-e[axis])*u*u+(-a[axis]+3*b[axis]-3*c[axis]+e[axis])*u*u*u);
                // Progressive spline tension keeps later combinations more pronounced.
                return smooth+(interpolated-smooth)*(d.bend-.015)*2.75;
            };
            dense.push({ x: value(0), y: value(1) });
            denseWidths.push(d.width + (b[2] - 20) * (1-u) + (c[2] - 20) * u);
        }
    }
    const lengths = [0];
    for (let i = 0; i < dense.length; i++) lengths.push(required(lengths[i]) + distance(required(dense[i]), required(dense[(i+1)%dense.length])));
    const points: Vec[] = [], widths: number[] = [];
    let cursor = 0;
    for (let i = 0; i < 96; i++) {
        const s = i * required(lengths[dense.length]) / 96;
        while (required(lengths[cursor+1]) < s) cursor++;
        const u = (s-required(lengths[cursor])) / (required(lengths[cursor+1])-required(lengths[cursor]));
        const a = required(dense[cursor]), b = required(dense[(cursor+1)%dense.length]);
        points.push({ x: a.x+(b.x-a.x)*u, y: a.y+(b.y-a.y)*u });
        widths.push(required(denseWidths[cursor]));
    }
    const distances = [0];
    for (let i = 0; i < 96; i++) distances.push(required(distances[i]) + distance(required(points[i]), required(points[(i+1)%96])));
    const track: Track = { circuit, slalom: [], bermEdges: [], heights: points.map((_, i) => (circuit.elevation[Math.floor(i * circuit.elevation.length / 96)] ?? 0) * (1 - (i * circuit.elevation.length / 96) % 1) + (circuit.elevation[(Math.floor(i * circuit.elevation.length / 96) + 1) % circuit.elevation.length] ?? 0) * ((i * circuit.elevation.length / 96) % 1)), finishLine: { a: { x: 0, y: 0 }, b: { x: 0, y: 0 } }, boosts: [], trees: [], points, racingLine: points.map(p => ({ ...p })), widths, gates: Array.from({ length: 12 }, (_, i) => i*8), walls: points.map((_, i) => circuit.theme.urban || i%24 < Math.round(d.wallFraction*24)), length: required(distances[96]), distances };
    for (const [j, index] of circuit.gates.entries()) {
        const p = required(points[index]), n = nearest(track, p), offset = j % 2 ? 1.5 : -1.5;
        const gate = { x: p.x + n.nx * offset, y: p.y + n.ny * offset, nx: n.nx, ny: n.ny, half: 3.1, index };
        track.slalom.push(gate);
        for (let d = -2; d <= 2; d++) {
            const i = (index + d + 96) % 96, q = required(points[i]);
            track.racingLine[i] = { x: q.x + n.nx * offset * (1 - Math.abs(d) / 3), y: q.y + n.ny * offset * (1 - Math.abs(d) / 3) };
        }
    }
    for (const i of circuit.berms) {
        const a = required(points[i]), b = required(points[(i + 1) % 96]), previous = required(points[(i + 95) % 96]);
        const n = nearest(track, a), side = Math.sign((a.x-previous.x)*(b.y-a.y)-(a.y-previous.y)*(b.x-a.x)) || 1;
        const offset = -side * required(widths[i]) / 2;
        track.bermEdges.push({ a: { x: a.x+n.nx*offset, y:a.y+n.ny*offset }, b: { x:b.x+n.nx*offset, y:b.y+n.ny*offset } });
    }
    track.finishLine = gateLine(track, 0);
    const candidates = points.map((_, i) => i).filter(i => bendAt(track, i) <= .09);
    const count = level < 2 ? 0 : 1 + Math.floor((level - 2) / 4);
    for (let j = 0; j < count; j++) {
        const index = required(candidates[Math.floor((j + .5) * candidates.length / count)]);
        track.boosts.push({ ...required(points[index]), radius: 2.5, index });
    }
    for (let i = 0; i < 96; i += circuit.family === 'nature' ? 1 : 2 + level % 3) {
        const p = required(points[i]), n = nearest(track, p), radius = 1.5 + r.next();
        const side = r.next() < .5 ? -1 : 1;
        const offset = required(track.widths[i]) / 2 + radius * 2 + 2 + r.next() * 4;
        const tree = { x: p.x + n.nx * offset * side, y: p.y + n.ny * offset * side, radius };
        const edge = nearest(track, tree);
        if (edge.distance >= required(track.widths[edge.index]) / 2 + 2 * radius)
            track.trees.push(tree);
    }
    return track;
}
export function bendAt(t: Track, i: number): number {
    const a = required(t.points[(i + 95) % 96]), b = required(t.points[i]), c = required(t.points[(i + 1) % 96]);
    return Math.abs(wrap(Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x)));
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
    const edges: Vec[][] = [-1,1].map(side => t.points.map((p,i) => {
        const before = required(t.points[(i+95)%96]), after = required(t.points[(i+1)%96]);
        const len = distance(before,after), half = required(t.widths[i])/2;
        return { x:p.x-side*(after.y-before.y)/len*half, y:p.y+side*(after.x-before.x)/len*half };
    }));
    for (let side = 0; side < 2; side++) for (let other = side; other < 2; other++)
        for (let i = 0; i < 96; i++) for (let j = 0; j < 96; j++) {
            if (side===other && (Math.abs(i-j)<=1 || Math.abs(i-j)===95)) continue;
            const edge = required(edges[side]), opposite = required(edges[other]);
            const a = required(edge[i]), b = required(edge[(i+1)%96]), c = required(opposite[j]), d = required(opposite[(j+1)%96]);
            if (cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0) return false;
        }
    return distance(required(t.points[95]), required(t.points[0])) < 8;
}

/** Gate normal uses the same centred tangent as lap counting. */
export function gateLine(t: Track, gate: number): { a: Vec; b: Vec } {
    const i = required(t.gates[gate]), p = required(t.points[i]);
    const before = required(t.points[(i+95)%96]), after = required(t.points[(i+1)%96]);
    const len = distance(before, after), half = required(t.widths[i])/2;
    const nx = -(after.y-before.y)/len, ny = (after.x-before.x)/len;
    return { a: { x: p.x+nx*half, y: p.y+ny*half }, b: { x: p.x-nx*half, y: p.y-ny*half } };
}

/** 96 equidistant samples. Signed turn / sample length * perimeter
 * is dimensionless. Histogram bins have fixed width 2 on [-32,32].
 * Turns are contiguous runs above |dimensionless curvature| > 4;
 * their integrated angles are sorted so starting position is irrelevant. */
export function shapeSignature(t: Track) {
    const samples = Array.from({ length: 96 }, (_, i) => at(t, t.length*i/96));
    const angles = samples.map((b, i) => {
        const a = required(samples[(i+95)%96]), c = required(samples[(i+1)%96]);
        return wrap(Math.atan2(c.y-b.y,c.x-b.x)-Math.atan2(b.y-a.y,b.x-a.x));
    });
    const histogram = Array<number>(34).fill(0);
    for (const angle of angles) {
        const bin = Math.max(0, Math.min(33, 1+Math.floor((angle*96+32)/2)));
        histogram[bin] = required(histogram[bin])+1/96;
    }
    const turns: number[] = [];
    const start = angles.findIndex(a => Math.abs(a*96) <= 4);
    let sum = 0;
    for (let j = 1; j <= 96; j++) {
        const a = required(angles[(Math.max(0,start)+j)%96]);
        if (Math.abs(a*96)>4 && (!sum || Math.sign(a)===Math.sign(sum))) sum += a;
        else { if (sum) turns.push(sum); sum = Math.abs(a*96)>4 ? a : 0; }
    }
    if (sum) turns.push(sum);
    return { histogram, turns: turns.sort((a,b)=>a-b) };
}
export function signatureDistance(a: ReturnType<typeof shapeSignature>, b: ReturnType<typeof shapeSignature>): number {
    return a.histogram.reduce((sum, v, i) => sum+Math.abs(v-required(b.histogram[i])),0);
}
