/** Full-screen plan for a game drawn in the former 360 × 640 world: two regions of that world (the HUD and the
 *  board) are shown by two cameras, each at its own zoom, placed side by side or stacked, whichever gives the
 *  board the larger zoom. The drawing code keeps its world coordinates; only the cameras move. Pure, unit-tested. */
export interface Rect { x: number; y: number; w: number; h: number }
/** `view`: screen rectangle (canvas px); `zone`: world rectangle it shows; `zoom`: screen px per world px. */
export interface Shown { view: Rect; zone: Rect; zoom: number }
export interface ZonePlan { width: number; height: number; side: boolean; hud: Shown; board: Shown }
export interface ZoneOptions {
    /** Smallest HUD zoom (readability); the HUD is never drawn smaller than this. */
    minHud?: number;
    /** Largest zoom of either region (a tablet does not blow a phone layout up beyond this). */
    maxZoom?: number;
    /** Width of the top-right corner kept free for the shell's ⏸ (it floats over the canvas on phones);
     *  the corner is PAUSE_HEIGHT tall. Neither the HUD nor the board goes under it. */
    pauseCorner?: number;
}
function shown(zone: Rect, zoom: number, x: number, y: number): Shown {
    return { view: { x, y, w: zone.w * zoom, h: zone.h * zoom }, zone, zoom };
}
export const PAUSE_HEIGHT = 52;
export function planZones(width: number, height: number, hud: Rect, board: Rect, options: ZoneOptions = {}): ZonePlan {
    const w = Math.max(200, width), h = Math.max(200, height);
    const minHud = options.minHud ?? 0.5, maxZoom = options.maxZoom ?? 1.8, corner = options.pauseCorner ?? 0;
    const cornerH = corner > 0 ? PAUSE_HEIGHT : 0;
    type Candidate = { side: boolean; hz: number; bz: number };
    const candidates: Candidate[] = [];
    for (let hz = minHud; hz <= maxZoom + 1e-9; hz += 0.02) {
        // Stacked: HUD on top (beside the ⏸ corner), board under it (and under the corner).
        if (hud.w * hz <= w - corner && Math.max(hud.h * hz, cornerH) < h) {
            const bz = Math.min(maxZoom, w / board.w, (h - Math.max(hud.h * hz, cornerH)) / board.h);
            if (bz > 0) candidates.push({ side: false, hz, bz });
        }
        // Side by side: board on the left at full height, HUD in a right column under the ⏸ corner.
        if (hud.w * hz < w && hud.h * hz + cornerH <= h) {
            const bz = Math.min(maxZoom, (w - hud.w * hz) / board.w, h / board.h);
            if (bz > 0) candidates.push({ side: true, hz, bz });
        }
    }
    if (!candidates.length) candidates.push({ side: false, hz: Math.min(w / hud.w, h / 2 / hud.h), bz: Math.min(w / board.w, h / 2 / board.h) });
    // The board first; then, among plans within 3 % of the best board, the most readable HUD, never drawn more than
    // a quarter larger than the board (a wide screen would otherwise blow the HUD up beside a small board).
    const best = Math.max(...candidates.map(c => c.bz));
    const near = candidates.filter(c => c.bz >= best * 0.97), tame = near.filter(c => c.hz <= Math.max(minHud, c.bz * 1.25));
    const pick = (tame.length ? tame : near).sort((a, b) => b.hz - a.hz || b.bz - a.bz)[0] ?? candidates[0];
    if (!pick) throw new Error('plan');
    const { side, hz, bz } = pick;
    if (side) {
        const hw = hud.w * hz, bw = board.w * bz, bh = board.h * bz, gap = Math.max(0, (w - hw - bw) / 3);
        return { width: w, height: h, side, board: shown(board, bz, gap, (h - bh) / 2), hud: shown(hud, hz, gap * 2 + bw, cornerH + (h - cornerH - hud.h * hz) / 2) };
    }
    const hh = hud.h * hz, bw = board.w * bz;
    return { width: w, height: h, side, hud: shown(hud, hz, Math.max(0, (w - corner - hud.w * hz) / 2), 0), board: shown(board, bz, (w - bw) / 2, Math.max(hh, cornerH)) };
}
/** World point of the HUD or board region to canvas pixels. */
export function toScreen(p: Shown, x: number, y: number): { x: number; y: number } {
    return { x: p.view.x + (x - p.zone.x) * p.zoom, y: p.view.y + (y - p.zone.y) * p.zoom };
}
/** The region rectangle in canvas pixels. */
export function screenRect(p: Shown, r: Rect): Rect {
    const a = toScreen(p, r.x, r.y);
    return { x: a.x, y: a.y, w: r.w * p.zoom, h: r.h * p.zoom };
}
/** Points a camera at its region: viewport, zoom, and the region's centre in the middle. */
export function aim(camera: { setViewport(x: number, y: number, w: number, h: number): unknown; setZoom(z: number): unknown; centerOn(x: number, y: number): unknown }, p: Shown): void {
    camera.setViewport(Math.round(p.view.x), Math.round(p.view.y), Math.max(1, Math.round(p.view.w)), Math.max(1, Math.round(p.view.h)));
    camera.setZoom(p.zoom);
    camera.centerOn(p.zone.x + p.zone.w / 2, p.zone.y + p.zone.h / 2);
}
