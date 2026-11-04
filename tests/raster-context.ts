import type { SurfaceFactory } from '../src/games/thumbnail-art';
/** Test surfaces for baked thumbnail layers: the drawing runs once into a context that discards it,
 * and the layer is then drawn as a marker image ({ baked: key }) that rasterContext paints as a keyed box. */
export function testSurfaces(): SurfaceFactory {
    const sink: unknown = new Proxy({}, { get: (_t, key) => key === 'createLinearGradient' || key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => undefined, set: () => true });
    return (w, h, key) => { const image = { baked: key || `${String(w)}x${String(h)}` }; return { context: sink as CanvasRenderingContext2D, image: () => image as unknown as CanvasImageSource }; };
}
/** A small deterministic occupancy raster of real 2D draw commands, for thumbnail motion checks
 * without a browser: each fill or stroke paints the transformed bounding box of its shape with a
 * colour id. Any other method is accepted and ignored (images are baked only in browsers). */
export function rasterContext(width = 160, height = 120): { context: CanvasRenderingContext2D; pixels: Uint16Array } {
    const pixels = new Uint16Array(width * height);
    type Six = [number, number, number, number, number, number]; type Four = [number, number, number, number];
    let m: Six = [1, 0, 0, 1, 0, 0], paint = 1, box: Four = [Infinity, Infinity, -Infinity, -Infinity];
    const stack: { m: Six; paint: number }[] = [], palette = new Map<string, number>();
    const colour = (value: unknown): number => {
        const key = String(value);
        if (!palette.has(key)) palette.set(key, palette.size + 1);
        return palette.get(key) ?? 1;
    };
    const include = (x: number, y: number): void => {
        const px = m[0] * x + m[2] * y + m[4], py = m[1] * x + m[3] * y + m[5];
        box = [Math.min(box[0], px), Math.min(box[1], py), Math.max(box[2], px), Math.max(box[3], py)];
    };
    const fillBox = (): void => {
        const [x0, y0, x1, y1] = box;
        if (!Number.isFinite(x0)) return;
        for (let y = Math.max(0, Math.floor(y0)); y < Math.min(height, Math.ceil(y1)); y++)
            for (let x = Math.max(0, Math.floor(x0)); x < Math.min(width, Math.ceil(x1)); x++) pixels[y * width + x] = paint;
    };
    const multiply = (a: number, b: number, c: number, d: number, e: number, f: number): void => {
        m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]];
    };
    const api: Record<string, unknown> = {
        save() { stack.push({ m: [...m] as Six, paint }); },
        restore() { const s = stack.pop(); if (s) { m = s.m; paint = s.paint; } },
        translate(x: number, y: number) { multiply(1, 0, 0, 1, x, y); },
        scale(x: number, y: number) { multiply(x, 0, 0, y, 0, 0); },
        rotate(a: number) { multiply(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0); },
        transform(a: number, b: number, c: number, d: number, e: number, f: number) { multiply(a, b, c, d, e, f); },
        setTransform(a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) { m = [a, b, c, d, e, f]; },
        beginPath() { box = [Infinity, Infinity, -Infinity, -Infinity]; },
        moveTo: include, lineTo: include,
        arcTo(x1: number, y1: number, x2: number, y2: number) { include(x1, y1); include(x2, y2); },
        quadraticCurveTo(a: number, b: number, x: number, y: number) { include(a, b); include(x, y); },
        bezierCurveTo(a: number, b: number, c: number, d: number, x: number, y: number) { include(a, b); include(c, d); include(x, y); },
        arc(x: number, y: number, r: number) { include(x - r, y - r); include(x + r, y + r); },
        ellipse(x: number, y: number, rx: number, ry: number) { include(x - rx, y - ry); include(x + rx, y + ry); },
        rect(x: number, y: number, w: number, h: number) { include(x, y); include(x + w, y + h); },
        roundRect(x: number, y: number, w: number, h: number) { include(x, y); include(x + w, y + h); },
        fill() { fillBox(); }, stroke() { fillBox(); },
        fillRect(x: number, y: number, w: number, h: number) { box = [Infinity, Infinity, -Infinity, -Infinity]; include(x, y); include(x + w, y); include(x, y + h); include(x + w, y + h); fillBox(); },
        strokeRect(x: number, y: number, w: number, h: number) { (api.fillRect as (x: number, y: number, w: number, h: number) => void)(x, y, w, h); },
        drawImage(image: unknown, x: number, y: number, w: number, h: number) { paint = colour(image instanceof Object && 'baked' in image ? `baked-${String(image.baked)}` : image); (api.fillRect as (x: number, y: number, w: number, h: number) => void)(x, y, w, h); },
        createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    };
    const context = new Proxy(api, {
        get: (target, key) => key in target ? target[key as string] : () => undefined,
        set: (target, key, value) => { if (key === 'fillStyle' || key === 'strokeStyle') paint = colour(value); target[key as string] = value; return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { context, pixels };
}
