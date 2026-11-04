import type Phaser from 'phaser';
import { CANNON_Y, type Enemy, type State } from '../../engines/essaim/engine';
import { ENEMY_HULLS, decorTheme, hullRole } from './geometry';
/** Essaim's pure drawings, shared by the scene's art and the catalogue thumbnail. */
type G = Phaser.GameObjects.Graphics;
type Shot = State['shots'][number];
export const INK = 0x080f25;
export const ENEMY_COLORS: Record<Enemy['type'], number> = {
    scout: 0x43dcb1, sensor: 0x45d8df, armor: 0x9981ef, split: 0xffbe48,
    fragment: 0xffce70, shield: 0x548af5, miner: 0xf58a4c, fast: 0x49cbe9,
    spiral: 0xf46c9d, turret: 0xb17cec, mirror: 0x70dfea, burst: 0xe590db,
};
/** Ink-outlined ellipse with a soft highlight. */
export function inkEllipse(g: G, x: number, y: number, w: number, h: number, color: number): void {
    g.fillStyle(INK); g.fillEllipse(x, y + 1, w + 4, h + 4, 16);
    g.fillStyle(color); g.fillEllipse(x, y, w, h, 16);
    g.fillStyle(0xffffff, 0.22); g.fillEllipse(x - w * 0.12, y - h * 0.2, w * 0.65, h * 0.34);
}
/** Deep sky and the band's planet: static per level. */
export function essaimBackdrop(g: G, level: number): void {
    const band = Math.floor(level / 5);
    g.clear(); g.fillStyle(0x0c172e); g.fillRect(0, 0, 360, 640);
    const palettes = [0x315979, 0x664b86, 0x2e716f, 0x766039, 0x3b5487, 0x713d68];
    const color = decorTheme(level) === 'G01' ? 0x368349 : decorTheme(level) === 'G02' ? 0xab3457 : decorTheme(level) === 'G03' ? 0x8755b8 : palettes[band] ?? 0x315979, x = 270 - band * 25, y = 260 + band * 17;
    g.fillStyle(color, 0.1); g.fillCircle(x, y, 51);
    g.fillStyle(color, 0.25); g.fillCircle(x, y, 47);
    g.fillStyle(color); g.fillCircle(x, y, 42);
    g.fillStyle(0xc2dae3, 0.1); g.fillEllipse(x - 9, y - 20, 48, 17);
    g.fillStyle(0x0c172e, 0.55); g.fillCircle(x + 17, y + 7, 36);
    if (band % 2) { g.lineStyle(3, color, 0.6); g.strokeEllipse(x, y + 4, 118, 24); }
}
/** Drifting stars and the world's motifs at `time` seconds, and the cannon line. */
export function essaimDrift(g: G, level: number, time: number): void {
    for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 24; i++) {
        const x = 6 + (i * 97 + layer * 43) % 348;
        const y = (i * 67 + layer * 109 + time * ([4, 10, 22][layer] ?? 4)) % 580;
        g.fillStyle(0xb6d9f5, 0.18 + layer * 0.13); g.fillCircle(x, y, 0.5 + layer * 0.35);
    }
    const catalogue = decorTheme(level) === 'G01' ? 'bamboo' : decorTheme(level) === 'G02' ? 'scarlet' : 'stars';
    for (let i = 0; i < 14; i++) {
        const x = 18 + (i * 83) % 327, y = (i * 83 + time * (catalogue === 'scarlet' ? 30 : 12)) % 570;
        if (catalogue === 'bamboo') {
            inkEllipse(g, x, y, 22 + i % 3 * 6, 19, 0x375f43);
            g.lineStyle(2, 0x91e75b, .65); g.lineBetween(x - 7, y - 4, x + 6, y - 4);
        } else if (catalogue === 'scarlet') {
            g.lineStyle(7, 0xa63b62, .12); g.lineBetween(x, y, x + 15, y - 32);
            inkEllipse(g, x, y, 14, 18, 0x83374d);
        } else {
            g.fillStyle(0x8761ba, .3); g.fillTriangle(x - 9, y, x, y - 20, x + 9, y); g.fillTriangle(x - 9, y, x, y + 14, x + 9, y);
        }
    }
    if (decorTheme(level) === 'G01') for (let i = 0; i < 4; i++) { const x = 36 + i * 89, y = (time * 55 + i * 157) % 580; g.lineStyle(5, 0x55ff79, .08); g.lineBetween(x,y,x,y-48); g.lineStyle(1,0x88ffa6,.4); g.lineBetween(x,y,x,y-48); }
    g.lineStyle(1, 0x78ead5, 0.22); g.lineBetween(20, 590, 340, 590);
}
/** One enemy hull, at its position, in its type colour (white while `flash`). */
export function essaimEnemy(g: G, e: Enemy, flash: boolean, clock: number, reduced: boolean): void {
    const color = flash ? 0xffffff : ENEMY_COLORS[e.type];
    const t = reduced ? 0 : clock / 160 + e.id;
    g.save(); g.translateCanvas(e.x, e.y);
    g.rotateCanvas(e.type === 'spiral' ? reduced ? 0 : clock / 330 + e.id : Math.sin(t) * 0.06);
    const role = hullRole(e.type), wing = reduced ? 0 : Math.floor(clock / 180 + e.id) % 2;
    const contour = ENEMY_HULLS[role].map(([x,y]) => ({ x: x * (wing ? 0.91 : 1), y }));
    g.fillStyle(INK); g.fillPoints(contour, true);
    g.lineStyle(3, INK); g.strokePoints(contour, true);
    g.fillStyle(color); g.fillPoints(contour, true);
    g.lineStyle(1.5, 0xe3f8ff, .85); g.strokePoints(contour, true);
    // Raised armour plates, engine ports and cockpit are distinct from the outline.
    for (const side of [-1, 1]) {
        g.fillStyle(INK); g.fillRoundedRect(side * 16 - 5, -8, 10, 20, 3);
        g.fillStyle(0xffbf53); g.fillTriangle(side * 16 - 3, -6, side * 16 + 3, -6, side * 16, -17 - wing * 4);
        g.lineStyle(2, color); g.lineBetween(side * 10, -12, side * 21, -4);
    }
    g.fillStyle(INK); g.fillTriangle(-9, -11, 9, -11, 0, 12);
    g.fillStyle(flash ? 0xffffff : 0x79edff); g.fillTriangle(-6, -9, 6, -9, 0, 6);
    g.fillStyle(0xffffff); g.fillTriangle(-4, -8, 0, -8, -2, -1);
    if (role === 'split') { g.lineStyle(3, INK); g.lineBetween(0,-18,0,18); }
    if (role === 'armor') for (const y of [-17, 9, 17]) { g.lineStyle(3, 0xbcb7ef); g.lineBetween(-15,y,15,y); }
    if (role === 'miner') { g.fillStyle(0xffdd6a); g.fillCircle(-20,12,4); g.fillCircle(20,12,4); }
    if (role === 'turret') { g.lineStyle(6, INK); g.lineBetween(18,2,18,24); g.lineStyle(3,0xffed89); g.lineBetween(18,2,18,24); }
    if (e.captured) { g.lineStyle(1, 0xffd36e); g.lineBetween(0, 10, 0, 23); inkEllipse(g, 0, 22, 10, 8, 0xffbd50); }
    g.restore();
    if (e.type === 'shield' && (e.clock ?? 0) % 6000 < 5500) {
        const a = e.facing ?? Math.PI / 2;
        g.lineStyle(7, 0x5088ff, 0.16); g.beginPath(); g.arc(e.x, e.y, 22, a - Math.PI / 4, a + Math.PI / 4); g.strokePath();
        g.lineStyle(2.5, flash ? 0xffffff : 0x88c9ff, 0.95); g.beginPath(); g.arc(e.x, e.y, 22, a - Math.PI / 4, a + Math.PI / 4); g.strokePath();
    }
    if (flash) { g.lineStyle(2, 0xffffff, 0.8); g.strokeCircle(e.x, e.y, 21); }
}
/** Twin engine flames under the player's ship. */
export function essaimFlames(g: G, cannon: number, pulse: number): void {
    for (const side of [-1, 1]) {
        g.fillStyle(0xffab45, .6); g.fillEllipse(cannon + side * 14, CANNON_Y + 19, 8, 12 + pulse * 7);
        g.fillStyle(0xfff7be); g.fillEllipse(cannon + side * 14, CANNON_Y + 17, 3, 9 + pulse * 4);
    }
}
/** An enemy shot: white core, hot outline, ink isolation. */
export function essaimEnemyShot(g: G, shot: Shot): void {
    g.fillStyle(INK); g.fillEllipse(shot.x, shot.y, 11, 17);
    g.fillStyle(0xff466c); g.fillEllipse(shot.x, shot.y, 7, 13);
    g.fillStyle(0xfff8dc); g.fillEllipse(shot.x, shot.y - 1, 3, 8);
    if (shot.mine !== undefined) { g.lineStyle(2, 0xffe89d); g.strokeCircle(shot.x, shot.y, 7); }
}
