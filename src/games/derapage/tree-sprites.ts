import type { Track, Vec } from '../../engines/derapage/track';
export { TREE_CLEARANCE } from '../../engines/derapage/track';
import { sceneryTheme, scenerySprites } from './scenery';
// David's drawn trees (06/11): side views for the 3D panels (they always face the camera), top views for the top view.
// Generated with the textures: size in px. Side views are anchored at the foot of the drawing (bottom centre).
export const TREE_SPRITES = {
    feuillu_side: { w: 156, h: 160 }, feuillu_side_far: { w: 62, h: 64 }, feuillu_top: { w: 112, h: 112 },
    cerisier_side: { w: 135, h: 160 }, cerisier_side_far: { w: 54, h: 64 }, cerisier_top: { w: 112, h: 112 },
    erable_side: { w: 136, h: 160 }, erable_side_far: { w: 55, h: 64 }, erable_top: { w: 112, h: 112 },
    pommier_side: { w: 144, h: 160 }, pommier_side_far: { w: 57, h: 64 }, pommier_top: { w: 112, h: 112 },
    sapin_side: { w: 128, h: 160 }, sapin_side_far: { w: 51, h: 64 }, sapin_top: { w: 112, h: 112 },
    palmier_side: { w: 149, h: 160 }, palmier_side_far: { w: 59, h: 64 }, palmier_top: { w: 112, h: 112 },
    // The bamboo of the reference sheet has no top view: Bambou Express keeps its vector bamboo seen from above.
    bambou_side: { w: 94, h: 160 }, bambou_side_far: { w: 38, h: 64 },
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
export interface DrawnTree extends Vec { radius: number; essence: Essence; kart: boolean;
    /** From above, a crown whose centre lies under an earlier crown merges into it and is not drawn (fill rate). */
    hiddenFromAbove: boolean }
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
    if (t.circuit.theme.kart) for (const tree of t.trees) { const essence = treeEssence(t, tree); if (essence) items.push({ x: tree.x, y: tree.y, radius: tree.radius, essence, kart: true, hiddenFromAbove: false }); }
    else for (const item of scenerySprites(t)) {
        if (item.kind !== 'tree' && item.kind !== 'fir') continue;
        const essence = treeEssence(t, item, item.kind);
        if (essence) items.push({ x: item.x, y: item.y, radius: item.radius, essence, kart: false, hiddenFromAbove: false });
    }
    // Dense forests (a tree at every point of the nature cup) would stack a dozen 23-unit crowns: from above, a
    // crown centred within 40 % of a kept crown's diameter is covered by it anyway, so it is not drawn.
    const kept: DrawnTree[] = [];
    for (const tree of items) {
        if (kept.some(k => Math.hypot(k.x - tree.x, k.y - tree.y) < .4 * treeCrown(k))) tree.hiddenFromAbove = true;
        else kept.push(tree);
    }
    cache.set(t, items); return items;
}
/** Side panel of a tree in the 3D view by its height on screen: the far reduction below 80 px. */
export function treePanel(essence: Essence, height: number): TreeSpriteKey {
    return height < 80 ? `${essence}_side_far` : `${essence}_side`;
}
// Z46, at the scale of the karts (David: "they look like flowers"). A kart is 42 px long from above at the scale 5
// (8.4 world units) and 4 × 0.92 = 3.68 units tall in 3D (per unit of perspective scale). A tree's crown is about
// 2.75 kart lengths across from above, and the tree about 3.5 kart heights tall in 3D; its trunk radius (collision)
// varies the size by 5 %.
export const KART_LENGTH_TOP = 8.4, KART_HEIGHT_3D = 3.68;
const vary = (radius: number): number => .95 + .05 * Math.min(1, Math.max(0, radius - 1.5));
/** Crown diameter from above, in world units. */
export const treeCrown = (tree: { radius: number }): number => 2.75 * KART_LENGTH_TOP * vary(tree.radius);
/** Height of the side view in 3D, in world units (times the perspective scale on screen). */
export const treeHeight = (tree: { radius: number }): number => 3.5 * KART_HEIGHT_3D * vary(tree.radius);

/** Top view of a tree, or null when David drew none (bamboo). */
export function treeTop(essence: Essence): TreeSpriteKey | null {
    return essence === 'bambou' ? null : `${essence}_top`;
}
