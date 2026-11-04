import type Phaser from 'phaser';
import { actionArt, type FighterView } from '../../characters/arcade-art';
import type { CharacterId, Primitive } from '../../characters/model';
import { PALETTES } from '../../engines/ferraille/appearance';
import { scenery } from './scenery';
type G = Phaser.GameObjects.Graphics;
/** Drawing shared by the scene and the catalogue thumbnail (one source, no drift). */
export const VIEW = { scale: 2.6, worldTop: 112, width: 360, height: 640 };
/** Six baked parallax parts per theme: the far plate, three skyline bands, the street, the foreground. */
export const DECOR_PARTS = 6;
export function decorWidth(part: number): number { return part >= 1 && part <= 3 ? (104 - (part - 1) * 12) * 2 : part === 5 ? 152 : 360; }
export function decorFactor(part: number): number { return part === 5 ? .7 : [.15, .3, .55][part - 1] ?? 0; }
export function decorKey(theme: string, part: number): string { return `ferraille-118-${theme}-${String(part)}`; }
export function decorPart(g: G, theme: string, part: number): void {
    if (part === 0) { g.fillStyle(PALETTES[theme === 'furnace' ? 'factory' : theme as keyof typeof PALETTES][0]); g.fillRoundedRect(0, 0, 360, 640, 16); }
    scenery(g, theme === 'furnace' ? 23 : 0, 0, 0, true, theme, part);
}
/** One solid tile; `cap` for the top row of a block. */
export function tileArt(g: G, palette: readonly [number, number, number], x: number, y: number, size: number, cap: boolean): void {
    g.fillStyle(cap ? palette[2] : palette[1]); g.fillRoundedRect(x, y, size - 1, size - 1, 3);
    g.fillStyle(0xb3d5c3); g.fillCircle(x + 5, y + 5, 1.5);
}
export function platformArt(g: G, x: number, y: number, width: number): void {
    g.fillStyle(0x283749); g.fillRoundedRect(x - 2, y - 2, width + 4, 16, 5);
    g.fillStyle(0xefd77c); g.fillRoundedRect(x, y, width, 12, 4);
}
/** Exit door; `scale` converts its 6-unit frame to screen pixels (the scene's VIEW.scale). */
export function doorArt(g: G, x: number, y: number, scale: number): void {
    g.fillStyle(0x67e9c8); g.fillRoundedRect(x, y, 28, 60, 8); g.fillStyle(0x132e3f); g.fillRect(x + 6, y + 6 * scale, 16, 45);
}
/** Shared art puts the held weapon after this hand. Keep the character, backpack and hand;
 * the live Graphics supplies the only barrel and flame. */
export function fighterBody(id: CharacterId, view: FighterView): Primitive[] {
    const list = actionArt[id].fighters[view];
    const hand = list.findIndex(p => p.kind === 'ellipse' && p.rx === 26 && p.ry === 16 && (p.x === 159 || p.x === 81));
    return hand < 0 ? list : list.slice(0, hand + 1);
}
/** Gait frame (0-3) of a running or shooting body: the feet step, the rest is the body above. */
export function fighterGait(id: CharacterId, view: 'marche' | 'gauche' | 'tir', frame: number): Primitive[] {
    const list = fighterBody(id, view === 'tir' ? 'marche' : view).map(p => {
        if (p.kind !== 'ellipse' || p.y < 170 || p.ry > 17) return p;
        const step = Math.sin(frame * Math.PI / 2 + (p.x < 115 ? 0 : Math.PI)) * 8;
        return { ...p, y: p.y + step, rotation: p.rotation + step / 40 };
    });
    if (view === 'tir') {
        const feet = list.filter(p => p.kind === 'ellipse' && p.y >= 162 && p.ry <= 17);
        list.splice(0, list.length, ...fighterBody(id, 'tir').filter(p => !(p.kind === 'ellipse' && p.y >= 162 && p.ry <= 17)), ...feet);
    }
    return list;
}
