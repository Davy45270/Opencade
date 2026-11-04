import type Phaser from 'phaser';
/**
 * Orbite scenery after the charter's shoot'em up boards: bamboo belt (levels 1-10), scarlet nebula
 * (11-20), star kingdom (21-30). The backdrop (sky, nebula, planets, stars, HUD veil) is baked once
 * per world; ships are a handful of primitives each.
 */
type G = Phaser.GameObjects.Graphics;
export type World = 'bambou' | 'ecarlate' | 'etoiles';
export function worldOf(level: number): World { return level < 10 ? 'bambou' : level < 20 ? 'ecarlate' : 'etoiles'; }
interface Palette { top: number; bottom: number; cloud: number; planet: [number, number]; ring: number; shield: number; shieldLight: number }
export const palettes: Record<World, Palette> = {
    bambou: { top: 0x061a1c, bottom: 0x12403a, cloud: 0x2f8a5a, planet: [0x6fc24a, 0x2f6a3a], ring: 0xb6ec6a, shield: 0x5cbf3f, shieldLight: 0xd8f59a },
    ecarlate: { top: 0x1a0610, bottom: 0x4a1424, cloud: 0xd03a4a, planet: [0xff9a4a, 0x8a2a2a], ring: 0xffc07a, shield: 0xff7a5a, shieldLight: 0xffd0b0 },
    etoiles: { top: 0x080a26, bottom: 0x2a1a5a, cloud: 0x7a5adf, planet: [0x9ad0ff, 0x3a4aa0], ring: 0xffe07a, shield: 0x8ab4ff, shieldLight: 0xe0ecff },
};
function mix(a: number, b: number, t: number): number {
    const c = (s: number): number => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
    return (c(16) << 16) | (c(8) << 8) | c(0);
}
export function backdrop(g: G, world: World): void {
    const p = palettes[world];
    for (let i = 0; i < 16; i++) { g.fillStyle(mix(p.top, p.bottom, i / 15)); g.fillRect(0, i * 40, 360, 41); }
    // Nebula: layered translucent clouds.
    for (let i = 0; i < 9; i++) { g.fillStyle(p.cloud, .1 + (i % 3) * .05); g.fillEllipse((i * 131) % 360, 120 + (i * 83) % 420, 220 - (i % 4) * 30, 110 - (i % 3) * 20); }
    // Stars, a few with a cross glint.
    for (let i = 0; i < 90; i++) { g.fillStyle(0xffffff, .35 + (i % 4) * .15); g.fillCircle((i * 97 + 13) % 360, (i * 61 + 7) % 640, i % 9 === 0 ? 1.6 : .8); }
    g.lineStyle(1, 0xffffff, .7); for (let i = 0; i < 6; i++) { const x = (i * 157 + 40) % 340 + 10, y = (i * 113 + 90) % 520 + 40; g.lineBetween(x - 5, y, x + 5, y); g.lineBetween(x, y - 5, x, y + 5); }
    // Planets: one large with a ring, one small.
    g.fillStyle(p.planet[1]); g.fillCircle(318, 470, 62); g.fillStyle(p.planet[0]); g.fillCircle(306, 458, 56);
    g.fillStyle(0xffffff, .18); g.fillCircle(290, 440, 22);
    g.lineStyle(4, p.ring, .7); g.strokeEllipse(312, 466, 170, 34);
    g.fillStyle(p.planet[1]); g.fillCircle(46, 200, 20); g.fillStyle(p.planet[0]); g.fillCircle(42, 196, 17);
    if (world === 'bambou') { g.fillStyle(0x7fbf3a, .6); for (let i = 0; i < 5; i++) g.fillRect(8 + i * 6, 300 + i * 30, 4, 60); }
    // HUD veil at the top.
    g.fillStyle(0x000000, .38); g.fillRoundedRect(8, 8, 344, 74, 12);
    g.lineStyle(1, p.ring, .5); g.strokeRoundedRect(8, 8, 344, 74, 12);
}
/** Winged probe: wings, body, eyes, antennae. */
export function probeShip(g: G, x: number, y: number, color: number, flap: number): void {
    const w = 11 + flap * 2;
    g.fillStyle(mix(color, 0xffffff, .45), .9); g.fillTriangle(x - 3, y - 2, x - 3 - w, y - 8, x - 4, y + 6); g.fillTriangle(x + 3, y - 2, x + 3 + w, y - 8, x + 4, y + 6);
    g.fillStyle(color); g.fillEllipse(x, y, 14, 18);
    g.fillStyle(mix(color, 0x000000, .35)); g.fillEllipse(x, y + 5, 10, 6);
    g.fillStyle(0xffffff); g.fillCircle(x - 3, y - 3, 2.6); g.fillCircle(x + 3, y - 3, 2.6);
    g.fillStyle(0x101020); g.fillCircle(x - 3, y - 3, 1.2); g.fillCircle(x + 3, y - 3, 1.2);
    g.lineStyle(1.5, color); g.lineBetween(x - 3, y - 9, x - 6, y - 14); g.lineBetween(x + 3, y - 9, x + 6, y - 14);
}
/** The player's ship in the companion's colour: hull, wings, cockpit glow, twin flames. */
export function playerShip(g: G, x: number, y: number, color: number, flame: number): void {
    const k = 1.4;
    g.fillStyle(0xffb04a, .85); g.fillTriangle(x - 9 * k, y + 12 * k, x - 5 * k, y + 12 * k, x - 7 * k, y + 18 * k + flame * 4); g.fillTriangle(x + 5 * k, y + 12 * k, x + 9 * k, y + 12 * k, x + 7 * k, y + 18 * k + flame * 4);
    g.fillStyle(mix(color, 0x000000, .3)); g.fillTriangle(x - 24 * k, y + 10 * k, x - 4 * k, y - 4 * k, x - 4 * k, y + 12 * k); g.fillTriangle(x + 24 * k, y + 10 * k, x + 4 * k, y - 4 * k, x + 4 * k, y + 12 * k);
    g.fillStyle(color); g.fillRoundedRect(x - 8 * k, y - 16 * k, 16 * k, 30 * k, 7 * k);
    g.fillStyle(mix(color, 0xffffff, .5)); g.fillRect(x - 6 * k, y - 12 * k, 3 * k, 22 * k);
    g.fillStyle(0xffe07a); g.fillTriangle(x - 24 * k, y + 10 * k, x - 20 * k, y + 4 * k, x - 18 * k, y + 10 * k); g.fillTriangle(x + 24 * k, y + 10 * k, x + 20 * k, y + 4 * k, x + 18 * k, y + 10 * k);
}
/** The player's hull colour per companion. */
export const SHIP_COLORS: Record<string, number> = { panda: 0x4fae4a, pandaroux: 0xe0552f, dragon: 0x3a7ae0, singe: 0xe04aa8, licorne: 0x9a6aff };
/** Probe colour per formation row. */
export const PROBE_COLORS = [0xffdb89, 0xbaadff, 0xff9ebb, 0x87d8ff, 0xa5f0ca];
/** Shield bricks with their lit top edge, and the faint line they stand on. */
export function shieldCells(g: G, world: World, cells: readonly { x: number; y: number }[], line: number): void {
    const [shield, shieldLight] = shieldColors(world);
    g.lineStyle(1, shieldLight, 0.25); g.lineBetween(12, line, 348, line);
    g.fillStyle(shield); for (const cell of cells) g.fillRect(cell.x, cell.y, 4, 4);
    g.fillStyle(shieldLight, 0.55); for (const cell of cells) g.fillRect(cell.x, cell.y, 4, 1);
}
/** Shield brick colours per world. */
export function shieldColors(world: World): [number, number] { return [palettes[world].shield, palettes[world].shieldLight]; }
