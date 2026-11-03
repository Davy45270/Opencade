import type Phaser from 'phaser';
import type { Engine } from '../../engines/artificiers/engine';
import { characters, drawList, type CharacterId, type Animation } from '../../characters/model';
import { renderCharacter } from '../../characters/phaser';
export const themes = [
    { sky: 0x92ddee, far: 0x64aa99, soil: '#b58b4d', rock: '#637480', grass: '#77bc49', accent: 0x226348 },
    { sky: 0xf5c9a5, far: 0xb58b9e, soil: '#b9764d', rock: '#7b697b', grass: '#e7a54b', accent: 0xc66437 },
    { sky: 0x483b67, far: 0x6c4661, soil: '#96594c', rock: '#4f5266', grass: '#a99a5c', accent: 0xff9a44 },
];
// The entire physical world (including water and falling bodies) ends at y=512.
// Input uses the inverse transform; the control band starts at y=531.
export const WORLD_SCALE = .8;
export const PANEL_TOP = 531;
export const screenY = (y: number): number => y * WORLD_SCALE;
// The shared 240-unit character stage includes transparent margins. At 88 units,
// the smallest painted silhouette is over 40 screen pixels high at 360px width.
export const HERO_SIZE = 88, HERO_X = 44, HERO_Y = 55, LIFE_Y = 61;
export function drawHero(g: Phaser.GameObjects.Graphics, hero: CharacterId, pose: Animation): void {
    renderCharacter(g, drawList(hero, 'face', pose === 'celebration' ? 'joie' : 'concentre', pose, 0, 'reduce'), 0, 0, HERO_SIZE);
    // A compact shoulder launcher, gripped at the stock, baked into every pose.
    g.save(); g.scaleCanvas(HERO_SIZE / 80, HERO_SIZE / 80);
    const accent = Number.parseInt(characters[hero].accent.slice(1), 16);
    g.lineStyle(2, 0x263641); g.fillStyle(accent); g.fillRoundedRect(39, 43, 32, 11, 4); g.strokeRoundedRect(39, 43, 32, 11, 4);
    g.fillStyle(0x263641); g.fillEllipse(70, 48, 6, 10);
    g.fillStyle(0xffe6be); g.fillCircle(46, 54, 4);
    g.lineStyle(2, 0xffe2a0); g.lineBetween(53, 45, 62, 45); g.restore();
}
export interface GraphicsBudget { calls: number; limit: number }
/** Counts every method call on the real dynamic Graphics object, including character paths. */
export function countedGraphics(g: Phaser.GameObjects.Graphics, budget: GraphicsBudget): Phaser.GameObjects.Graphics {
    return new Proxy(g, { get(target, key) {
        const value: unknown = Reflect.get(target, key);
        if (typeof value !== 'function') return value;
        return (...args: unknown[]) => { budget.calls++; return Reflect.apply(value, target, args) as unknown; };
    } });
}
export function drawScenery(g: Phaser.GameObjects.Graphics, world: number): void {
    const t = themes[world] ?? themes[0]; if (!t) return;
    g.fillStyle(t.sky); g.fillRect(0, 0, 360, 640);
    g.fillStyle(world === 2 ? 0xf8ad68 : 0xfff2bc, .9); g.fillCircle(280, 128, 38);
    for (let i = 0; i < 7; i++) {
        g.fillStyle(t.far, .7); g.fillTriangle(i * 66 - 50, 480, i * 66 + 25, 170 + i % 3 * 35, i * 66 + 100, 480);
    }
    if (world === 0) for (let i = 0; i < 10; i++) {
        const x = i * 42 + 10, top = 230 + i % 3 * 38;
        g.lineStyle(7, 0x387e5b, .45); g.lineBetween(x, 600, x, top);
        g.lineStyle(2, 0x9ed57e, .5);
        for (let y = top + 10; y < 600; y += 24) g.lineBetween(x - 4, y, x + 4, y);
        g.fillStyle(0x468f62, .55); g.fillEllipse(x + 10, top + 15, 35, 12); g.fillEllipse(x - 12, top + 32, 30, 10);
    }
    if (world === 1) for (let i = 0; i < 7; i++) {
        const x = i * 62; g.fillStyle(0x805c67, .5); g.fillRect(x, 230, 9, 290);
        g.fillStyle(i % 2 ? 0xeaa04d : 0xd16c4c, .6); g.fillCircle(x, 252, 42); g.fillCircle(x + 19, 219, 30);
    }
    if (world === 2) {
        g.fillStyle(0x353349); g.fillTriangle(-50, 520, 180, 210, 410, 520);
        g.lineStyle(8, 0xef7950, .7); g.lineBetween(183, 239, 155, 355); g.lineBetween(155, 355, 207, 445);
        for (let i = 0; i < 5; i++) { g.fillStyle(0xa7808e, .22); g.fillCircle(180 + i * 8, 184 - i * 17, 16 + i * 4); }
    }
}
/** Original compact silhouettes remain distinct even at projectile scale. */
export function drawMunition(g: Phaser.GameObjects.Graphics, weapon: number, x: number, y: number, size = 6): void {
    if (weapon === 1) {
        g.fillStyle(0x66bd63); g.fillRoundedRect(x - size / 2, y - size, size, size * 2, 2);
        g.lineStyle(2, 0xe5f5ac); g.lineBetween(x - size / 2, y, x + size / 2, y);
    } else if (weapon === 2) {
        g.fillStyle(0xf47e46); g.fillTriangle(x - size, y + size, x, y - size * 1.8, x + size, y + size);
        g.fillStyle(0xffed8b); g.fillCircle(x, y + 1, size / 2);
    } else if (weapon === 3) {
        g.fillStyle(0xf8dafa);
        g.fillPoints(Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5, r = size * (i % 2 ? .45 : 1); return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r }; }), true);
    } else if (weapon === 4) {
        g.lineStyle(3, 0xf69fc5); g.strokeCircle(x, y, size); g.lineBetween(x, y, x + size, y - size);
    } else if (weapon === 5) {
        g.fillStyle(0xedac5b); g.fillEllipse(x - 3, y, size * 2, size); g.fillEllipse(x + 3, y + 3, size, size * 2);
    } else {
        g.fillStyle(0xd4e5e8); g.fillCircle(x, y, size); g.fillStyle(0xffffff); g.fillCircle(x - 2, y - 2, size / 3);
    }
}
export function drawDynamic(g: Phaser.GameObjects.Graphics, e: Engine, reduced: boolean, cachedHeroes = false): void {
    g.clear(); g.save(); g.scaleCanvas(1, WORLD_SCALE);
    g.fillStyle(e.config.world === 2 ? 0xf18142 : 0x329ccb, .9); g.fillRect(0, e.water, 360, 640 - e.water);
    g.lineStyle(2, 0xd0f5fa); g.lineBetween(0, e.water, 360, e.water);
    for (const u of e.units) if (u.hp > 0) {
        const color = Number.parseInt(characters[u.hero].accent.slice(1), 16);
        if (u.id === e.actor.id) { g.lineStyle(2, 0xfff6b9); g.strokeEllipse(u.x, u.y + 25, 42, 9); }
        if (!cachedHeroes) { g.save(); g.translateCanvas(u.x - HERO_X, u.y - HERO_Y); drawHero(g, u.hero, u.vy ? 'saut' : 'repos'); g.restore(); }
        g.fillStyle(0x233344); g.fillRect(u.x - 15, u.y - LIFE_Y, 30, 6);
        g.fillStyle(u.team ? 0xffa48e : 0x8ff1c2); g.fillRect(u.x - 15, u.y - LIFE_Y, Math.min(100, u.hp) * .3, 6);
        g.fillStyle(color); g.fillCircle(u.x + 19, u.y - LIFE_Y + 3, 3);
    }
    if (e.phase === 'aim' && e.status === 'playing') {
        const preview = e.trace({ angle: e.angle, power: e.power, weapon: e.weapon }, 65);
        g.fillStyle(0xfff5bc, .9);
        // Only the first short segment is revealed, preserving the aiming challenge.
        for (const p of preview.points.slice(0, 10)) g.fillCircle(p.x, p.y, 1.8);
    }
    if (e.projectile) {
        const p = e.projectile; drawMunition(g, p.weapon, p.x, p.y);
        g.lineStyle(2, 0xffad4f); g.lineBetween(p.x, p.y, p.x - p.vx * .05, p.y - p.vy * .05);
    }
    if (e.rope) { g.lineStyle(2, 0xffe0a0); g.lineBetween(e.actor.x, e.actor.y, e.rope.x, e.rope.y); }
    for (const c of e.crates) {
        g.fillStyle(c.kind === 'health' ? 0xf5f0dc : 0xe2a157); g.fillRoundedRect(c.x - 7, c.y - 6, 14, 12, 2);
        g.lineStyle(2, 0x8a573c); g.lineBetween(c.x - 6, c.y - 5, c.x + 6, c.y + 5);
    }
    for (const b of e.blasts) {
        const age = (e.time - b.time) / 600;
        g.lineStyle(3, 0xffd477, 1 - age); g.strokeCircle(b.x, b.y, b.radius * (reduced ? .7 : .4 + age));
    }
    g.restore();
    g.fillStyle(0x122e40, .95); g.fillRoundedRect(10, 531, 340, 98, 12);
    // Signed wind gauge, in screen coordinates, with zero at x=280.
    g.lineStyle(2, 0xd0f5fa); g.lineBetween(280, 581, 280 + e.wind, 581);
    g.fillStyle(0x446575); g.fillRoundedRect(22, 595, 205, 14, 6);
    g.fillStyle(0xffcf6e); g.fillRoundedRect(22, 595, 205 * (e.power - 65) / 180, 14, 6);
}
