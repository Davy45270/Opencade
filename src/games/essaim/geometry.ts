import type { Enemy } from '../../engines/essaim/engine';
export const PLAYER_ART_SIZE = 84;
export const PREVIOUS_PLAYER_ART_SIZE = 58;
export const DECOR_THEMES = ['G01', 'G02', 'G03'] as const;
export function decorTheme(level: number): typeof DECOR_THEMES[number] {
    if (level === 6) return 'G01';
    if (level === 8) return 'G02';
    if (level === 14) return 'G03';
    return DECOR_THEMES[Math.floor(level / 5) % 3] ?? 'G01';
}
export type HullPoint = readonly [number, number];
/** Outer contour is shared by renderer and shape validator; no palette in this contract. */
export const ENEMY_HULLS = {
    shield: [[-25,-12],[-14,-19],[0,-10],[14,-19],[25,-12],[18,13],[8,19],[0,13],[-8,19],[-18,13]],
    miner: [[-25,-15],[-13,-15],[-13,-6],[-6,-6],[-6,-18],[6,-18],[6,-6],[13,-6],[13,-15],[25,-15],[25,17],[13,17],[13,9],[-13,9],[-13,17],[-25,17]],
    split: [[-26,-5],[-15,-19],[-3,-10],[0,1],[3,-10],[15,-19],[26,-5],[17,19],[5,15],[0,6],[-5,15],[-17,19]],
    spiral: [[0,-27],[9,-8],[26,-5],[13,7],[15,24],[0,15],[-15,24],[-13,7],[-26,-5],[-9,-8]],
    turret: [[-29,-12],[-15,-20],[11,-20],[18,-12],[29,-12],[29,8],[21,8],[21,24],[14,24],[14,9],[-18,9],[-29,2]],
    mirror: [[-27,-17],[-12,-24],[-5,-10],[0,-3],[5,-10],[12,-24],[27,-17],[22,15],[11,23],[4,8],[-4,8],[-11,23],[-22,15]],
    armor: [[-24,-20],[24,-20],[29,-7],[23,23],[10,23],[8,15],[-8,15],[-10,23],[-23,23],[-29,-7]],
} as const satisfies Record<string, readonly HullPoint[]>;
export type HullRole = keyof typeof ENEMY_HULLS;
export function hullRole(type: Enemy['type']): HullRole {
    if (type in ENEMY_HULLS) return type as HullRole;
    return type === 'fast' || type === 'fragment' ? 'spiral' : 'shield';
}
