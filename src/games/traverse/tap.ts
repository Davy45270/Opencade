import { swipeDirection, type Direction } from '../../shell/gestures';

/** A finger that stays still steps forward on release, or at the latest this long after landing. */
export const TAP_STEP_MS = 90;
/** Sideways (or backwards) travel beyond this, before the step, means a swipe: never a forward step. */
export const TAP_SLOP_PX = 10;
/** A swipe this long gives its direction at once. */
export const SWIPE_PX = 20;

export interface TapGesture { x: number; y: number; t: number; acted: boolean; offAxis: boolean }

export function land(x: number, y: number, t: number): TapGesture {
    return { x, y, t, acted: false, offAxis: false };
}
function travel(g: TapGesture, x: number, y: number): void {
    const dx = x - g.x, dy = y - g.y;
    // Upwards travel is still a forward step; sideways or downwards travel is the start of a swipe.
    if (Math.abs(dx) > TAP_SLOP_PX || dy > TAP_SLOP_PX) g.offAxis = true;
}
/** The finger moved: a long enough swipe acts now (once per gesture). */
export function slide(g: TapGesture, x: number, y: number): Direction | null {
    if (g.acted) return null;
    travel(g, x, y);
    const d = swipeDirection(x - g.x, y - g.y, SWIPE_PX);
    if (d) g.acted = true;
    return d;
}
/** Time passed with the finger down: a still finger steps forward once TAP_STEP_MS have elapsed. */
export function due(g: TapGesture, t: number): boolean {
    if (g.acted || g.offAxis || t - g.t < TAP_STEP_MS) return false;
    g.acted = true;
    return true;
}
/** The finger lifted: a swipe gives its direction, a still finger steps forward, a short slide gives nothing. */
export function lift(g: TapGesture, x: number, y: number): Direction | null {
    if (g.acted) return null;
    travel(g, x, y);
    g.acted = true;
    return swipeDirection(x - g.x, y - g.y, SWIPE_PX) ?? (g.offAxis ? null : 'up');
}
