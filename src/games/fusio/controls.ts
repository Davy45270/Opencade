import type { Direction } from '../../engines/fusio/rules';
/** Input mapping of Fusio, pure (AC11): keys, swipes and the four buttons all give the same Direction. */
export type KeyAction = { type: 'move'; direction: Direction } | { type: 'undo' } | { type: 'hint' } | { type: 'restart' };
export interface KeyInput { code: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }
const KEYS: Record<string, Direction> = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    // WASD by physical position: on AZERTY the same keys are Z, Q, S, D.
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
};
/** Arrows and WASD (ZQSD on AZERTY, same physical keys) move; U, Backspace or Ctrl+Z undo; H hint; R restart. */
export function keyAction(e: KeyInput): KeyAction | null {
    if (e.altKey) return null;
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') return { type: 'undo' };
    if (e.ctrlKey || e.metaKey) return null;
    const direction = KEYS[e.code];
    if (direction) return { type: 'move', direction };
    if (e.code === 'KeyU' || e.code === 'Backspace') return { type: 'undo' };
    if (e.code === 'KeyH') return { type: 'hint' };
    if (e.code === 'KeyR') return { type: 'restart' };
    return null;
}
/** A finger swipe of (dx, dy) CSS px: null under `threshold`, or when no axis dominates (a diagonal is refused rather
 * than guessed: the major axis must be at least `ratio` times the minor one). */
export const SWIPE = { threshold: 24, ratio: 1.4 } as const;
export function swipe(dx: number, dy: number, threshold: number = SWIPE.threshold, ratio: number = SWIPE.ratio): Direction | null {
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < threshold) return null;
    if (ax >= ay * ratio) return dx < 0 ? 'left' : 'right';
    if (ay >= ax * ratio) return dy < 0 ? 'up' : 'down';
    return null;
}
/** Touch buttons: id → direction (the fourth way to play). */
export const BUTTON_DIRECTIONS: Record<string, Direction> = { 'fusio-left': 'left', 'fusio-up': 'up', 'fusio-down': 'down', 'fusio-right': 'right' };
