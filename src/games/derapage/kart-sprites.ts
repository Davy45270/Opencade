import type { CharacterId } from '../../characters/model';
import { wrap } from '../../engines/derapage/track';
// Generated with the drawn karts: texture size (px), origin = anchor (fraction of the texture). Every view has the
// same height (driver and kart, which a turn does not change), so the two formats of the drawings share one scale.
// Side views: anchor at the ground under the middle of the wheels. Top view: centre, nose up.
export const KART_SPRITES = {
    panda_back: { w: 73, h: 84, ox: 0.4995, oy: 1.0 },
    panda_backRight: { w: 86, h: 84, ox: 0.4928, oy: 1.0 },
    panda_right: { w: 101, h: 84, ox: 0.5038, oy: 1.0 },
    panda_frontRight: { w: 84, h: 84, ox: 0.5068, oy: 1.0 },
    panda_front: { w: 81, h: 84, ox: 0.5004, oy: 1.0 },
    panda_frontLeft: { w: 83, h: 84, ox: 0.4928, oy: 1.0 },
    panda_left: { w: 101, h: 84, ox: 0.4954, oy: 1.0 },
    panda_backLeft: { w: 86, h: 84, ox: 0.5071, oy: 1.0 },
    panda_top: { w: 52, h: 84, ox: 0.5, oy: 0.5 },
    pandaroux_back: { w: 67, h: 84, ox: 0.4995, oy: 1.0 },
    pandaroux_backRight: { w: 86, h: 84, ox: 0.5005, oy: 1.0 },
    pandaroux_right: { w: 96, h: 84, ox: 0.5584, oy: 1.0 },
    pandaroux_frontRight: { w: 89, h: 84, ox: 0.553, oy: 1.0 },
    pandaroux_front: { w: 67, h: 84, ox: 0.4995, oy: 1.0 },
    pandaroux_frontLeft: { w: 89, h: 84, ox: 0.4637, oy: 1.0 },
    pandaroux_left: { w: 96, h: 84, ox: 0.4407, oy: 1.0 },
    pandaroux_backLeft: { w: 86, h: 84, ox: 0.4985, oy: 1.0 },
    pandaroux_top: { w: 55, h: 84, ox: 0.5, oy: 0.5 },
    dragon_back: { w: 76, h: 84, ox: 0.4995, oy: 1.0 },
    dragon_backRight: { w: 88, h: 84, ox: 0.5241, oy: 1.0 },
    dragon_right: { w: 100, h: 84, ox: 0.5698, oy: 1.0 },
    dragon_frontRight: { w: 94, h: 84, ox: 0.5659, oy: 1.0 },
    dragon_front: { w: 76, h: 84, ox: 0.4995, oy: 1.0 },
    dragon_frontLeft: { w: 91, h: 84, ox: 0.4441, oy: 1.0 },
    dragon_left: { w: 100, h: 84, ox: 0.4294, oy: 1.0 },
    dragon_backLeft: { w: 88, h: 84, ox: 0.475, oy: 1.0 },
    dragon_top: { w: 66, h: 84, ox: 0.5, oy: 0.5 },
    licorne_back: { w: 69, h: 84, ox: 0.4995, oy: 1.0 },
    licorne_backRight: { w: 96, h: 84, ox: 0.5004, oy: 1.0 },
    licorne_right: { w: 104, h: 84, ox: 0.5328, oy: 1.0 },
    licorne_frontRight: { w: 99, h: 84, ox: 0.5099, oy: 1.0 },
    licorne_front: { w: 78, h: 84, ox: 0.4995, oy: 1.0 },
    licorne_frontLeft: { w: 97, h: 84, ox: 0.4887, oy: 1.0 },
    licorne_left: { w: 103, h: 84, ox: 0.4678, oy: 1.0 },
    licorne_backLeft: { w: 94, h: 84, ox: 0.4968, oy: 1.0 },
    licorne_top: { w: 58, h: 84, ox: 0.5, oy: 0.5 },
    singe_back: { w: 68, h: 84, ox: 0.4995, oy: 1.0 },
    singe_backRight: { w: 87, h: 84, ox: 0.4898, oy: 1.0 },
    singe_right: { w: 105, h: 84, ox: 0.5128, oy: 1.0 },
    singe_frontRight: { w: 88, h: 84, ox: 0.5063, oy: 1.0 },
    singe_front: { w: 71, h: 84, ox: 0.4995, oy: 1.0 },
    singe_frontLeft: { w: 87, h: 84, ox: 0.4937, oy: 1.0 },
    singe_left: { w: 103, h: 84, ox: 0.4869, oy: 1.0 },
    singe_backLeft: { w: 85, h: 84, ox: 0.5064, oy: 1.0 },
    singe_top: { w: 58, h: 84, ox: 0.5, oy: 0.5 },
} as const;
export type KartSpriteKey = keyof typeof KART_SPRITES;
/** Views clockwise from the back, by the kart's heading relative to the camera (+π/2 = it drives to screen right, its right side faces us). */
export const KART_VIEWS = ['back', 'backRight', 'right', 'frontRight', 'front', 'frontLeft', 'left', 'backLeft'] as const;
export type KartView = typeof KART_VIEWS[number] | 'top';
/** Mascots with drawn karts (all five); until their chunk arrives, the vector kart is drawn. */
const DRAWN: Partial<Record<CharacterId, true>> = { panda: true, pandaroux: true, dragon: true, licorne: true, singe: true };
/** Nearest of the 8 views (sectors of 45°) for a heading relative to the camera, in radians. */
export function kartView(relative: number): typeof KART_VIEWS[number] {
    return KART_VIEWS[((Math.round(relative / (Math.PI / 4)) % 8) + 8) % 8] ?? 'back';
}
/** Turn cues of the chased kart, in radians of apparent yaw: full lock, extra lean while drifting. */
const STEER_YAW = .7, DRIFT_YAW = .3;
/** Hysteresis: a view holds until the yaw leaves its 45° sector by this much (no flicker on the threshold). */
const HOLD = Math.PI / 16;
/** Below SLIP_SPEED the velocity has no reliable direction; below STEER_SPEED the steering is scaled down (a kart at rest
 *  shows its back); the slide counts in
 *  full from SLIP_FULL. A turn shows at most the ¾ views; past them (profile, front) only a spin-out at speed. */
const STEER_SPEED = 3, SLIP_SPEED = 4, SLIP_FULL = 12, SPIN_SPEED = 14, THREE_QUARTER = 3 * Math.PI / 8 - 1e-3;
type Chased = { angle: number; vx: number; vy: number; driftMs: number };
type Steering = { steer: number; mode?: 'joystick'; heading?: number };
/** Apparent yaw of the chased kart: the camera follows its heading, so the angle to the camera is always 0 and the
 *  turn must come from the state: steering (analog, or the gap to the joystick heading), drift, and the gap between
 *  heading and velocity (positive = nose to screen right). A spin-out keeps its whole angle, so the front views stay. */
export function chaseYaw(k: Chased, input: Steering): number {
    const speed = Math.hypot(k.vx, k.vy);
    const turn = input.mode === 'joystick' && input.heading !== undefined && Number.isFinite(input.heading)
        ? Math.max(-1, Math.min(1, wrap(input.heading - k.angle) / (Math.PI / 2)))
        : Math.max(-1, Math.min(1, input.steer));
    const slip = speed > SLIP_SPEED ? wrap(k.angle - Math.atan2(k.vy, k.vx)) : 0;
    // Spin-out: sliding at speed with the nose past the ¾ sector, the whole angle shows (profile, then front).
    if (speed >= SPIN_SPEED && Math.abs(slip) > THREE_QUARTER) return slip;
    const side = Math.sign(turn) || Math.sign(slip);
    const yaw = slip * Math.min(1, Math.max(0, (speed - SLIP_SPEED) / (SLIP_FULL - SLIP_SPEED))) + turn * STEER_YAW * Math.min(1, speed / STEER_SPEED) + (k.driftMs > 0 ? side * DRIFT_YAW : 0);
    return Math.max(-THREE_QUARTER, Math.min(THREE_QUARTER, yaw));
}
/** View of the chased (player's) kart, with hysteresis around the previous view. */
export function chaseView(k: Chased, input: Steering, previous?: typeof KART_VIEWS[number]): typeof KART_VIEWS[number] {
    const yaw = chaseYaw(k, input), next = kartView(yaw);
    if (!previous || previous === next) return next;
    const centre = KART_VIEWS.indexOf(previous) * Math.PI / 4;
    return Math.abs(wrap(yaw - centre)) <= Math.PI / 8 + HOLD ? previous : next;
}
/** Sprite of a mascot's kart, or undefined when it has no drawn kart (vector fallback). */
export function kartSprite(id: CharacterId | undefined, view: KartView): KartSpriteKey | undefined {
    return id && DRAWN[id] ? `${id}_${view}` : undefined;
}
export const kartTexture = (key: string): string => `derapage-kart-${key}`;
