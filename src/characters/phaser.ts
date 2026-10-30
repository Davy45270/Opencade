import type Phaser from 'phaser';
import type { Point, Primitive } from './model';

/** Vector tessellation grows with destination size; never uses a cached texture. Does not clear the caller's graphics. */
export function renderCharacter(graphics: Phaser.GameObjects.Graphics, list: readonly Primitive[], x = 0, y = 0, height = 240, flip = false, rotation = 0): void {
    const scale = height / 240;
    const segments = Math.max(16, Math.ceil(height / 8));
    const color = (value: string): number => Number.parseInt(value.slice(1), 16);
    for (const p of list) {
        const points: Point[] = [];
        let closed = true;
        if (p.kind === 'ellipse' || p.kind === 'circle') {
            const rx = p.kind === 'circle' ? p.r : p.rx, ry = p.kind === 'circle' ? p.r : p.ry;
            const r = p.kind === 'circle' ? 0 : p.rotation;
            for (let i = 0; i < segments * 2; i++) {
                const a = i * Math.PI / segments, dx = Math.cos(a) * rx, dy = Math.sin(a) * ry;
                points.push([p.x + dx * Math.cos(r) - dy * Math.sin(r), p.y + dx * Math.sin(r) + dy * Math.cos(r)]);
            }
        } else if (p.kind === 'path') {
            closed = p.closed;
            let previous: Point = [0, 0];
            for (const c of p.commands) {
                if (c.op === 'C') {
                    for (let i = 1; i <= segments; i++) {
                        const t = i / segments, s = 1 - t;
                        points.push([s ** 3 * previous[0] + 3 * s * s * t * c.a[0] + 3 * s * t * t * c.b[0] + t ** 3 * c.p[0], s ** 3 * previous[1] + 3 * s * s * t * c.a[1] + 3 * s * t * t * c.b[1] + t ** 3 * c.p[1]]);
                    }
                } else points.push(c.p);
                previous = c.p;
            }
        } else { points.push(...p.points); closed = p.kind === 'polygon'; }
        const vertices = points.map(p => {
            const dx = (flip ? 120 - p[0] : p[0] - 120) * scale, dy = (p[1] - 120) * scale;
            return { x: x + height / 2 + dx * Math.cos(rotation) - dy * Math.sin(rotation), y: y + height / 2 + dx * Math.sin(rotation) + dy * Math.cos(rotation) };
        });
        if (p.fill) { graphics.fillStyle(color(p.fill)); graphics.fillPoints(vertices, true); }
        if (p.width > 0) { graphics.lineStyle(Math.max(p.width * scale, 0.75), color(p.stroke)); graphics.strokePoints(vertices, closed); }
    }
}
