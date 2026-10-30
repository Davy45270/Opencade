import assert from 'node:assert/strict';
import { createThumbnail } from '../src/games/collier/thumbnail';
/** Rasterize the actual final circle layer at the thumbnail's native resolution.
 * Paths/characters are static occluders behind this layer; the sight is drawn last. */
export function createC15(): () => void {
    const demo = createThumbnail(300), pixels = new Uint16Array(160 * 120);
    let sx = 1, sy = 1, tx = 0, ty = 0, fill = '', arc: {
        x: number;
        y: number;
        rx: number;
        ry: number;
    } | null = null;
    const stack: number[][] = [], colors = new Map<string, number>();
    function paint(): void {
        if (!arc)
            return;
        const a = arc, color = colors.get(fill) ?? colors.size + 1;
        colors.set(fill, color);
        for (let y = Math.max(0, Math.floor(a.y - a.ry)); y <= Math.min(119, Math.ceil(a.y + a.ry)); y++)
            for (let x = Math.max(0, Math.floor(a.x - a.rx)); x <= Math.min(159, Math.ceil(a.x + a.rx)); x++)
                if (((x + .5 - a.x) / a.rx) ** 2 + ((y + .5 - a.y) / a.ry) ** 2 <= 1)
                    pixels[y * 160 + x] = color;
    }
    const context = {
        save() {
            stack.push([
                sx,
                sy,
                tx,
                ty
            ]);
        },
        restore() {
            const a = stack.pop();
            if (a) {
                [
                    sx = 1,
                    sy = 1,
                    tx = 0,
                    ty = 0
                ] = a;
            }
        },
        scale(x: number, y: number) {
            sx *= x;
            sy *= y;
        },
        translate(x: number, y: number) {
            tx += x * sx;
            ty += y * sy;
        },
        beginPath() {
            arc = null;
        },
        arc(x: number, y: number, r: number) {
            arc = {
                x: tx + x * sx,
                y: ty + y * sy,
                rx: r * sx,
                ry: r * sy
            };
        },
        fill: paint,
        fillRect() {
            pixels.fill(0);
        },
        moveTo() {
        },
        lineTo() {
        },
        stroke() {
        },
        ellipse() {
            arc = null;
        },
        bezierCurveTo() {
        },
        closePath() {
        },
        set fillStyle(value: string) {
            fill = value;
        },
        set strokeStyle(_value: string) {
        },
        set lineWidth(_value: number) {
        },
        set lineCap(_value: string) {
        },
        set lineJoin(_value: string) {
        }
    } as unknown as CanvasRenderingContext2D;
    let previous = new Uint16Array(pixels.length), unchanged = 0;
    let step = 0;
    return () => {
        for (let i = 0; i < 500; i++, step++) {
            demo.step();
            demo.draw(context);
            unchanged = pixels.every((v, j) => v === previous[j]) ? unchanged + 1 : 0;
            assert.ok(unchanged < 36, `image figée au pas ${String(step)}`);
            previous = pixels.slice();
        }
        if (step === 2000)
            assert.ok(demo.restarts > 0);
    };
}
export function C15(): void {
    const batch = createC15();
    for (let i = 0; i < 4; i++)
        batch();
}
