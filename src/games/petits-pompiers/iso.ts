import { HEIGHT, TILE, WIDTH, type Engine } from '../../engines/petits-pompiers/engine';
import { SPRITES, type SpriteKey } from './sprites';
/** 2:1 isometric projection of the 14×9 grid. A cell is a 48×24 diamond: the same area as the former 24×24 square.
 *  Grid x runs down-right on screen, grid y down-left. Coordinates are iso world units; the scene scales them. */
export const HW = 24, HH = 12, RING = 4, TOP = 96;
/** Diamond side slope: 1:2, 26.57° below the horizontal. */
export const SLOPE = Math.atan2(HH, HW);
const X0 = (HEIGHT + RING) * HW, Y0 = TOP + 2 * RING * HH;
/** Whole drawn area (map + decorative ring), and the playable map inside it. */
export const WORLD = { width: (WIDTH + HEIGHT + 2 * RING) * HW, height: TOP + (WIDTH + HEIGHT + 4 * RING) * HH } as const;
export const MAP = { left: X0 - HEIGHT * HW, right: X0 + WIDTH * HW, top: Y0 - 48, bottom: Y0 + (WIDTH + HEIGHT) * HH } as const;
export interface Point { x: number; y: number }
/** Continuous grid coordinates (cells, a cell centre is n + .5) → iso world. */
export function project(gx: number, gy: number): Point { return { x: X0 + (gx - gy) * HW, y: Y0 + (gx + gy) * HH }; }
/** Inverse projection: iso world → continuous grid coordinates. */
export function unproject(x: number, y: number): Point { const u = (x - X0) / HW, v = (y - Y0) / HH; return { x: (u + v) / 2, y: (v - u) / 2 }; }
/** Cell centre of a row-major index. */
export function cell(at: number): Point { return project(at % WIDTH + .5, Math.floor(at / WIDTH) + .5); }
/** Engine position (simulation units, TILE per cell) → iso world. */
export function point(x: number, y: number): Point { return project(x / TILE, y / TILE); }
/** The map cell under an iso world point, or -1 outside the map. */
export function cellAt(x: number, y: number): number {
    const g = unproject(x, y), cx = Math.floor(g.x), cy = Math.floor(g.y);
    return cx < 0 || cy < 0 || cx >= WIDTH || cy >= HEIGHT ? -1 : cy * WIDTH + cx;
}
/** Screen direction (unit vector) followed for a grid step (dx, dy). */
export function direction(dx: number, dy: number): Point {
    const x = (dx - dy) * HW, y = (dx + dy) * HH, n = Math.hypot(x, y) || 1;
    return { x: x / n, y: y / n };
}
/** Painter's order: larger gx + gy is nearer the viewer. */
export function depthOf(gx: number, gy: number, bias = 0): number { return 100 + (gx + gy) * 4 + bias; }
/** Stick arrows: each one sits where the finger pushes and points where the firefighter really goes on screen. */
export const STICK_ARROWS = ([[1, 0, 'droite'], [0, 1, 'bas'], [-1, 0, 'gauche'], [0, -1, 'haut']] as const)
    .map(([dx, dy, name]) => ({ dx, dy, name, angle: Math.atan2(direction(dx, dy).y, direction(dx, dy).x) * 180 / Math.PI }));

export type World = 'quartier' | 'ville' | 'foret' | 'montagne' | 'port';
export function worldOf(e: Engine): World {
    const w = e.level.world;
    return w.includes('ville') ? 'ville' : w.includes('forêt') ? 'foret' : w.includes('montagne') ? 'montagne' : w.includes('port') ? 'port' : 'quartier';
}
export const BACKGROUND: Record<World, string> = { quartier: '#5d9b2f', ville: '#7d8a90', foret: '#4f7f33', montagne: '#dfeaf0', port: '#3ea6cf' };
const ROAD: Record<World, SpriteKey> = { quartier: 'sol_paves', ville: 'sol_route', foret: 'sol_sable', montagne: 'sol_paves', port: 'sol_quai' };
const TREE: Record<World, SpriteKey> = { quartier: 'arbre_feuillu', ville: 'arbre_bac', foret: 'sapin', montagne: 'sapin_neige', port: 'arbre_feuillu' };
const RING_GROUND: Record<World, SpriteKey> = { quartier: 'sol_herbe', ville: 'sol_paves', foret: 'sol_herbe', montagne: 'sol_neige', port: 'sol_quai' };
/** Town worlds mix David's street furniture into the low south decor. */
const LOW: Partial<Record<World, SpriteKey[]>> = { quartier: ['buisson_fleuri', 'banc', 'jardiniere'], ville: ['banc', 'poubelle', 'jardiniere'] };
/** Decorative buildings behind the north-east and north-west edges: [sprite, corner gx, corner gy]. */
const DECOR: Record<World, [SpriteKey, number, number][]> = {
    quartier: [['caserne', 4, -1.2], ['maison', 10, -1.2], ['ecole', -1.2, 5]],
    ville: [['commerce', 3, -1.2], ['caserne', 8, -1.2], ['immeuble', -1.2, 4]],
    foret: [['cabane', 5, -1.2], ['caserne', 11, -1.2], ['cabane', -1.2, 5]],
    montagne: [['chalet', 4, -1.2], ['caserne', 10, -1.2], ['chalet', -1.2, 5]],
    port: [['hangar_port', 4, -1.2], ['caserne', 11, -1.2], ['hangar_port', -1.2, 5]],
};
export function groundKey(tile: string, world: World): SpriteKey {
    if (tile === '~') return 'sol_eau';
    if (tile === 's' || world === 'montagne' && (tile === 'g' || tile === 'T')) return 'sol_neige';
    if (tile === 'g' || tile === 'T') return 'sol_herbe';
    if ('HXbB#WDU'.includes(tile)) return 'sol_plancher';
    return ROAD[world];
}
/** Town streets (centre-ville), decor only: David's asphalt gets his kerb corner where the street turns
 *  (two neighbouring sides off the street, the map border included) and a zebra crossing in front of a door.
 *  Map rows and columns are the sides of his square tiles: 'no' = kerb on the row above and the column left. */
export function streetKey(tiles: readonly string[], at: number): SpriteKey | undefined {
    if (tiles[at] !== '.') return undefined;
    const x = at % WIDTH, y = Math.floor(at / WIDTH);
    const tileAt = (dx: number, dy: number): string | undefined => x + dx < 0 || y + dy < 0 || x + dx >= WIDTH || y + dy >= HEIGHT ? undefined : tiles[(y + dy) * WIDTH + x + dx];
    const off = (dx: number, dy: number): boolean => { const t = tileAt(dx, dy); return t === undefined || groundKey(t, 'ville') !== 'sol_route'; };
    if (tileAt(0, -1) === 'D' || tileAt(0, 1) === 'D') return 'route_pieton_ns';
    if (tileAt(-1, 0) === 'D' || tileAt(1, 0) === 'D') return 'route_pieton_eo';
    const n = off(0, -1), s = off(0, 1), w = off(-1, 0), east = off(1, 0);
    if (n && w && !s && !east) return 'route_angle_no';
    if (n && east && !s && !w) return 'route_angle_ne';
    if (s && east && !n && !w) return 'route_angle_se';
    if (s && w && !n && !east) return 'route_angle_so';
    return undefined;
}
export const WALLISH = 'WDUB';
/** Cells enclosed by walls (doors closed): the walls in front of them are drawn see-through. */
export function interior(tiles: readonly string[]): Set<number> {
    const outside = new Set<number>(), queue: number[] = [];
    for (let at = 0; at < tiles.length; at++) {
        const x = at % WIDTH, y = Math.floor(at / WIDTH);
        if ((x === 0 || y === 0 || x === WIDTH - 1 || y === HEIGHT - 1) && !WALLISH.includes(tiles[at] ?? 'W')) { outside.add(at); queue.push(at); }
    }
    while (queue.length) {
        const at = queue.pop() ?? 0, x = at % WIDTH;
        for (const n of [x > 0 ? at - 1 : -1, x < WIDTH - 1 ? at + 1 : -1, at - WIDTH, at + WIDTH])
            if (n >= 0 && n < tiles.length && !outside.has(n) && !WALLISH.includes(tiles[n] ?? 'W')) { outside.add(n); queue.push(n); }
    }
    const inside = new Set<number>();
    for (let at = 0; at < tiles.length; at++) if (!outside.has(at) && !WALLISH.includes(tiles[at] ?? 'W')) inside.add(at);
    return inside;
}
/** One static sprite: anchored on the ground at (gx, gy) in grid coordinates. */
export interface Placement { key: SpriteKey; gx: number; gy: number; depth: number; alpha: number; at: number; flip?: boolean }
const hash = (n: number): number => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
/** Ground diamonds of the map and its ring. */
export function groundPlan(e: Engine): Placement[] {
    const world = worldOf(e), out: Placement[] = [];
    for (let gy = -RING; gy < HEIGHT + RING; gy++) for (let gx = -RING; gx < WIDTH + RING; gx++) {
        const inside = gx >= 0 && gy >= 0 && gx < WIDTH && gy < HEIGHT, at = inside ? gy * WIDTH + gx : -1;
        const tile = inside ? e.tiles[at] ?? 'g' : '';
        const key = inside ? (world === 'ville' ? streetKey(e.tiles, at) : undefined) ?? groundKey(tile, world) : world === 'port' && (gx >= WIDTH + 1 || gy >= HEIGHT + 1) ? 'sol_eau' : RING_GROUND[world];
        out.push({ key, gx: gx + .5, gy: gy + .5, depth: 0, alpha: 1, at });
    }
    return out;
}
/** Walls, trees, services, obstacles and the ring decor. Breakable obstacles carry their cell in `at`. */
export function objectPlan(e: Engine): Placement[] {
    const world = worldOf(e), inside = interior(e.tiles), out: Placement[] = [];
    const behind = (at: number): boolean => { const x = at % WIDTH; return inside.has(at - WIDTH) || x > 0 && inside.has(at - 1) || x > 0 && inside.has(at - WIDTH - 1); };
    for (const [at, tile] of e.tiles.entries()) {
        const gx = at % WIDTH, gy = Math.floor(at / WIDTH), cx = gx + .5, cy = gy + .5, d = depthOf(cx, cy);
        const see = behind(at) ? .42 : 1;
        // Volumes anchor on the bottom corner of their footprint; standing sprites on the cell centre.
        if (tile === 'W') out.push({ key: world === 'ville' ? 'mur_ville' : 'mur_maison', gx: gx + 1, gy: gy + 1, depth: d, alpha: see, at: -1 });
        else if (tile === 'D') out.push({ key: inside.has(at - WIDTH) || inside.has(at + WIDTH) ? 'porte_SO' : 'porte_SE', gx: gx + 1, gy: gy + 1, depth: d, alpha: see, at: -1 });
        else if (tile === 'U') out.push({ key: 'fenetre_haute', gx: gx + 1, gy: gy + 1, depth: d, alpha: see, at: -1 });
        // The blocked door: David's barrier in the doorway, along its wall (¾ right view, mirrored when the wall runs along x).
        else if (tile === 'B') { const alongX = inside.has(at - WIDTH) || inside.has(at + WIDTH); out.push({ key: 'barriere', gx: cx + (alongX ? 0 : .22), gy: cy + (alongX ? .22 : 0), depth: d, alpha: 1, at, flip: alongX }); }
        else if ('Xb'.includes(tile)) out.push({ key: 'caisse', gx: cx + .31, gy: cy + .31, depth: d, alpha: 1, at });
        else if (tile === '#') out.push({ key: 'gravats', gx: cx, gy: cy, depth: d, alpha: 1, at });
        else if (tile === 'T') out.push({ key: TREE[world], gx: cx, gy: cy, depth: d, alpha: 1, at: -1 });
        else if (tile === 'R') out.push({ key: 'borne', gx: cx, gy: cy, depth: d, alpha: 1, at: -1 });
        else if (tile === 'S') out.push({ key: 'point_secours', gx: cx, gy: cy, depth: d - 2, alpha: 1, at: -1 });
        else if (tile === 'E') out.push({ key: 'camion', gx: cx, gy: cy, depth: d, alpha: 1, at: -1, flip: gy === HEIGHT - 1 || gx === 0 });
    }
    for (const [key, gx, gy] of DECOR[world]) out.push({ key, gx, gy, depth: depthOf(gx, gy, -2), alpha: 1, at: -1 });
    // North ring: trees and bushes behind the map. South ring: only low decor, never in front of a cell.
    const tall = world === 'ville' ? 'lampadaire' : TREE[world], low = world === 'foret' || world === 'montagne' ? 'souche' : 'buisson_fleuri';
    const taken = new Set(DECOR[world].map(([, x, y]) => `${String(Math.round(x))},${String(Math.round(y))}`));
    for (let gy = -RING; gy < HEIGHT + RING; gy++) for (let gx = -RING; gx < WIDTH + RING; gx++) {
        if (gx >= 0 && gy >= 0 && gx < WIDTH && gy < HEIGHT) continue;
        const r = hash(gx * 31 + gy * 17), north = gx < 0 && gy < HEIGHT || gy < 0 && gx < WIDTH;
        if (world === 'port' && !north) continue;
        const near = [-1, 0, 1].some(i => [-1, 0, 1].some(j => taken.has(`${String(gx + i)},${String(gy + j)}`) || taken.has(`${String(gx + i)},${String(gy + j - 1)}`) || taken.has(`${String(gx + i - 1)},${String(gy + j)}`)));
        if (north && !near && r < .3 && (gx <= -2 || gy <= -2)) out.push({ key: tall, gx: gx + .5, gy: gy + .5, depth: depthOf(gx + .5, gy + .5), alpha: 1, at: -1 });
        else if (!north && r < .14 && (gx >= WIDTH + 1 || gy >= HEIGHT + 1)) out.push({ key: LOW[world]?.[Math.floor(r * 100) % 3] ?? low, gx: gx + .5, gy: gy + .5, depth: depthOf(gx + .5, gy + .5), alpha: 1, at: -1 });
    }
    return out;
}
/** World size of a sprite: texture pixels at TEXELS px per unit. */
export function spriteSize(key: SpriteKey, texels: number): { width: number; height: number } { const s = SPRITES[key]; return { width: s.w / texels, height: s.h / texels }; }
