import type Phaser from 'phaser';
import { required, type Engine } from '../../engines/alunir/engine';
import type { GameCharacter } from '../../characters/game';
type G = Phaser.GameObjects.Graphics;
export function moduleBounds(x: number, y: number, angle: number) {
    const corners = [-37, 37].flatMap(dx => [-54, 14].map(dy => ({ x: x + dx * Math.cos(angle) - dy * Math.sin(angle), y: (y + dx * Math.sin(angle) + dy * Math.cos(angle)) * .88 })));
    const left = Math.min(...corners.map(p => p.x)), top = Math.min(...corners.map(p => p.y));
    return { x: left, y: top, width: Math.max(...corners.map(p => p.x)) - left, height: Math.max(...corners.map(p => p.y)) - top };
}
/** Segment digits keep score labels in the same reusable Graphics object. */
export function scoreMark(g: G, x: number, y: number, value: number): void {
    g.lineStyle(2, 0xfff3b1); g.lineBetween(x, y, x + 5, y + 6); g.lineBetween(x + 5, y, x, y + 6);
    const digits = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
    const segments = [[0,0,6,0],[6,0,6,5],[6,5,6,10],[0,10,6,10],[0,5,0,10],[0,0,0,5],[0,5,6,5]] as const;
    for (const [i, digit] of String(value).split('').entries()) for (const name of digits[Number(digit)] ?? '') {
        const s = segments[name.charCodeAt(0) - 97]; if (s) g.lineBetween(x + 10 + i * 9 + s[0], y + s[1], x + 10 + i * 9 + s[2], y + s[3]);
    }
}
export function lunarSky(g: G, e: Engine, reduced: boolean, part = -1): void {
    if (part < 0 || part === 0) {
    g.fillStyle(0x112456); g.fillRect(0, 0, 360, 640);
    // Three broad nebula ribbons, then three independently moving star planes.
    for (let i = 0; i < 9; i++) { g.fillStyle(i % 2 ? 0x743bac : 0x2079ad, .17); g.fillEllipse(40 + i * 43, 110 + i * 37, 240, 135); }
    }
    for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 32; i++) {
        if (part >= 0 && part !== layer + 1) continue;
        const x = ((i * 83 + layer * 29 - (reduced ? 0 : e.state.x * .025 * (layer + 1))) % 360 + 360) % 360;
        const y = (i * 113 + layer * 71 + (reduced ? 0 : e.state.ticks * .015 * (layer + 1))) % 470 + 20;
        g.fillStyle(([0x8ca6ff, 0x76eaff, 0xffeab6][layer] ?? 0xffeab6), .65 + layer * .15); g.fillCircle(x, y, 1 + layer * .5);
        if (i % 8 === 0) { g.lineStyle(1, 0xc9ffff, .6); g.lineBetween(x - 4, y, x + 4, y); g.lineBetween(x, y - 4, x, y + 4); }
    }
    if (part < 0 || part === 4) {
    const earthX = 275 - (reduced ? 0 : e.state.x * .02);
    g.fillStyle(0x57afff, .14); g.fillCircle(earthX, 122, 52);
    g.fillStyle(0x78e2ff); g.fillCircle(earthX, 122, 43);
    g.fillStyle(0x286bcc); g.fillCircle(earthX + 5, 124, 39);
    g.fillStyle(0x68d9ae); g.fillPoints([{x:earthX-28,y:103},{x:earthX-4,y:87},{x:earthX+12,y:112},{x:earthX-5,y:125},{x:earthX-13,y:144}], true);
    g.lineStyle(4, 0xe4ffff, .8); g.lineBetween(earthX - 29, 118, earthX + 15, 111); g.lineBetween(earthX - 4, 143, earthX + 29, 137);
    }
    if (part < 0 || part === 5) {
    // Distant rim mountains do not indicate collision surfaces.
    for (let i = 0; i < 9; i++) { g.fillStyle(i % 2 ? 0x42558c : 0x304372); g.fillTriangle(i * 48 - 30, 590, i * 48 + 17, 375 + i % 3 * 22, i * 48 + 80, 590); }
    }
}
export function lunarGround(g: G, e: Engine, crater?: (i: number, x: number, y: number) => void): void {
    const points = e.terrain.points;
    g.fillStyle(0x726690); g.fillPoints([...points, { x: 360, y: 728 }, { x: 0, y: 728 }], true);
    for (let layer = 1; layer < 5; layer++) {
        g.fillStyle(([0x5b5079, 0x493e65, 0x382d54, 0x2c2547][layer - 1] ?? 0x2c2547));
        g.fillPoints([...points.map(p => ({ x: p.x, y: p.y + layer * 28 })), {x:360,y:728},{x:0,y:728}], true);
    }
    for (let i = 0; i < 44; i++) {
        const t = (i * 17 % 97) / 97, segment = Math.min(points.length - 2, Math.floor(t * (points.length - 1)));
        const a = required(points[segment]), b = required(points[segment + 1]), fraction = t * (points.length - 1) - segment;
        const x = a.x + (b.x - a.x) * fraction, y = a.y + (b.y - a.y) * fraction + 17 + Math.floor(i / 11) * 31;
        if (crater) crater(i, x, y); else lunarCrater(g, i, x, y);
    }
}
export function lunarModule(g: G, e: Engine, hero: GameCharacter, reduced: boolean): void {
    const s = e.state;
    g.save(); g.translateCanvas(s.x, s.y); g.rotateCanvas(s.angle); g.translateCanvas(0, -18);
    if (e.controls.thrust && s.fuel > 0 && e.status === 'playing') {
        g.fillStyle(0xff7739); g.fillTriangle(-10, 15, 10, 15, 0, 45 + (reduced ? 0 : s.ticks % 4 * 2));
        g.fillStyle(0xfff39a); g.fillTriangle(-5, 17, 5, 17, 0, 35);
    }
    g.lineStyle(5, 0xf7c76c); g.lineBetween(-16, 6, -29, 30); g.lineBetween(16, 6, 29, 30);
    g.lineStyle(4, 0xecfaff); g.lineBetween(-35, 30, -22, 30); g.lineBetween(22, 30, 35, 30);
    g.fillStyle(0x566b99); g.fillRoundedRect(-11, 9, 22, 12, 3);
    g.fillStyle(0xf7b749); g.fillRoundedRect(-25, -11, 50, 27, 9);
    g.lineStyle(3, 0xffedbc); g.strokeRoundedRect(-25, -11, 50, 27, 9);
    g.fillStyle(0x142f60); g.fillCircle(0, -12, 22); g.lineStyle(3, 0x8df2ff); g.strokeEllipse(0, -12, 44, 44);
    hero.draw(g, -20, -33, 40);
    g.lineStyle(2, 0xffffff, .7); g.lineBetween(-16, -24, -10, -30); g.lineBetween(-17, -20, -17, -16);
    g.fillStyle(0xffe48e); for (const x of [-22, 22]) { g.fillCircle(x, 1, 4); }
    g.lineStyle(2, 0x96e7ff); g.lineBetween(20, -18, 29, -29); g.fillStyle(0xff779a); g.fillCircle(29, -29, 3);
    if (e.mission.cargo) { g.fillStyle(0xfaa65b); g.fillRoundedRect(-8, 5, 16, 12, 2); g.lineStyle(2, 0xfff0a8); g.strokeRect(-8, 5, 16, 12); }
    if (e.mission.rescued) { g.fillStyle(0xffffff); g.fillCircle(13, -10, 5); }
    g.restore();
}

export function lunarCrater(g: G, i: number, x: number, y: number): void {
        g.fillStyle(0x302d50, .65); g.fillEllipse(x, y, 15 + i % 4 * 5, 7 + i % 3 * 3);
        g.lineStyle(2, 0xc6adbd, .7); g.strokeEllipse(x, y - 2, 15 + i % 4 * 5, 7 + i % 3 * 3);
        if (i % 3 === 0) { g.fillStyle(0xaaa6c9); g.fillTriangle(x + 9, y, x + 15, y - 12, x + 24, y + 2); }
}
