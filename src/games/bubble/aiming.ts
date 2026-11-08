import { ORIGIN, type Point } from '../../engines/bubble/engine';
/** A finger released on the launcher cancels the shot. */
export const CANCEL_RADIUS = 34;
/** Above this line the finger points at the target, as before. */
export const POINT_LINE = ORIGIN.y - 15;
/** Below this line the finger pulls the sling: the shot leaves the other way, so the board stays visible. */
export const PULL_LINE = ORIGIN.y + 8;
/**
 * What a touch finger does at this board point: point (aim at it), pull (slingshot, aim away from it),
 * cancel (on the launcher) or hold (beside the launcher, between the two lines: the aim stays put).
 */
export type TouchAim = { mode: 'point' | 'pull'; angle: number } | { mode: 'cancel' | 'hold' };
export function touchAim(p: Point): TouchAim {
    if (Math.hypot(p.x - ORIGIN.x, p.y - ORIGIN.y) < CANCEL_RADIUS) return { mode: 'cancel' };
    if (p.y < POINT_LINE) return { mode: 'point', angle: Math.atan2(p.x - ORIGIN.x, ORIGIN.y - p.y) };
    if (p.y > PULL_LINE) return { mode: 'pull', angle: Math.atan2(ORIGIN.x - p.x, p.y - ORIGIN.y) };
    return { mode: 'hold' };
}
