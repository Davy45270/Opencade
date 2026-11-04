import type Phaser from 'phaser';
import { drawList, type Animation, type CharacterId, type Expression, type Pose, type Primitive } from '../characters/model';
import { selectedCharacter } from '../characters/selection';
import { renderCharacter } from '../characters/canvas';

/** Catalogue thumbnails reuse the games' own drawing functions, so a card never drifts
 * from the game it opens. Those functions paint on a Phaser Graphics; `canvasGraphics`
 * replays the same calls on a 2D context. `bake` paints once into a cached bitmap: a
 * thumbnail frame then costs a few `drawImage`, never the whole vector drawing again. */
type G = Phaser.GameObjects.Graphics;
type P = { x: number; y: number } | readonly [number, number];
function css(color: number, alpha: number): string {
    const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
    return alpha >= 1 ? `rgb(${String(r)},${String(g)},${String(b)})` : `rgba(${String(r)},${String(g)},${String(b)},${String(Math.max(0, alpha))})`;
}
const px = (p: P): number => 'x' in p ? p.x : p[0];
const py = (p: P): number => 'x' in p ? p.y : p[1];
type Radius = number | { tl?: number; tr?: number; bl?: number; br?: number };
/** The Phaser Graphics subset the games' art uses, painted straight onto `c`. */
export function canvasGraphics(c: CanvasRenderingContext2D): G {
    let fill = 'rgb(0,0,0)', stroke = 'rgb(0,0,0)', width = 1;
    const ellipse = (x: number, y: number, w: number, h: number): void => { c.beginPath(); c.ellipse(x, y, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2); };
    const rounded = (x: number, y: number, w: number, h: number, r: Radius = 20): void => {
        const k = typeof r === 'number' ? { tl: r, tr: r, bl: r, br: r } : { tl: r.tl ?? 0, tr: r.tr ?? 0, bl: r.bl ?? 0, br: r.br ?? 0 };
        const m = Math.min(Math.abs(w), Math.abs(h)) / 2, q = (v: number): number => Math.max(0, Math.min(v, m));
        const tl = q(k.tl), tr = q(k.tr), br = q(k.br), bl = q(k.bl);
        c.beginPath(); c.moveTo(x + tl, y); c.lineTo(x + w - tr, y); c.arcTo(x + w, y, x + w, y + tr, tr);
        c.lineTo(x + w, y + h - br); c.arcTo(x + w, y + h, x + w - br, y + h, br);
        c.lineTo(x + bl, y + h); c.arcTo(x, y + h, x, y + h - bl, bl);
        c.lineTo(x, y + tl); c.arcTo(x, y, x + tl, y, tl); c.closePath();
    };
    const poly = (points: readonly P[], close: boolean): void => {
        c.beginPath(); points.forEach((p, i) => { if (i === 0) c.moveTo(px(p), py(p)); else c.lineTo(px(p), py(p)); }); if (close) c.closePath();
    };
    const doFill = (): void => { c.fillStyle = fill; c.fill(); };
    const doStroke = (): void => { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); };
    const api = {
        fillStyle(color: number, alpha = 1) { fill = css(color, alpha); return api; },
        lineStyle(w: number, color: number, alpha = 1) { width = w; stroke = css(color, alpha); return api; },
        fillRect(x: number, y: number, w: number, h: number) { c.fillStyle = fill; c.fillRect(x, y, w, h); return api; },
        strokeRect(x: number, y: number, w: number, h: number) { c.strokeStyle = stroke; c.lineWidth = width; c.strokeRect(x, y, w, h); return api; },
        fillCircle(x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, Math.abs(r), 0, Math.PI * 2); doFill(); return api; },
        strokeCircle(x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, Math.abs(r), 0, Math.PI * 2); doStroke(); return api; },
        fillEllipse(x: number, y: number, w: number, h: number) { ellipse(x, y, w, h); doFill(); return api; },
        strokeEllipse(x: number, y: number, w: number, h: number) { ellipse(x, y, w, h); doStroke(); return api; },
        fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number) { poly([[x0, y0], [x1, y1], [x2, y2]], true); doFill(); return api; },
        strokeTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number) { poly([[x0, y0], [x1, y1], [x2, y2]], true); doStroke(); return api; },
        fillRoundedRect(x: number, y: number, w: number, h: number, r?: Radius) { rounded(x, y, w, h, r); doFill(); return api; },
        strokeRoundedRect(x: number, y: number, w: number, h: number, r?: Radius) { rounded(x, y, w, h, r); doStroke(); return api; },
        lineBetween(x0: number, y0: number, x1: number, y1: number) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); doStroke(); return api; },
        fillPoints(points: readonly P[]) { poly(points, true); doFill(); return api; },
        strokePoints(points: readonly P[], closeShape = false, closePath = false) { poly(points, closeShape || closePath); doStroke(); return api; },
        beginPath() { c.beginPath(); return api; },
        moveTo(x: number, y: number) { c.moveTo(x, y); return api; },
        lineTo(x: number, y: number) { c.lineTo(x, y); return api; },
        arc(x: number, y: number, r: number, a0: number, a1: number, anticlockwise = false) { c.arc(x, y, Math.abs(r), a0, a1, anticlockwise); return api; },
        closePath() { c.closePath(); return api; },
        fillPath() { doFill(); return api; },
        strokePath() { doStroke(); return api; },
        save() { c.save(); return api; },
        restore() { c.restore(); return api; },
        translateCanvas(x: number, y: number) { c.translate(x, y); return api; },
        scaleCanvas(x: number, y: number) { c.scale(x, y); return api; },
        rotateCanvas(a: number) { c.rotate(a); return api; },
        clear() { return api; },
    };
    return new Proxy(api, {
        get(target, key) {
            if (key in target) return Reflect.get(target, key) as unknown;
            throw new Error(`canvasGraphics: ${String(key)} n'est pas pris en charge`);
        },
    }) as unknown as G;
}
/** A raster surface: a 2D context to paint into, and the image to draw it with (live, for a canvas). */
export interface Surface { context: CanvasRenderingContext2D; image(): CanvasImageSource }
export type SurfaceFactory = (w: number, h: number, key: string) => Surface;
let factory: SurfaceFactory | null = null;
const cache = new Map<string, CanvasImageSource>();
/** Install where baked bitmaps come from: the home page installs canvases (shell/thumbnails.ts),
 * a test harness installs its own. Without one, `bake` paints the drawing on every call. */
export function useSurfaces(next: SurfaceFactory | null): void { if (next !== factory) { factory = next; cache.clear(); } }
/** A surface from the installed factory, or null when none is installed. */
export function surface(w: number, h: number, key = ''): Surface | null { return factory ? factory(w, h, key) : null; }
/** Paint `paint` (logical size w × h, `resolution` pixels per unit) once under `key`, then show
 * the cached bitmap at (x, y). Without an installed surface factory it paints `fallback`
 * (default: `paint`) at (x, y) on every call. */
export function bake(c: CanvasRenderingContext2D, key: string, x: number, y: number, w: number, h: number, resolution: number, paint: (c: CanvasRenderingContext2D) => void, fallback: (c: CanvasRenderingContext2D) => void = paint): void {
    let image = cache.get(key);
    if (!image) {
        const s = surface(Math.max(1, Math.ceil(w * resolution)), Math.max(1, Math.ceil(h * resolution)), key);
        if (!s) { c.save(); c.translate(x, y); fallback(c); c.restore(); return; }
        s.context.scale(resolution, resolution); paint(s.context);
        image = s.image(); cache.set(key, image);
    }
    c.drawImage(image, x, y, w, h);
}
/** Same as `bake`, painting with the game's Phaser-style art functions. */
export function bakeArt(c: CanvasRenderingContext2D, key: string, x: number, y: number, w: number, h: number, resolution: number, paint: (g: G) => void, fallback: (g: G) => void = paint): void {
    bake(c, key, x, y, w, h, resolution, k => { paint(canvasGraphics(k)); }, k => { fallback(canvasGraphics(k)); });
}
/** A cast drawing (character, vehicle, emblem…) baked once per key, shown in a size × size box
 * whose top left is (x, y); `flip` mirrors it horizontally. */
export function sprite(c: CanvasRenderingContext2D, key: string, list: () => readonly Primitive[], x: number, y: number, size: number, resolution: number, flip = false): void {
    const px = Math.max(8, Math.ceil(size * resolution));
    if (flip) { c.save(); c.translate(x + size, y); c.scale(-1, 1); x = 0; y = 0; }
    bake(c, `sprite-${key}-${String(px)}`, x, y, size, size, px / size, k => { renderCharacter(k, list(), 0, 0, size); });
    if (flip) c.restore();
}
/** The hero the player chose: the card shows the same character as the game. */
export function thumbnailHero(): CharacterId { return selectedCharacter(); }
const WALK_FRAME_MS = Math.PI * 2 * 210 / 8;
/** The game's own character drawing, baked per frame of an 8-frame cycle (a walk cycle lasts 8 frames). */
export function castSprite(c: CanvasRenderingContext2D, id: CharacterId, pose: Pose, expression: Expression, animation: Animation, frame: number, x: number, y: number, size: number, resolution: number, flip = false): void {
    const f = ((Math.floor(frame) % 8) + 8) % 8;
    sprite(c, `${id}-${pose}-${expression}-${animation}-${String(f)}`, () => drawList(id, pose, expression, animation, f * WALK_FRAME_MS), x, y, size, resolution, flip);
}
