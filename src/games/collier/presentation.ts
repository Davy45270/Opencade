import type { Point } from '../../engines/collier/levels';
import type { Engine } from '../../engines/collier/engine';

export const themes = [
    { name: 'Cirque Tutu', sky: 0x672653, light: 0xffedbf, accent: 0xf45eaa },
    { name: 'Jungle des bananes', sky: 0x145e55, light: 0xe9ffc5, accent: 0xffd65c },
    { name: 'Fête foraine de nuit', sky: 0x25215f, light: 0xe5deff, accent: 0xff87c5 },
    { name: 'Ciel arc-en-ciel', sky: 0x609fd7, light: 0xfff5db, accent: 0xfca2ce }
] as const;
export function themeIndex(level: number): number {
    return Math.min(3, Math.floor(level / 8));
}
/** Uniform fit includes the shooter and both lanes, with room for actors. */
function calculateView(config: Engine['config']) {
    const points = config.paths.flatMap(p => p.samples);
    const left = Math.min(...points.map(p => p.x), config.shooter.x - 30);
    const right = Math.max(...points.map(p => p.x), config.shooter.x + 65);
    const top = Math.min(...points.map(p => p.y), config.shooter.y - 60);
    const bottom = Math.max(...points.map(p => p.y), config.shooter.y + 55);
    const scale = Math.min(312 / (right - left), 456 / (bottom - top));
    return { scale, x: 180 - (left + right) / 2 * scale, y: 285 - (top + bottom) / 2 * scale };
}
const views = new WeakMap<Engine['config'], ReturnType<typeof calculateView>>();
export function fieldView(config: Engine['config']) {
    let view = views.get(config);
    if (!view) {
        view = calculateView(config);
        views.set(config, view);
    }
    return view;
}
export function logicalPoint(point: Point, view: ReturnType<typeof fieldView>): Point {
    return { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale };
}
/** The aim ring sits outside the entire face; held beads stay below it. */
export function shooterLayout(o: Point, angle: number, scale: number) {
    const size = 60 / scale;
    return {
        size,
        head: { x: o.x, y: o.y - size * .13, rx: size * .38, ry: size * .35 },
        arrow: { x: o.x + Math.cos(angle) * size * .85, y: o.y + Math.sin(angle) * size * .85 },
        current: { x: o.x - size * .22, y: o.y + size * .55 },
        next: { x: o.x + 44, y: o.y + 35 },
        radius: 11.5 / scale
    };
}
/** Distinct silhouettes stay readable at the smallest phone bead size. */

