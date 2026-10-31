import { startThumbnail, type ThumbnailPorts } from '../src/shell/thumbnails';
import { createThumbnail } from '../src/games/bombercade/thumbnail';
/** Small deterministic occupancy raster of the real Canvas draw commands. */
export function thumbnailMotion(): void {
    const pixels = new Uint16Array(160 * 120), previous = new Uint16Array(160 * 120);
    let paint = 0, tx = 0, ty = 0, scale = 1, bounds = [Infinity, Infinity, -Infinity, -Infinity];
    const stack: number[][] = [];
    const include = (x: number, y: number): void => { const px = tx + x * scale, py = ty + y * scale;
        bounds = [Math.min(bounds[0] ?? Infinity, px), Math.min(bounds[1] ?? Infinity, py), Math.max(bounds[2] ?? -Infinity, px), Math.max(bounds[3] ?? -Infinity, py)]; };
    const fill = (x: number, y: number, w: number, h: number): void => {
        const left = Math.max(0, Math.floor(x)), right = Math.min(160, Math.ceil(x + w));
        for (let row = Math.max(0, Math.floor(y)); row < Math.min(120, Math.ceil(y + h)); row++) if (right > left) pixels.fill(paint, row * 160 + left, row * 160 + right);
    };
    const context = {
        save() { stack.push([tx, ty, scale, paint]); }, restore() { const s = stack.pop(); if (s) [tx, ty, scale, paint] = [s[0] ?? 0, s[1] ?? 0, s[2] ?? 1, s[3] ?? 0]; },
        translate(x: number, y: number) { tx += x * scale; ty += y * scale; }, scale(x: number) { scale *= x; },
        set fillStyle(color: string) { paint = Array.from(color).reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 65000, 1); },
        set strokeStyle(color: string) { this.fillStyle = color; },
        beginPath() { bounds = [Infinity, Infinity, -Infinity, -Infinity]; },
        fillRect(x: number, y: number, w: number, h: number) { fill(tx + x * scale, ty + y * scale, w * scale, h * scale); },
        arc(x: number, y: number, r: number) { include(x - r, y - r); include(x + r, y + r); },
        ellipse(x: number, y: number, rx: number, ry: number) { include(x - rx, y - ry); include(x + rx, y + ry); },
        moveTo: include, lineTo: include,
        bezierCurveTo(a: number, b: number, c: number, d: number, x: number, y: number) { include(a, b); include(c, d); include(x, y); },
        closePath() {},
        fill() { const [x = 0, y = 0, right = 0, bottom = 0] = bounds; if (Number.isFinite(x)) fill(x, y, right - x, bottom - y); },
        stroke() { this.fill(); },
    };
    const demo = createThumbnail(28); let still = 0;
    for (let tick = 0; tick < 2000; tick++) {
        demo.step(); if (tick % 3 !== 0) continue; demo.draw(context as unknown as CanvasRenderingContext2D);
        let changed = false;
        for (let y = 8; y < 112 && !changed; y++) for (let x = 36; x < 124; x++) { const i = y * 160 + x; if (pixels[i] !== previous[i]) { changed = true; break; } } still = changed ? 0 : still + 3;
        if (still >= 9) throw new Error('B14 image figée pendant 600 ms à 15 Hz'); previous.set(pixels);
    }
}

/** The actual Bombercade drawing under the same lifecycle used by every home card. */
export function thumbnailLifecycle(): void {
    const callbacks = new Map<number, (time: number) => void>();
    let serial = 0, reduced = true, frames = 0, commands = 0;
    let intersection: (value: boolean) => void = () => {};
    let motion: () => void = () => {};
    const context = new Proxy({}, {
        get: () => () => { commands++; }, set: () => true,
    }) as CanvasRenderingContext2D;
    const canvas = { getContext: () => context, width: 0, height: 0 } as unknown as HTMLCanvasElement;
    const ports: ThumbnailPorts = {
        request: cb => { callbacks.set(++serial, cb); return serial; }, cancel: id => { callbacks.delete(id); },
        observe: (_canvas, cb) => { intersection = cb; return () => {}; },
        visibility: () => () => {}, hidden: () => false, reduced: () => reduced,
        motion: cb => { motion = cb; return () => {}; }, ratio: 1,
    };
    const tick = (time: number): void => { const batch = [...callbacks.values()]; callbacks.clear(); batch.forEach(cb => { cb(time); }); };
    const assert = (condition: boolean): void => { if (!condition) throw new Error('Cycle de vignette Bombercade'); };
    let controller = startThumbnail(canvas, createThumbnail(), ports, () => { frames++; });
    assert(frames === 0); // Off-screen previews intentionally do not paint.
    intersection(true); assert(frames === 1 && commands > 100);
    const fixed = commands; tick(600); motion(); intersection(false); intersection(true);
    assert(frames === 1 && commands === fixed && callbacks.size === 0);
    reduced = false; motion(); tick(700); assert(frames === 2);
    intersection(false); tick(800); assert(frames === 2 && callbacks.size === 0);
    intersection(true); tick(900); assert(frames === 3);
    controller.stop(); tick(1000); intersection(true); assert(frames === 3 && callbacks.size === 0);
    controller = startThumbnail(canvas, createThumbnail(), ports, () => { frames++; });
    intersection(true); tick(1100); assert(frames === 4); controller.stop();
}
