import type { Track } from '../../engines/derapage/track';
import { sceneryTheme } from './scenery';
// David's horizons (06/11), one per cup: 1024×128 WebP, seamless left-right (the join is hidden behind a tree,
// a crystal or a plume of smoke). In the 3D view they fill the sky band, 116 px high, so one copy is 928 px wide.
export const HORIZONS = ['urbaine', 'rapide', 'technique', 'ovales', 'nature', 'quais', 'falaises', 'slalom', 'bambou', 'feuilles', 'volcan'] as const;
export type Horizon = typeof HORIZONS[number];
export const HORIZON_FILE = { w: 1024, h: 128 } as const;
/** Sky band of the 3D view (from the top of the useful area to the horizon line). */
export const SKY = { top: 96, height: 116 } as const;
export const HORIZON_WIDTH = HORIZON_FILE.w * SKY.height / HORIZON_FILE.h;
/** One camera turn scrolls two copies: a heading always shows the same sky. */
export const HORIZON_TURN = 2 * HORIZON_WIDTH;
export const horizonTexture = (key: Horizon): string => `derapage-horizon-${key}`;
/** Horizon of a circuit: by the palette of its cup, the three kart circuits have their own. */
export function horizonOf(t: Track): Horizon {
    const kart = t.circuit.theme.kart;
    if (kart) return kart === 'bamboo' ? 'bambou' : kart === 'autumn' ? 'feuilles' : 'volcan';
    return HORIZONS[sceneryTheme(t)] ?? 'rapide';
}
/** Screen x of the left copy, in [-width, 0): turning right (angle up) moves the sky left, like the world. */
export function horizonLeft(angle: number): number {
    const x = (angle * HORIZON_TURN / (2 * Math.PI)) % HORIZON_WIDTH;
    return -(x < 0 ? x + HORIZON_WIDTH : x);
}
