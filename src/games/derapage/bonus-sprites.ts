import type { Item } from '../../engines/derapage/physics';
// David's drawn bonuses (06/11), square textures about twice their largest size on the 360×640 canvas, so the linear
// filter never shrinks them more than twice. Small screen sizes take their own reduction (`_small`, `_far`).
export const BONUS_SPRITES = {
    // Bonus in hand, front view, common to the five mascots: comet = turbo, tornado = spring, cloud = puddle, bubble = shield.
    icon_turbo: 72, icon_ressort: 72, icon_flaque: 72, icon_bulle: 72,
    icon_turbo_small: 40, icon_ressort_small: 40, icon_flaque_small: 40, icon_bulle_small: 40,
    // Item box: the capsule of mischief, from above (top view) and its front panel (3D view).
    capsule_top: 40, capsule: 88, capsule_far: 40,
    // The puddle trap: the prankster cloud from above (top view); in 3D, its front view (`icon_flaque`).
    cloud_top: 48,
} as const;
export type BonusSpriteKey = keyof typeof BONUS_SPRITES;
export const bonusTexture = (key: string): string => `derapage-bonus-${key}`;
/** Icon of a bonus in hand, whatever the mascot; `small` below 24 px on screen. */
export function bonusIcon(item: Item, small = false): BonusSpriteKey {
    return small ? `icon_${item}_small` : `icon_${item}`;
}
/** Front panel of the capsule or of the cloud in the 3D view, by its height on screen. */
export function pickupPanel(kind: 'crate' | 'puddle', size: number): BonusSpriteKey {
    const far = size < 24;
    return kind === 'crate' ? far ? 'capsule_far' : 'capsule' : far ? 'icon_flaque_small' : 'icon_flaque';
}
