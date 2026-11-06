import type { Track, Vec } from '../../engines/derapage/track';
import { sceneryTheme, scenerySprites } from './scenery';
// David's drawn trees (06/11): side views for the 3D panels (they always face the camera), top views for the top view.
// Generated with the textures: size in px. Side views are anchored at the foot of the drawing (bottom centre).
export const TREE_SPRITES = {
    feuillu_side: { w: 93, h: 96 }, feuillu_side_far: { w: 39, h: 40 }, feuillu_top: { w: 48, h: 48 },
    cerisier_side: { w: 81, h: 96 }, cerisier_side_far: { w: 34, h: 40 }, cerisier_top: { w: 48, h: 48 },
    erable_side: { w: 82, h: 96 }, erable_side_far: { w: 34, h: 40 }, erable_top: { w: 48, h: 48 },
    pommier_side: { w: 86, h: 96 }, pommier_side_far: { w: 36, h: 40 }, pommier_top: { w: 48, h: 48 },
    sapin_side: { w: 77, h: 96 }, sapin_side_far: { w: 32, h: 40 }, sapin_top: { w: 48, h: 48 },
    palmier_side: { w: 89, h: 96 }, palmier_side_far: { w: 37, h: 40 }, palmier_top: { w: 48, h: 48 },
    // The bamboo of the reference sheet has no top view: Bambou Express keeps its vector bamboo seen from above.
    bambou_side: { w: 57, h: 96 }, bambou_side_far: { w: 24, h: 40 },
} as const;
export type TreeSpriteKey = keyof typeof TREE_SPRITES;
export type Essence = 'feuillu' | 'cerisier' | 'erable' | 'pommier' | 'sapin' | 'palmier' | 'bambou';
export const treeTexture = (key: string): string => `derapage-tree-${key}`;
/** Essences by ambiance, indexed by the palette of the cup (sceneryTheme). Urban cups have no visible trees. */
const AMBIANCES: readonly (readonly Essence[])[] = [
    [],                     // 0 urban (Invalides)
    ['feuillu', 'cerisier'], // 1 fast, meadows in spring
    ['erable', 'pommier'],   // 2 technical, fields and copper bends
    ['cerisier', 'pommier'], // 3 ovals
    ['sapin', 'feuillu'],    // 4 nature, the Ardennes forest
    [],                     // 5 urban (quays)
    ['palmier'],            // 6 cliffs, the coast
    ['sapin'],              // 7 slalom and BMX, the frozen mountains
];
/** Essences of a circuit; the three kart circuits have their own ambiance (the volcano's spires are rocks, not trees). */
export function ambiance(t: Track): readonly Essence[] {
    const kart = t.circuit.theme.kart;
    if (kart) return kart === 'autumn' ? ['erable'] : kart === 'bamboo' ? ['bambou'] : [];
    return AMBIANCES[sceneryTheme(t)] ?? [];
}
export interface DrawnTree extends Vec { radius: number; essence: Essence; kart: boolean }
/** Essence of one tree: the fir along the road is always a fir; otherwise it depends on the position only, so both
 *  views and every frame agree. Undefined when the ambiance has no drawn tree (urban, volcano). */
export function treeEssence(t: Track, q: Vec, kind: 'tree' | 'fir' = 'tree'): Essence | undefined {
    const list = ambiance(t);
    if (!list.length) return undefined;
    if (kind === 'fir' && !t.circuit.theme.kart) return 'sapin';
    return list[Math.abs(Math.round(q.x * 10) * 31 + Math.round(q.y * 10) * 17) % list.length];
}
const cache = new WeakMap<Track, readonly DrawnTree[]>();
/** Every drawn tree of the circuit with its essence: the engine trees, and the firs along the road of the nature cup. */
export function drawnTrees(t: Track): readonly DrawnTree[] {
    const old = cache.get(t); if (old) return old;
    const items: DrawnTree[] = [];
    if (t.circuit.theme.kart) for (const tree of t.trees) { const essence = treeEssence(t, tree); if (essence) items.push({ x: tree.x, y: tree.y, radius: tree.radius, essence, kart: true }); }
    else for (const item of scenerySprites(t)) {
        if (item.kind !== 'tree' && item.kind !== 'fir') continue;
        const essence = treeEssence(t, item, item.kind);
        if (essence) items.push({ x: item.x, y: item.y, radius: item.radius, essence, kart: false });
    }
    cache.set(t, items); return items;
}
/** Side panel of a tree in the 3D view by its height on screen: the far reduction below 48 px. */
export function treePanel(essence: Essence, height: number): TreeSpriteKey {
    return height < 48 ? `${essence}_side_far` : `${essence}_side`;
}
/** Top view of a tree, or null when David drew none (bamboo). */
export function treeTop(essence: Essence): TreeSpriteKey | null {
    return essence === 'bambou' ? null : `${essence}_top`;
}
