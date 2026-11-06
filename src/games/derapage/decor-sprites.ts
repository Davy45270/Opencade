import type { Track, Vec } from '../../engines/derapage/track';
import { wrap } from '../../engines/derapage/track';
import { scenerySprites, type Scenery } from './scenery';
// David's drawn roadside props (decisions of 06/11): the works barrier of the city circuits, the crate without "?"
// of the quays, the direction sign of the technical cup. Generated with the textures: size in px. Side views are
// anchored at the foot of the drawing; the `_g` sprites are mirrors (¾ and profile of the barrier, the left sign).
export const DECOR_SPRITES = {
    barriere_face: { w: 217, h: 128 }, barriere_3q: { w: 168, h: 128 }, barriere_3q_g: { w: 168, h: 128 },
    barriere_profil: { w: 62, h: 128 }, barriere_profil_g: { w: 62, h: 128 }, barriere_dessus: { w: 160, h: 50 },
    caisse_face: { w: 106, h: 96 }, caisse_dessus: { w: 64, h: 59 },
    panneau_face: { w: 101, h: 160 }, panneau_face_g: { w: 101, h: 160 }, panneau_cote: { w: 68, h: 160 }, panneau_cote_g: { w: 68, h: 160 },
    panneau_arriere: { w: 105, h: 160 }, panneau_arriere_g: { w: 105, h: 160 }, panneau_dessus: { w: 96, h: 47 }, panneau_dessus_g: { w: 96, h: 47 },
} as const;
export type DecorSpriteKey = keyof typeof DECOR_SPRITES;
export const decorTexture = (key: string): string => `derapage-decor-${key}`;
export type DecorKind = 'barrier' | 'sign' | 'cargo';
export const isDecor = (kind: string): kind is DecorKind => kind === 'barrier' || kind === 'sign' || kind === 'cargo';
// Scale (proposed scale sheet, 06/11): the barrier stands about 1 kart high in 3D, the sign 1.6 karts, the crate
// 3 units (the size of the bonus box). From above everything is twice its 3D width, like the karts (a kart is 3.3
// units wide from behind in 3D, 6.6 from above).
// KART_HEIGHT_3D of tree-sprites (not imported: scenery imports this module, tree-sprites imports scenery).
export const KART_HEIGHT = 3.68;
export const DECOR_HEIGHT: Record<DecorKind, number> = { barrier: KART_HEIGHT, sign: 1.6 * KART_HEIGHT, cargo: 3 };
const TOP = 2;
const FACE: Record<DecorKind, DecorSpriteKey> = { barrier: 'barriere_face', sign: 'panneau_face', cargo: 'caisse_face' };
const width3d = (kind: DecorKind, key: DecorSpriteKey): number => DECOR_HEIGHT[kind] * DECOR_SPRITES[key].w / DECOR_SPRITES[key].h;
/** Distance kept between every point of a prop and the road edge: beyond the city rail, 3 units after the edge. */
export const DECOR_MARGIN = 4;
/** Barrier view by the angle between its long axis and the camera ray (direction from the camera to the barrier):
 *  the face square to its long side, the profile down its axis, the ¾ in between; it is symmetric end to end. */
export function barrierView(axis: number, ray: number): DecorSpriteKey {
    let across = -Math.cos(axis) * Math.sin(ray) + Math.sin(axis) * Math.cos(ray), along = Math.cos(axis) * Math.cos(ray) + Math.sin(axis) * Math.sin(ray);
    if (across < 0) { across = -across; along = -along; }
    // beta > 0: the end on screen right is the farther one (the ¾ drawn by David recedes to the right).
    const beta = Math.atan2(along, across);
    if (Math.abs(beta) < Math.PI / 8) return 'barriere_face';
    if (Math.abs(beta) > 3 * Math.PI / 8) return beta > 0 ? 'barriere_profil' : 'barriere_profil_g';
    return beta > 0 ? 'barriere_3q' : 'barriere_3q_g';
}
/** Sign view: it faces the karts coming down the road (heading `road`); its face from upstream, its back from
 *  downstream, its edge from the side. Mirrored for a left bend. */
export function signView(road: number, ray: number, mirror: boolean): DecorSpriteKey {
    const d = Math.abs(wrap(ray - road)), view = d <= Math.PI / 3 ? 'face' : d >= 2 * Math.PI / 3 ? 'arriere' : 'cote';
    return `panneau_${view}${mirror ? '_g' : ''}`;
}
/** The 3D panel of a prop seen along `ray`, and its height in world units (times the perspective scale). */
export function decorPanel(item: Scenery, ray: number): { key: DecorSpriteKey; height: number } {
    const kind = item.kind as DecorKind, angle = item.angle ?? 0;
    const key = kind === 'barrier' ? barrierView(angle, ray) : kind === 'sign' ? signView(angle, ray, Boolean(item.mirror)) : 'caisse_face';
    return { key, height: DECOR_HEIGHT[kind] };
}
/** The top view of a prop: its key, its size in world units and the world angle of the image's horizontal axis.
 *  The barrier and the crate lie along the road; the sign's planks stand square to it, tips to the bend side. */
export function decorTop(item: Scenery): { key: DecorSpriteKey; width: number; height: number; rotation: number } {
    const kind = item.kind as DecorKind, angle = item.angle ?? 0;
    const key: DecorSpriteKey = kind === 'barrier' ? 'barriere_dessus' : kind === 'sign' ? (item.mirror ? 'panneau_dessus_g' : 'panneau_dessus') : 'caisse_dessus';
    const width = TOP * width3d(kind, FACE[kind]), s = DECOR_SPRITES[key];
    return { key, width, height: width * s.h / s.w, rotation: kind === 'sign' ? angle + Math.PI / 2 : angle };
}
/** World points that must stay off the road: the corners and edge middles of the top view, and a circle as wide as
 *  the widest 3D panel around the foot (that panel turns with the camera). */
export function decorFootprint(item: Scenery): Vec[] {
    const kind = item.kind as DecorKind, top = decorTop(item), c = Math.cos(top.rotation), s = Math.sin(top.rotation);
    const points: Vec[] = [];
    for (const [u, v] of [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]] as const) {
        const x = u * top.width / 2, y = v * top.height / 2;
        points.push({ x: item.x + x * c - y * s, y: item.y + x * s + y * c });
    }
    const views = (Object.keys(DECOR_SPRITES) as DecorSpriteKey[]).filter(k => !k.includes('dessus') && k.startsWith({ barrier: 'barriere', sign: 'panneau', cargo: 'caisse' }[kind]));
    const radius = Math.max(...views.map(k => width3d(kind, k))) / 2;
    for (let i = 0; i < 8; i++) points.push({ x: item.x + Math.cos(i * Math.PI / 4) * radius, y: item.y + Math.sin(i * Math.PI / 4) * radius });
    return points;
}
/** Half the extent of a prop across the road, beyond its foot: how far from the edge it must stand. */
export function decorReach(kind: DecorKind): number {
    return Math.max(...decorFootprint({ x: 0, y: 0, kind, radius: 0, angle: 0 }).map(q => Math.abs(q.y)));
}
const cache = new WeakMap<Track, readonly Scenery[]>();
/** The props of a circuit that David drew, in the order of the roadside. */
export function drawnDecor(t: Track): readonly Scenery[] {
    const old = cache.get(t); if (old) return old;
    const items = scenerySprites(t).filter(item => isDecor(item.kind));
    cache.set(t, items); return items;
}
