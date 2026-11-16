/** Screen plan of Ferraille as a full-screen game (canvas px = CSS px).
 *  The scene still draws in its logical world: the HUD box in the band y < 112, the play field below it, 528 px
 *  tall. Two cameras show them: the HUD camera at its own zoom, the field camera at the zoom that fits the field's
 *  height. A wider screen shows more of the level ahead (`span`, logical px), never fewer than 360 px. */
export interface Rect { x: number; y: number; w: number; h: number }
export interface FerraillePlan { width: number; height: number; hud: Rect; hudZoom: number; field: Rect; zoom: number; span: number }
export const HUD_BAND = { width: 360, height: 112 } as const;
export const FIELD_HEIGHT = 528;
export const MIN_SPAN = 360, MAX_SPAN = 1080;
/** The shell's ⏸ sits at the top right of the screen on phones; the HUD leaves it room. */
const PAUSE_CORNER = 60;
export function ferraillePlan(width: number, height: number, pauseCorner = false): FerraillePlan {
    const w = Math.max(240, width), h = Math.max(200, height);
    let hudZoom: number, avail: Rect;
    if (w >= 600 && w > h * 1.4) {
        // Wide and short: the HUD box stands at the top left, the field takes the full height beside it.
        hudZoom = Math.min(1, w * 0.3 / HUD_BAND.width, h / HUD_BAND.height);
        const hw = HUD_BAND.width * hudZoom;
        avail = { x: hw, y: 0, w: w - hw, h };
    } else {
        hudZoom = Math.min(1.6, (w - (pauseCorner ? PAUSE_CORNER : 0)) / HUD_BAND.width);
        const hh = HUD_BAND.height * hudZoom;
        avail = { x: 0, y: hh, w, h: h - hh };
    }
    const hud = { x: 0, y: 0, w: HUD_BAND.width * hudZoom, h: HUD_BAND.height * hudZoom };
    let zoom = avail.h / FIELD_HEIGHT, span = avail.w / zoom;
    if (span < MIN_SPAN) { span = MIN_SPAN; zoom = avail.w / MIN_SPAN; }
    span = Math.min(MAX_SPAN, span);
    const fw = span * zoom, fh = FIELD_HEIGHT * zoom;
    const field = { x: avail.x + (avail.w - fw) / 2, y: avail.y + (avail.x > 0 ? (avail.h - fh) / 2 : 0), w: fw, h: fh };
    return { width: w, height: h, hud, hudZoom, field, zoom, span };
}
