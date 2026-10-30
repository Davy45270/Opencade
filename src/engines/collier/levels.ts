export const GAME_NAME = 'Le Collier du Singe';
export interface Point {
    x: number;
    y: number;
}
export type Bonus = 'slow' | 'reverse' | 'bomb' | 'aim';
export const shapes = [
    'Ovale croissant',
    'Ruban en S',
    'Serpent',
    'Arche arrondie',
    'Fer à cheval',
    'Zigzag',
    'Cœur ouvert',
    'Ovale ouvert'
] as const;
/** Radial pitch keeps neighbouring turns of the spiral apart. */
function spiral(): Point[] {
    return Array.from({ length: 2001 }, (_, i) => {
        const angle = i / 200;
        const radius = 110 + angle * 7;
        return { x: 180 + radius * Math.cos(angle), y: 305 + radius * 1.48 * Math.sin(angle) };
    });
}
/** A broad oval remains open after its level's arc-length cut. */
function oval(): Point[] {
    return Array.from({ length: 2001 }, (_, i) => {
        const angle = i / 2000 * Math.PI * 2;
        return { x: 180 + 145 * Math.cos(angle), y: 305 + 220 * Math.sin(angle) };
    });
}
/** Circular fillets join straight stretches with a continuous tangent and a 40-unit radius. */
function roundedCurve(vertices: number[][]): Point[] {
    const points = vertices.map(([x = 0, y = 0]) => ({ x, y }));
    const samples: Point[] = points[0] ? [points[0]] : [];
    for (let i = 1; i < points.length - 1; i++) {
        const a = points[i - 1], p = points[i], b = points[i + 1];
        if (!a || !p || !b)
            continue;
        const before = Math.hypot(a.x - p.x, a.y - p.y);
        const after = Math.hypot(b.x - p.x, b.y - p.y);
        const u = { x: (a.x - p.x) / before, y: (a.y - p.y) / before };
        const v = { x: (b.x - p.x) / after, y: (b.y - p.y) / after };
        const theta = Math.acos(u.x * v.x + u.y * v.y);
        const cut = 40 / Math.tan(theta / 2);
        const start = { x: p.x + u.x * cut, y: p.y + u.y * cut };
        samples.push(start);
        const bisector = Math.hypot(u.x + v.x, u.y + v.y);
        const scale = 40 / Math.sin(theta / 2) / bisector;
        const center = { x: p.x + (u.x + v.x) * scale, y: p.y + (u.y + v.y) * scale };
        const angle = Math.atan2(start.y - center.y, start.x - center.x);
        const turn = (Math.PI - theta) * Math.sign(-u.x * v.y + u.y * v.x);
        for (let n = 1; n <= 100; n++) {
            const t = angle + turn * n / 100;
            samples.push({ x: center.x + 40 * Math.cos(t), y: center.y + 40 * Math.sin(t) });
        }
    }
    const last = points.at(-1);
    if (last)
        samples.push(last);
    return samples;
}
const controls: Point[][] = [
    spiral(),
    roundedCurve([
        [30, 530],
        [315, 530],
        [315, 420],
        [45, 420],
        [45, 200],
        [315, 200],
        [315, 65]
    ]),
    roundedCurve([
        [30, 530],
        [330, 530],
        [330, 410],
        [30, 410],
        [30, 180],
        [330, 180],
        [330, 70]
    ]),
    roundedCurve([
        [30, 510],
        [30, 110],
        [180, 70],
        [330, 110],
        [330, 510],
        [230, 530],
        [230, 180],
        [110, 180],
        [110, 470]
    ]),
    roundedCurve([
        [30, 80],
        [30, 530],
        [330, 530],
        [330, 80]
    ]),
    roundedCurve([
        [20, 540],
        [340, 540],
        [30, 330],
        [340, 70],
        [20, 70]
    ]),
    roundedCurve([
        [180, 160],
        [110, 80],
        [35, 160],
        [35, 300],
        [180, 520],
        [325, 300],
        [325, 160],
        [250, 80],
        [180, 160]
    ]),
    oval()
];
/** Two U-shaped lanes stay on opposite sides of the central shooter. */
function twinLane(x: number): Point[] {
    const points: Point[] = [{ x, y: 525 }, { x, y: 110 }];
    for (let i = 1; i <= 200; i++) {
        const angle = Math.PI + i / 200 * Math.PI;
        points.push({ x: x + 40 + 40 * Math.cos(angle), y: 110 + 40 * Math.sin(angle) });
    }
    points.push({ x: x + 80, y: 525 });
    return points;
}
export class Path {
    readonly samples: (Point & {
        s: number;
    })[] = [];
    readonly length: number;
    constructor(readonly controls: readonly Point[], targetLength?: number) {
        // Trim by arc length instead of scaling a curve outside the playfield.
        const points = controls;
        let length = 0;
        for (const p of points) {
            const previous = this.samples.at(-1);
            const distance = previous ? Math.hypot(p.x - previous.x, p.y - previous.y) : 0;
            if (previous && targetLength !== undefined && length + distance > targetLength) {
                const t = (targetLength - length) / distance;
                this.append({ x: previous.x + (p.x - previous.x) * t, y: previous.y + (p.y - previous.y) * t }, targetLength);
                length = targetLength;
                break;
            }
            length += distance;
            this.append(p, length);
        }
        this.length = length;
    }
    /** Keep the lookup table at a maximum one-unit arc-length step, including straight stretches. */
    private append(point: Point, s: number): void {
        const previous = this.samples.at(-1);
        if (!previous) {
            this.samples.push({ ...point, s });
            return;
        }
        const steps = Math.ceil(s - previous.s);
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            this.samples.push({
                x: previous.x + (point.x - previous.x) * t,
                y: previous.y + (point.y - previous.y) * t,
                s: previous.s + (s - previous.s) * t
            });
        }
    }
    pointAt(s: number): Point {
        const first = this.samples[0] ?? {
            x: 0,
            y: 0,
            s: 0
        };
        if (s <= 0)
            return { x: first.x, y: first.y };
        let low = 1;
        let high = this.samples.length - 1;
        while (low < high) {
            const middle = (low + high) >>> 1;
            if ((this.samples[middle]?.s ?? 0) < s)
                low = middle + 1;
            else
                high = middle;
        }
        const a = this.samples[low - 1];
        const b = this.samples[low];
        if (a && b && s <= b.s) {
            const t = (s - a.s) / (b.s - a.s);
            return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        }
        const end = this.samples.at(-1) ?? first;
        return { x: end.x, y: end.y };
    }
    tangent(s: number): Point {
        const a = this.pointAt(Math.max(0, s - 0.1));
        const b = this.pointAt(Math.min(this.length, s + 0.1));
        const distance = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        return { x: (b.x - a.x) / distance, y: (b.y - a.y) / distance };
    }
}
export function difficulty(level: number) {
    if (!Number.isInteger(level) || level < 0 || level >= 30)
        throw new RangeError('Niveau invalide');
    return {
        colors: 3 + Math.floor(level / 8),
        quota: 24 + level * 2,
        speed: 4 + level * 0.16,
        length: 1050 - level * 5,
        bonusEvery: 6 + Math.floor(level / 4)
    };
}
export function levelAt(level: number) {
    const d = difficulty(level), stage = Math.floor(level / 4), shape = level % 8;
    const bonuses: Bonus[] = ([
        'slow',
        'reverse',
        'bomb',
        'aim'
    ] as Bonus[]).slice(0, Math.min(4, stage));
    const paths = [new Path(controls[shape] ?? [], d.length)];
    if (level >= 28) {
        paths.length = 0;
        for (const x of [30, 260])
            paths.push(new Path(twinLane(x), d.length));
    }
    return {
        ...d,
        name: level >= 28 ? 'Rails jumeaux' : shapes[shape] ?? '',
        shape,
        paths,
        bonuses,
        shooter: { x: level >= 28 ? 190 : level >= 24 ? 210 : 180, y: 350 },
        tunnels: level >= 20 ? [[d.length * .36, d.length * .43] as const] : [],
        acceleration: level >= 24 ? 1.8 : 1.4,
        mechanics: [
            'chaîne',
            ...(level >= 4 ? ['Ralentir'] : []),
            ...(level >= 8 ? ['Reculer'] : []),
            ...(level >= 12 ? ['Bombe'] : []),
            ...(level >= 16 ? ['Viser'] : []),
            ...(level >= 20 ? ['tunnels'] : []),
            ...(level >= 24 ? ['décentrage et accélération'] : []),
            ...(level >= 28 ? ['deux colliers'] : [])
        ]
    };
}
export const LEVELS = Array.from({ length: 30 }, (_, i) => ({ name: levelAt(i).name }));
