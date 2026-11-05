import { FIXED, HEIGHT, IDLE, TILE, WIDTH, type Engine } from '../../engines/petits-pompiers/engine';
import { UNIT } from './art';
import { HH, HW, MAP as ISO_MAP, WORLD, cell, cellAt, direction, point } from './iso';
import { contextualAction, forkEngine } from './controls';
export interface Box { x: number; y: number; width: number; height: number }
export interface View { x: number; y: number; scale: number }
export const worldBox: Box = { x: 0, y: 112, width: 360, height: 528 };
/** The canvas the map is drawn in: `top` is where the HUD ends (the map runs under it, edge to edge). */
export interface Frame { width: number; height: number; top: number }
export const FIXED_FRAME: Frame = { width: 360, height: 640, top: 112 };
/** A tile stays at least this wide on screen (CSS px): large enough for a child's finger.
 *  The iso diamond (2·UNIT × UNIT) keeps the area of the former UNIT × UNIT square. */
export const MIN_TILE_PX = 44;
const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));
/** Map zoom for a frame: tiles at least MIN_TILE_PX, the whole map when the screen is large enough. */
export function mapScale(frame: Frame): number {
    if (frame === FIXED_FRAME) return 2.2;
    const width = ISO_MAP.right - ISO_MAP.left + 2 * HW, height = ISO_MAP.bottom - ISO_MAP.top + 2 * HH;
    return Math.max(MIN_TILE_PX / UNIT, Math.min(frame.width / width, (frame.height - frame.top) / height));
}
/** Player's feet in iso world units. */
export function playerPoint(e: Engine): { x: number; y: number } { return point(e.player.x, e.player.y); }
/** World coordinates stay unchanged; only the images and dynamic layer move.
 *  The camera follows the player inside the part of the frame under the HUD, and never leaves the decorated ring. */
export function cameraView(e: Engine, previous?: View, reduced = false, frame: Frame = FIXED_FRAME): View {
    const scale = mapScale(frame), p = playerPoint(e);
    // Aim at the body, not the feet: the helmet stands about 37 units above the ground point.
    const fit = (target: number, size: number, low: number, high: number): number => size * scale <= high - low ? low + (high - low - size * scale) / 2 : clamp(target, high - size * scale, low);
    const x = fit(frame.width / 2 - p.x * scale, WORLD.width, 0, frame.width);
    const y = fit((frame.top + frame.height) / 2 - (p.y - 18) * scale, WORLD.height, 0, frame.height);
    const blend = previous && !reduced ? .18 : 1;
    return { x: (previous?.x ?? x) + (x - (previous?.x ?? x)) * blend, y: (previous?.y ?? y) + (y - (previous?.y ?? y)) * blend, scale };
}
export function onScreen(view: View, p: { x: number; y: number }) { return { x: view.x + p.x * view.scale, y: view.y + p.y * view.scale }; }
export function edgeGuide(e: Engine, view: View, frame: Frame = FIXED_FRAME): { x: number; y: number; angle: number; outside: boolean } {
    const goal = onScreen(view, cell(e.nextObjective().at)), center = { x: frame.width / 2, y: (frame.top + frame.height) / 2 };
    const dx = goal.x - center.x, dy = goal.y - center.y;
    const ratio = Math.min(1, (frame.width / 2 - 22) / Math.max(1, Math.abs(dx)), ((frame.height - frame.top) / 2 - 26) / Math.max(1, Math.abs(dy)));
    const player = onScreen(view, playerPoint(e));
    return { x: center.x + dx * ratio, y: center.y + dy * ratio, angle: Math.atan2(goal.y - player.y, goal.x - player.x), outside: ratio < 1 };
}
export function hudLayout(e: Engine): { id: string; box: Box; text: string; done: boolean }[] {
    const objectives = ['extinguish', 'rescue_person', 'rescue_animal', 'heal'] as const;
    const visible = objectives.filter(id => (e.level.objectives[id] ?? 0) > 0);
    const width = 344 / visible.length;
    const cells: { id: string; box: Box; text: string; done: boolean }[] = visible.map((id, i) => ({ id, box: { x: 8 + i * width, y: 8, width: width - 5, height: 50 }, text: `${String(e.progress[id])}/${String(e.level.objectives[id])}`, done: e.progress[id] >= (e.level.objectives[id] ?? 0) }));
    cells.push({ id: 'water', box: { x: 8, y: 66, width: 154, height: 34 }, text: '', done: false });
    if (e.mode === 'defi') {
        cells.push({ id: 'hearts', box: { x: 170, y: 66, width: 90, height: 34 }, text: '♥'.repeat(Math.max(0, e.player.hearts)), done: false });
        cells.push({ id: 'time', box: { x: 268, y: 66, width: 84, height: 34 }, text: `⏱ ${String(Math.max(0, Math.ceil(e.level.seconds - e.time / 1000)))}`, done: false });
    }
    return cells;
}
/** Probe the actual job, including target and ray obstruction, rather than distance alone. */
export function tutorialAction(e: Engine, context = contextualAction(e)): boolean {
    if (e.job || e.status !== 'playing') return false;
    const guide = e.nextObjective();
    if (guide.type === 'exit' || guide.type === 'tool') return false;
    const copy = forkEngine(e); copy.previous = { ...IDLE }; copy.input({ ...IDLE, action: true }); copy.step(FIXED);
    const job = copy.job; if (!job || job.kind !== context) return false;
    if (guide.type === 'extinguish') return (context === 'spray' || context === 'foam') && waterEnd(e).at === guide.at;
    const wanted = { safe: 'deposit', rescue_person: 'pickup', rescue_animal: 'pickup', ladder: 'climb', heal: 'heal', break: 'break', refill: 'refill', call: 'call' };
    if (wanted[guide.type] !== context) return false;
    if (context === 'call') return copy.victims.some(v => !v.saved && v.at === guide.at && !v.upper && !v.injured && v.kind === 'person') && Math.abs(e.at % WIDTH - guide.at % WIDTH) + Math.abs(Math.floor(e.at / WIDTH) - Math.floor(guide.at / WIDTH)) <= 4;
    const target = ['pickup', 'heal', 'climb'].includes(context) ? (copy.victims[job.target]?.at ?? -100) + (context === 'climb' ? WIDTH : 0) : job.target;
    return target === guide.at;
}
/** Same tile ray, range and first-fire/obstacle stop as Engine.wet. The end point is in iso world units. */
export function waterEnd(e: Engine): { at: number; x: number; y: number } {
    const range = e.job?.kind === 'foam' || !e.job && e.equipped === 'foam' ? 1 : (e.character === 'panda' ? 4 : 3);
    let at = e.at;
    for (let n = 0; n <= range; n++) {
        const x = Math.floor(e.player.x / TILE) + e.player.dx * n, y = Math.floor(e.player.y / TILE) + e.player.dy * n;
        if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) break;
        at = y * WIDTH + x;
        if (e.fires.some(f => f.at === at)) break;
        if (n > 0 && e.solid(at)) { const p = cell(at), d = direction(e.player.dx, e.player.dy); return { at, x: p.x - d.x * HW / 2, y: p.y - d.y * HW / 2 }; }
    }
    return { at, ...cell(at) };
}
/** Screen point (canvas px) → the map cell drawn there, or -1: the inverse of the iso projection. */
export function cellOnScreen(view: View, x: number, y: number): number { return cellAt((x - view.x) / view.scale, (y - view.y) / view.scale); }
