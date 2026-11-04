import type Phaser from 'phaser';
import { drawList, type CharacterId } from '../../characters/model';
import { renderCharacter } from '../../characters/phaser';
import { Engine, TILE, WIDTH } from '../../engines/petits-pompiers/engine';
import { waterEnd } from './view';
type G = Phaser.GameObjects.Graphics;
export const UNIT = 24, OX = 12, OY = 190;
export const ink = 0x263c51;
export function position(at: number): { x: number; y: number } { return { x: OX + (at % WIDTH + .5) * UNIT, y: OY + (Math.floor(at / WIDTH) + .5) * UNIT }; }
export function flame(g: G, x: number, y: number, size: number, time = 0): void {
    const sway = Math.sin(time / 180) * size * .12;
    g.fillStyle(0xef6244); g.fillEllipse(x, y, size, size * 1.2);
    g.fillTriangle(x - size / 2, y, x + size / 2, y, x + sway, y - size);
    g.fillStyle(0xffd45e); g.fillEllipse(x, y + size * .15, size * .55, size * .7);
    g.fillTriangle(x - size * .27, y, x + size * .27, y, x - sway, y - size * .5);
}
export function drop(g: G, x: number, y: number, size: number): void {
    g.fillStyle(0x51c9f0); g.fillCircle(x, y, size * .6); g.fillTriangle(x - size * .58, y, x + size * .58, y, x, y - size);
    g.fillStyle(0xc1f5ff); g.fillEllipse(x - size * .2, y - size * .1, size * .2, size * .6);
}
export function cross(g: G, x: number, y: number, size = 6): void { g.fillStyle(0xf6fff0); g.fillRoundedRect(x - size, y - size / 3, size * 2, size * 2 / 3, 2); g.fillRoundedRect(x - size / 3, y - size, size * 2 / 3, size * 2, 2); }
export function victim(g: G, x: number, y: number, species: string, size = 15): void {
    g.fillStyle(ink); g.fillEllipse(x, y + size * .4, size, size * .3);
    g.fillStyle(species === 'person' ? 0x5eabd2 : species === 'cat' ? 0xf4b45f : 0xbf8a65);
    g.fillRoundedRect(x - size * .4, y, size * .8, size * .7, 4);
    if (species !== 'person') { g.fillTriangle(x - size * .45, y, x - size * .4, y - size * .7, x, y - size * .2); g.fillTriangle(x, y - size * .2, x + size * .4, y - size * .7, x + size * .45, y); }
    g.fillStyle(species === 'person' ? 0xffd5a4 : species === 'cat' ? 0xf4b45f : 0xbf8a65); g.fillCircle(x, y - size * .2, size * .45);
    g.fillStyle(ink); g.fillCircle(x - size * .15, y - size * .23, 1.2); g.fillCircle(x + size * .15, y - size * .23, 1.2);
}
/** Shared cast supplies the face, tail, mane, wings and alternating feet. Uniform is original vector art. */
export function firefighter(g: G, id: CharacterId, x: number, y: number, size: number, time: number, dx: number, dy: number, moving: boolean, won: boolean, hurt: boolean): void {
    const pose = dy < 0 ? 'dos' : dx ? 'profil' : 'face';
    const list = drawList(id, pose, won ? 'joie' : hurt ? 'surprise' : 'concentre', won ? 'celebration' : moving ? 'marche' : 'repos', time, 'full').filter(p => !p.effect);
    const left = x - size / 2, top = y - size * .77;
    renderCharacter(g, list, left, top, size, dx < 0);
    const s = size / 240, xx = (n: number) => left + n * s, yy = (n: number) => top + n * s;
    g.fillStyle(0xe54f38); g.lineStyle(4 * s, ink);
    g.fillRoundedRect(xx(80), yy(141), 80 * s, 49 * s, 12 * s); g.strokeRoundedRect(xx(80), yy(141), 80 * s, 49 * s, 12 * s);
    g.fillStyle(0xe54f38); g.fillRoundedRect(xx(61), yy(137), 27 * s, 39 * s, 12 * s); g.fillRoundedRect(xx(152), yy(137), 27 * s, 39 * s, 12 * s);
    if (won) {
        g.lineStyle(18 * s, 0xe54f38); g.lineBetween(xx(82), yy(149), xx(52), yy(105)); g.lineBetween(xx(159), yy(149), xx(188), yy(105));
        g.fillStyle(ink); g.fillCircle(xx(52), yy(102), 12 * s); g.fillCircle(xx(188), yy(102), 12 * s);
    }
    g.fillStyle(0xffdb65); g.fillRect(xx(82), yy(151), 76 * s, 9 * s); g.fillRect(xx(84), yy(178), 72 * s, 8 * s);
    g.fillStyle(ink); g.fillRect(xx(115), yy(141), 9 * s, 47 * s);
    if (id === 'singe') { g.fillStyle(0xf79dcc); g.fillTriangle(xx(87), yy(177), xx(153), yy(177), xx(174), yy(198)); g.fillTriangle(xx(87), yy(177), xx(66), yy(198), xx(174), yy(198)); g.lineStyle(2 * s, 0xd765a1); for (const n of [90, 110, 130, 150]) g.lineBetween(xx(n), yy(181), xx(n - 3), yy(197)); }
    g.fillStyle(0xe94f38); g.fillRoundedRect(xx(69), yy(30), 106 * s, 45 * s, 22 * s); g.lineStyle(4 * s, ink); g.strokeRoundedRect(xx(69), yy(30), 106 * s, 45 * s, 22 * s);
    g.fillStyle(0xf86a49); g.fillEllipse(xx(122), yy(72), 131 * s, 14 * s);
    g.fillStyle(0xffdd69); g.fillRoundedRect(xx(110), yy(41), 24 * s, 29 * s, 7 * s); flame(g, xx(122), yy(57), 12 * s);
    if (id === 'licorne') { g.fillStyle(0xffe894); g.fillTriangle(xx(139), yy(31), xx(158), yy(33), xx(153), yy(2)); g.lineStyle(2 * s, 0xf5d246); g.strokeEllipse(x, yy(17), size * .66, size * .14); }
}
export function obstacle(g: G, tile: string, x: number, y: number): void {
    if ('XbB'.includes(tile)) { g.fillStyle(0xc78a4f); g.fillRoundedRect(x - 10, y - 10, 20, 20, 3); g.lineStyle(2, 0x855939); g.strokeRect(x - 9, y - 9, 18, 18); g.lineBetween(x - 8, y - 8, x + 8, y + 8); g.lineBetween(x + 8, y - 8, x - 8, y + 8); }
    if (tile === '#') { g.fillStyle(0x8795a2); for (const [dx, dy, r] of [[-6, 4, 6], [3, -3, 8], [8, 6, 5]]) g.fillCircle(x + (dx ?? 0), y + (dy ?? 0), r ?? 5); }
}
export function tileArt(g: G, tile: string, x: number, y: number, world: string, at: number): void {
    const snow = world.includes('montagne'), port = world.includes('port'), city = world.includes('ville'), forest = world.includes('forêt');
    g.fillStyle(tile === '~' ? 0x69c8dd : tile === 's' || snow && tile === 'g' ? 0xe2f1ef : tile === 'g' || tile === 'T' ? (forest ? at % 2 ? 0x71a66f : 0x80b27a : at % 2 ? 0x8dbd72 : 0x95c67d) : tile === 'H' ? 0xe4bd89 : city ? 0xadb9bf : port ? 0xc0c7af : 0xdacdb1);
    g.fillRect(x - 12, y - 12, 24, 24);
    if (tile === 'g') { g.lineStyle(1, snow ? 0xffffff : 0x76a866, .5); g.lineBetween(x - 7, y + 5, x - 5, y + 1); g.lineBetween(x + 5, y - 6, x + 7, y - 3); }
    if (tile === 'W') { g.fillStyle(city ? 0x687c91 : 0x6f8e8f); g.fillRoundedRect(x - 12, y - 12, 24, 24, 3); g.lineStyle(1, 0xa3b5b0); g.lineBetween(x - 11, y, x + 11, y); g.lineBetween(x, y, x, y + 11); }
    if (tile === 'T') { g.fillStyle(0x8a6547); g.fillRect(x - 3, y, 6, 11); g.fillStyle(0x40865c); g.fillCircle(x, y - 4, 12); g.fillStyle(0x65a46b); g.fillCircle(x - 3, y - 8, 7); }
    if (tile === '~') { g.lineStyle(2, 0xa5e5e7); g.lineBetween(x - 9, y, x + 7, y - 2); }
    if (tile === 'D' || tile === 'U') { g.fillStyle(0x9b7051); g.fillRoundedRect(x - 10, y - 11, 20, 22, 2); g.fillStyle(0x8dd8eb); g.fillRect(x - 7, y - 8, 14, tile === 'U' ? 15 : 10); g.lineStyle(2, 0xffe7b0); g.lineBetween(x, y - 8, x, y + 6); }
    if (tile === 'R') { g.fillStyle(0xe75c49); g.fillRoundedRect(x - 5, y - 9, 10, 19, 3); g.fillRect(x - 9, y - 4, 18, 5); g.fillStyle(0xffce73); g.fillCircle(x, y - 7, 2); }
    if (tile === 'S') { g.fillStyle(0x50ae83); g.fillRoundedRect(x - 11, y - 10, 22, 20, 5); cross(g, x, y); }
    if (tile === 'E') { g.fillStyle(ink); g.fillCircle(x - 7, y + 8, 4); g.fillCircle(x + 7, y + 8, 4); g.fillStyle(0xe9543e); g.fillRoundedRect(x - 12, y - 6, 24, 14, 3); g.fillStyle(0xa7e6f2); g.fillRect(x + 4, y - 4, 6, 6); g.fillStyle(0xffdd73); g.fillRect(x - 10, y + 2, 20, 3); g.fillStyle(0x7dcedd); g.fillRect(x - 5, y - 9, 8, 3); }
}
export function backdrop(g: G, e: Engine): void {
    g.fillStyle(0xeef4e9); g.fillRect(0, 0, 360, 640);
    g.fillStyle(e.level.world.includes('forêt') ? 0xb4d8bf : e.level.world.includes('ville') ? 0xc4d4e6 : e.level.world.includes('port') ? 0xb0dbe6 : 0xc4e4e7); g.fillRoundedRect(8, 124, 344, 322, 24);
    g.fillStyle(0x9bc9ba); g.fillTriangle(8, 190, 82, 136, 166, 190); g.fillTriangle(150, 190, 252, 133, 352, 190);
    if (e.level.world.includes('ville')) for (const [x, h] of [[20, 38], [58, 50], [285, 40], [320, 55]]) { g.fillStyle(0x8ea9bb); g.fillRoundedRect(x ?? 0, 190 - (h ?? 0), 24, h ?? 0, 3); g.fillStyle(0xf5e4aa); g.fillRect((x ?? 0) + 5, 155, 5, 6); }
    if (e.level.world.includes('forêt')) for (const x of [25, 50, 82, 284, 318, 335]) { g.fillStyle(0x3d8866); g.fillTriangle(x - 14, 188, x + 14, 188, x, 145 + x % 12); }
    if (e.level.world.includes('quartier')) for (const x of [32, 291]) { g.fillStyle(0xf0c38b); g.fillRect(x, 160, 31, 29); g.fillStyle(0xc97a59); g.fillTriangle(x - 5, 160, x + 36, 160, x + 15, 144); }
    if (e.level.world.includes('montagne')) { g.fillStyle(0xffffff); g.fillTriangle(221, 150, 252, 133, 281, 150); }
    if (e.level.world.includes('port')) { g.lineStyle(4, 0x6c8e94); g.lineBetween(300, 187, 300, 140); g.lineBetween(285, 140, 330, 140); }
    g.fillStyle(0xffffff, .7); g.fillEllipse(70, 150, 60, 16); g.fillEllipse(191, 146, 50, 14);
}
export function arenaBase(g: G, e: Engine): void {
    backdrop(g, e);
    for (const [at, tile] of e.tiles.entries()) { const p = position(at); tileArt(g, 'XbB#'.includes(tile) ? 'H' : tile, p.x, p.y, e.level.world, at); }
}
export function dynamicArt(g: G, e: Engine, reduced = false): void {
    const time = reduced ? 0 : e.time;
    for (const f of e.fires) { const p = position(f.at); if (e.level.smoke) { g.fillStyle(0x859097, .4); for (let i = 0; i < 3; i++) g.fillCircle(p.x + i * 5 - 5, p.y - 13 - i * 4, 8); } flame(g, p.x, p.y, 5 + f.intensity * 5, time + f.at); }
    for (const v of e.victims) if (!v.saved && v.id !== e.player.carried && !v.hidden) victim(g, OX + v.x / TILE * UNIT, OY + v.y / TILE * UNIT - (v.upper ? 7 : 0), v.species);
    for (const p of e.pickups) { const at = position(p.at); g.fillStyle(0xffdc75); g.fillRoundedRect(at.x - 8, at.y - 8, 16, 16, 4); toolArt(g, p.tool, at.x, at.y); }
    for (const at of e.ladders) { const p = position(at); g.lineStyle(2, 0xe5eff1); g.lineBetween(p.x - 6, p.y - 12, p.x - 6, p.y + 30); g.lineBetween(p.x + 6, p.y - 12, p.x + 6, p.y + 30); for (let n = -8; n < 30; n += 7) g.lineBetween(p.x - 6, p.y + n, p.x + 6, p.y + n); }
    // Victory uses one centered celebration in the HUD layer.
    if (e.status === 'won') return;
    const p = e.player, x = OX + p.x / TILE * UNIT, y = OY + p.y / TILE * UNIT;
    if (p.immune > 0) { g.fillStyle(0xffdf93, reduced ? .18 : .15 + Math.sin(time / 180) * .06); g.fillEllipse(x, y - 9, 48, 45); }
    if (e.character === 'licorne') { g.lineStyle(2, 0xffd654, .6); g.strokeEllipse(x, y + 4, 42, 16); }
    firefighter(g, e.character, x, y, 48, time, p.dx, p.dy, Boolean(e.intent.dx || e.intent.dy) && !e.job, false, p.immune > 0);
    if (p.carried >= 0) { const v = e.victims[p.carried]; if (v) victim(g, x + 16, y - 25, v.species, 21); }
    if (e.job?.kind === 'spray' || e.job?.kind === 'foam') {
        const end = waterEnd(e), start = { x: x + p.dx * 12, y: y - 5 + p.dy * 12 };
        g.lineStyle(7, 0xe9543e); g.lineBetween(x, y - 8, start.x, start.y);
        g.lineStyle(4, ink); g.lineBetween(start.x, start.y, start.x + p.dx * 6, start.y + p.dy * 6);
        g.lineStyle(3, 0xc0f3ff, .8); g.lineBetween(start.x, start.y, end.x, end.y);
        for (let n = 0; n < 14; n++) {
            const t = (n / 14 + time / 1600) % 1;
            drop(g, start.x + (end.x - start.x) * t, start.y + (end.y - start.y) * t - Math.sin(t * Math.PI) * 5, 2.3 + n % 2);
        }
    } else if (e.job) { g.fillStyle(0xfff1bd); g.fillCircle(x + 19, y - 5, 9); toolArt(g, { break: 'axe', climb: 'ladder', heal: 'kit', call: 'megaphone', pickup: 'kit', deposit: 'kit', refill: 'hose' }[e.job.kind], x + 19, y - 5); }
    const guide = e.nextObjective();
    if (e.status === 'playing' && guide.at >= 0) {
        const goal = position(guide.at), bob = reduced ? 0 : Math.sin(time / 220) * 3;
        g.fillStyle(0xffe27a); g.lineStyle(2, ink); g.fillTriangle(goal.x - 6, goal.y - 29 + bob, goal.x + 6, goal.y - 29 + bob, goal.x, goal.y - 19 + bob); g.strokeTriangle(goal.x - 6, goal.y - 29 + bob, goal.x + 6, goal.y - 29 + bob, goal.x, goal.y - 19 + bob);
    }
}
export function toolArt(g: G, tool: string, x: number, y: number): void {
    g.lineStyle(2, ink);
    if (tool === 'ladder') { g.lineBetween(x - 4, y - 6, x - 4, y + 6); g.lineBetween(x + 4, y - 6, x + 4, y + 6); for (const n of [-4, 0, 4]) g.lineBetween(x - 4, y + n, x + 4, y + n); }
    else if (tool === 'kit') { g.fillStyle(0xe75b49); g.fillRoundedRect(x - 7, y - 5, 14, 11, 3); cross(g, x, y, 4); }
    else if (tool === 'axe') { g.lineBetween(x - 5, y + 6, x + 3, y - 6); g.fillStyle(0x8ca2af); g.fillTriangle(x, y - 6, x + 7, y - 6, x + 6, y); }
    else if (tool === 'megaphone') { g.fillStyle(0x7ec7df); g.fillTriangle(x - 6, y, x + 6, y - 6, x + 6, y + 6); }
    else drop(g, x, y, 5);
}
