import { startThumbnail, type ThumbnailPorts } from '../src/shell/thumbnails';
import { createThumbnail } from '../src/games/bombercade/thumbnail';
import { rasterContext, testSurfaces } from './raster-context';
import { useSurfaces } from '../src/games/thumbnail-art';
/** Small deterministic occupancy raster of the real Canvas draw commands. */
export function thumbnailMotion(): void {
    useSurfaces(testSurfaces());
    const { context, pixels } = rasterContext(), previous = new Uint16Array(160 * 120);
    const demo = createThumbnail(28); let still = 0;
    for (let tick = 0; tick < 2000; tick++) {
        demo.step(); if (tick % 3 !== 0) continue; demo.draw(context);
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
