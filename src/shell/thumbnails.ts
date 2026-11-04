import type { Thumbnail } from '../games/thumbnail';
import { useSurfaces, type SurfaceFactory } from '../games/thumbnail-art';
export interface ThumbnailPorts {
    request(callback: (time: number) => void): number;
    cancel(id: number): void;
    observe(canvas: HTMLCanvasElement, change: (visible: boolean) => void): () => void;
    visibility(change: () => void): () => void;
    hidden(): boolean;
    reduced(): boolean;
    motion(change: () => void): () => void;
    ratio: number;
    /** Where baked thumbnail layers are painted (the page: canvases). */
    surfaces?: SurfaceFactory;
}
/** Baked thumbnail layers are page canvases, created once per key. */
const canvasSurfaces: SurfaceFactory = (w, h) => {
    const image = document.createElement('canvas'); image.width = w; image.height = h;
    const context = image.getContext('2d');
    if (!context) throw new Error('Contexte 2D absent');
    return { context, image: () => image };
};
export function browserThumbnailPorts(): ThumbnailPorts {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    return {
        request: cb => requestAnimationFrame(cb), cancel: id => { cancelAnimationFrame(id); },
        observe(canvas, change) {
            const observer = new IntersectionObserver(entries => { for (const e of entries) change(e.isIntersecting); });
            observer.observe(canvas); return () => { observer.disconnect(); };
        },
        visibility(change) { document.addEventListener('visibilitychange', change); return () => { document.removeEventListener('visibilitychange', change); }; },
        motion(change) { media.addEventListener('change', change); return () => { media.removeEventListener('change', change); }; },
        hidden: () => document.hidden, reduced: () => media.matches, ratio: window.devicePixelRatio,
        surfaces: canvasSurfaces,
    };
}
/** No scheduled callbacks survive suspension or disposal. First paint waits for intersection. */
export function startThumbnail(canvas: HTMLCanvasElement, demo: Thumbnail, ports: ThumbnailPorts, painted: () => void): { stop(): void } {
    if (ports.surfaces) useSurfaces(ports.surfaces);
    const ratio = Math.min(2, Math.max(1, ports.ratio || 1));
    canvas.width = Math.round(160 * ratio); canvas.height = Math.round(120 * ratio);
    const context = canvas.getContext('2d');
    let visible = false, stopped = false, drawn = false, pending: number | undefined, last: number | undefined;
    const active = (): boolean => !stopped && visible && !ports.hidden();
    const paint = (): void => {
        if (!context) return;
        context.setTransform(ratio, 0, 0, ratio, 0, 0); demo.draw(context); painted(); drawn = true;
    };
    const cancel = (): void => { if (pending !== undefined) ports.cancel(pending); pending = undefined; last = undefined; };
    const frame = (time: number): void => {
        pending = undefined;
        if (!active() || ports.reduced()) return;
        if (last === undefined || time - last >= 1000 / 15) {
            demo.step(); paint(); last = time;
        }
        pending = ports.request(frame);
    };
    const sync = (): void => {
        cancel();
        if (!active()) return;
        if (ports.reduced()) { if (!drawn) { demo.step(); paint(); } }
        else pending = ports.request(frame);
    };
    const unobserve = ports.observe(canvas, value => { visible = value; sync(); });
    const unvisibility = ports.visibility(sync), unmotion = ports.motion(sync);
    return { stop() { stopped = true; cancel(); unobserve(); unvisibility(); unmotion(); } };
}
