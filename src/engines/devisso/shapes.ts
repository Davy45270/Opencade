/** Dévisso plate shapes, in board units (one unit between two neighbouring holes).
 * A shape is a union of primitives plus its holes. The same primitives decide which
 * screw a plate covers (rules) and how the plate is painted (scene, thumbnail): what
 * the player sees on top of a screw is exactly what blocks it. */
export type Primitive =
    | { t: 'rect'; x0: number; y0: number; x1: number; y1: number; r: number }
    | { t: 'circle'; x: number; y: number; r: number }
    | { t: 'poly'; points: readonly (readonly [number, number])[] };
export interface Shape { prims: readonly Primitive[]; holes: readonly (readonly [number, number])[]; ring?: boolean }

const rect = (x0: number, y0: number, x1: number, y1: number, r = 0.42): Primitive => ({ t: 'rect', x0, y0, x1, y1, r });
const circle = (x: number, y: number, r: number): Primitive => ({ t: 'circle', x, y, r });
const polar = (n: number, radius: (k: number) => number, start = -Math.PI / 2): [number, number][] =>
    Array.from({ length: n }, (_, k) => [radius(k) * Math.cos(start + k * Math.PI * 2 / n), radius(k) * Math.sin(start + k * Math.PI * 2 / n)]);
const round = (p: [number, number][]): [number, number][] => p.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);

function bar(n: number): Shape {
    return { prims: [rect(-0.45, -0.45, n - 0.55, 0.45, 0.45)], holes: Array.from({ length: n }, (_, i) => [i, 0] as const) };
}
function grid(w: number, h: number): Shape {
    const holes: [number, number][] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) holes.push([x, y]);
    return { prims: [rect(-0.45, -0.45, w - 0.55, h - 0.55, 0.38)], holes };
}
const shapes: Record<string, Shape> = {
    L: { prims: [rect(-0.45, -0.45, 0.45, 1.45), rect(-0.45, 0.55, 1.45, 1.45)], holes: [[0, 0], [0, 1], [1, 1]] },
    J: { prims: [rect(0.55, -0.45, 1.45, 1.45), rect(-0.45, 0.55, 1.45, 1.45)], holes: [[1, 0], [0, 1], [1, 1]] },
    T: { prims: [rect(-0.45, -0.45, 2.45, 0.45), rect(0.55, -0.45, 1.45, 1.45)], holes: [[0, 0], [1, 0], [2, 0], [1, 1]] },
    cross: { prims: [rect(0.55, -0.45, 1.45, 2.45), rect(-0.45, 0.55, 2.45, 1.45)], holes: [[1, 0], [0, 1], [2, 1], [1, 2]] },
    heart: { prims: [circle(0, 0, 0.6), circle(1, 0, 0.6), { t: 'poly', points: [[-0.56, 0.18], [1.56, 0.18], [0.5, 1.62]] }], holes: [[0, 0], [1, 0], [0.5, 0.95]] },
    star: { prims: [{ t: 'poly', points: round(polar(10, k => k % 2 ? 0.82 : 1.5)) }], holes: round(polar(5, () => 0.9)) },
    flower: { prims: [circle(0, 0, 0.62), ...round(polar(5, () => 0.88)).map(([x, y]) => circle(x, y, 0.5))], holes: round(polar(5, () => 0.88)) },
    butterfly: { prims: [circle(0, 0, 0.56), circle(1, 0, 0.56), circle(0.05, 1, 0.48), circle(0.95, 1, 0.48), rect(0.38, -0.5, 0.62, 1.4, 0.12)], holes: [[0, 0], [1, 0], [0.05, 1], [0.95, 1]] },
    arch: { prims: [{ t: 'poly', points: round([...Array.from({ length: 13 }, (_, k) => [-1.5 * Math.cos(k * Math.PI / 12), -1.5 * Math.sin(k * Math.PI / 12) + 0.4] as [number, number]),
        ...Array.from({ length: 13 }, (_, k) => [0.55 * Math.cos(k * Math.PI / 12), -0.55 * Math.sin(k * Math.PI / 12) + 0.4] as [number, number])]) }],
    holes: [[-0.88, -0.11], [0, -0.62], [0.88, -0.11]] },
    tri: { prims: [{ t: 'poly', points: [[-1.55, 0.85], [1.55, 0.85], [0, -1.6]] }], holes: [[-0.72, 0.38], [0.72, 0.38], [0, -0.66]] },
    ring: { prims: [circle(0, 0, 0.62)], holes: [[0, 0]], ring: true },
    wheel: { prims: [circle(0, 0, 1.25)], holes: [[-0.56, -0.56], [0.56, -0.56], [-0.56, 0.56], [0.56, 0.56]] },
};
for (let n = 1; n <= 7; n++) shapes[`bar${String(n)}`] = bar(n);
for (let w = 2; w <= 4; w++) for (let h = 2; h <= 4; h++) shapes[`grid${String(w)}x${String(h)}`] = grid(w, h);
export const SHAPES: Readonly<Record<string, Shape>> = shapes;
export function shape(name: string): Shape {
    const s = shapes[name]; if (!s) throw new Error(`Forme inconnue : ${name}`);
    return s;
}
/** Quarter turns, clockwise on screen (y grows downwards). */
export function rotate(x: number, y: number, rot: number): [number, number] {
    let px = x, py = y;
    for (let k = 0; k < ((rot % 4) + 4) % 4; k++) [px, py] = [-py, px];
    return [px + 0, py + 0];
}
/** Signed distance from a point to a primitive: negative inside. */
function distance(p: Primitive, x: number, y: number): number {
    if (p.t === 'circle') return Math.hypot(x - p.x, y - p.y) - p.r;
    if (p.t === 'rect') {
        const ix0 = p.x0 + p.r, ix1 = p.x1 - p.r, iy0 = p.y0 + p.r, iy1 = p.y1 - p.r;
        const dx = Math.max(ix0 - x, 0, x - ix1), dy = Math.max(iy0 - y, 0, y - iy1);
        if (dx === 0 && dy === 0) return -Math.min(x - p.x0, p.x1 - x, y - p.y0, p.y1 - y);
        return Math.hypot(dx, dy) - p.r;
    }
    let inside = false, best = Infinity;
    const pts = p.points;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i] ?? [0, 0], [xj, yj] = pts[j] ?? [0, 0];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
        const ex = xj - xi, ey = yj - yi, len = ex * ex + ey * ey;
        const t = len ? Math.max(0, Math.min(1, ((x - xi) * ex + (y - yi) * ey) / len)) : 0;
        best = Math.min(best, Math.hypot(x - xi - t * ex, y - yi - t * ey));
    }
    return inside ? -best : best;
}
/** Signed distance from the point (local shape coordinates) to the shape: negative inside. */
export function shapeDistance(s: Shape, x: number, y: number): number {
    return Math.min(...s.prims.map(p => distance(p, x, y)));
}
