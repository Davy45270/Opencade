import type Phaser from 'phaser';
/** Universal elements of the common charter (ground, block, crate, water, ice, collectible,
 * scenery), drawn in code for the lane D games. Three worlds follow the charter's
 * chapters: bamboo jungle (levels 1-10), autumn (11-20), volcano (21-30). */
export type World = 'jungle' | 'automne' | 'volcan';
type G = Phaser.GameObjects.Graphics;
export function worldOf(level: number): World { return level < 10 ? 'jungle' : level < 20 ? 'automne' : 'volcan'; }
export interface Palette {
    sky: [number, number]; far: number; near: number; foliage: number; trunk: number;
    grass: number; soil: number; stone: number; light: number; accent: number; veil: number;
}
export const palettes: Record<World, Palette> = {
    jungle: { sky: [0x8fdcf0, 0x47b39a], far: 0x3f8f6a, near: 0x2f6f4a, foliage: 0x6fc24a, trunk: 0x9cc95a, grass: 0x63c23c, soil: 0x8a5a32, stone: 0x8e98a8, light: 0xd8f59a, accent: 0xffd34d, veil: 0x0f2a24 },
    automne: { sky: [0xffd59a, 0xe9844a], far: 0xb5643a, near: 0x8c4a2c, foliage: 0xf08a2c, trunk: 0x6b3f25, grass: 0xd8922f, soil: 0x7a4626, stone: 0x9a8f8a, light: 0xffe0a0, accent: 0xff5f3a, veil: 0x2c1710 },
    volcan: { sky: [0x40203a, 0x9a3a2c], far: 0x4a2a30, near: 0x2e1c22, foliage: 0xff7a2a, trunk: 0x3a2a2a, grass: 0x6a4a44, soil: 0x3e2c2a, stone: 0x6c6170, light: 0xffb45d, accent: 0xff5a1f, veil: 0x1a0e12 },
};
function mix(a: number, b: number, t: number): number {
    const c = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
    return (c(16) << 16) | (c(8) << 8) | c(0);
}
export function shade(color: number, t: number): number { return t >= 0 ? mix(color, 0xffffff, t) : mix(color, 0x000000, -t); }
/** Sky in bands, far hills, near trees for the world; `time` only moves embers and leaves. */
export function backdrop(g: G, world: World, width: number, height: number, time = 0): void {
    const p = palettes[world], bands = 12;
    for (let i = 0; i < bands; i++) { g.fillStyle(mix(p.sky[0], p.sky[1], i / (bands - 1))); g.fillRect(0, i * height / bands, width, height / bands + 1); }
    if (world === 'volcan') {
        g.fillStyle(0x2a1820); g.fillTriangle(40, height * .55, 200, height * .18, 360, height * .55);
        g.fillStyle(0xff6a2a, .8); g.fillTriangle(176, height * .2, 200, height * .18, 224, height * .2);
        g.lineStyle(4, 0xff8a3a, .55); g.lineBetween(200, height * .19, 186, height * .4); g.lineBetween(204, height * .2, 222, height * .37);
        for (let i = 0; i < 14; i++) { const y = (height * .55 - ((time * 40 + i * 71) % (height * .45))); g.fillStyle(0xffb45d, .6); g.fillCircle((i * 53 + 17) % width, y, 1.6 + i % 2); }
    } else {
        g.fillStyle(0xffffff, world === 'jungle' ? .55 : .35);
        for (const [x, y] of [[60, 70], [250, 110], [310, 46]] as const) { g.fillEllipse(x, y, 70, 22); g.fillEllipse(x + 22, y - 8, 46, 22); }
        g.fillStyle(world === 'jungle' ? 0xfff6c0 : 0xffe9a8, .9); g.fillCircle(300, 90, 18);
    }
    for (let i = -1; i < 5; i++) { g.fillStyle(p.far); g.fillEllipse(i * 100 + 40, height * .58, 190, 150); }
    for (let i = -1; i < 7; i++) { g.fillStyle(p.near); g.fillEllipse(i * 70 + 10, height * .68, 120, 110); }
    for (let i = 0; i < 7; i++) {
        const x = i * 58 + 8, base = height * .66;
        if (world === 'jungle') {
            g.fillStyle(p.trunk); g.fillRoundedRect(x, base - 170 - (i % 3) * 20, 9, 200, 4);
            g.lineStyle(2, shade(p.trunk, -.3)); for (let j = 1; j < 6; j++) g.lineBetween(x, base - j * 34, x + 9, base - j * 34);
            g.fillStyle(p.foliage); g.fillEllipse(x + 18, base - 150 - (i % 3) * 20, 34, 11); g.fillEllipse(x - 8, base - 110, 30, 10);
        } else if (world === 'automne') {
            const sway = Math.sin(time * 1.5 + i) * 2;
            g.fillStyle(p.trunk); g.fillRect(x + 14, base - 70, 8, 80);
            g.fillStyle(p.foliage); g.fillCircle(x + 18 + sway, base - 88, 26); g.fillStyle(shade(p.foliage, .25)); g.fillCircle(x + 8 + sway, base - 96, 14);
            g.fillStyle(0xffc04a, .8); g.fillCircle(x + 30 + sway, (base - 60 + time * 30 + i * 40) % (height * .9), 3);
        } else {
            g.fillStyle(p.trunk); g.fillTriangle(x + 4, base + 10, x + 14, base - 80 - (i % 2) * 30, x + 24, base + 10);
            g.lineStyle(2, p.accent, .5); g.lineBetween(x + 14, base - 50, x + 10, base);
        }
    }
}
/** Darkened band so the HUD text keeps its contrast over a bright sky. */
export function hudVeil(g: G, world: World, x: number, y: number, width: number, height: number): void {
    g.fillStyle(palettes[world].veil, .78); g.fillRoundedRect(x, y, width, height, 10);
}
/** Soil block with a grass cap, tufts and pebbles (charter: "Sol"/"Herbe"). */
export function groundTile(g: G, world: World, x: number, y: number, s: number, seed: number, cap = true): void {
    const p = palettes[world];
    g.fillStyle(p.soil); g.fillRect(x, y, s, s);
    g.fillStyle(shade(p.soil, -.25)); g.fillCircle(x + s * (.25 + (seed % 3) * .2), y + s * .7, s * .07); g.fillCircle(x + s * (.7 - (seed % 2) * .3), y + s * .5, s * .05);
    if (!cap) return;
    g.fillStyle(p.grass); g.fillRect(x, y, s, s * .3);
    g.fillStyle(shade(p.grass, .25)); g.fillRect(x, y, s, s * .08);
    for (let i = 0; i < 3; i++) { const tx = x + s * (.15 + i * .32); g.fillStyle(p.grass); g.fillTriangle(tx, y + s * .3, tx + s * .12, y + s * .3, tx + s * .06, y + s * .42); }
}
/** Plain floor tile, lighter checker for readability. */
export function floorTile(g: G, world: World, x: number, y: number, s: number, odd: boolean): void {
    const p = palettes[world], base = world === 'volcan' ? 0x4a3a3c : world === 'automne' ? 0xc9955a : 0x9bd06a;
    g.fillStyle(odd ? shade(base, -.08) : base); g.fillRect(x, y, s, s);
    g.fillStyle(shade(base, .18)); g.fillRect(x, y, s, Math.max(1, s * .06));
    g.fillStyle(shade(p.soil, .1), .35); g.fillCircle(x + s * .3, y + s * .65, s * .05);
}
/** Stone block with bevel highlights and a crack (charter: "Roche"/"Bloc"). */
export function stoneBlock(g: G, world: World, x: number, y: number, s: number, seed = 0): void {
    const base = palettes[world].stone;
    g.fillStyle(shade(base, -.35)); g.fillRoundedRect(x, y, s, s, s * .14);
    g.fillStyle(base); g.fillRoundedRect(x + s * .04, y + s * .04, s * .9, s * .86, s * .12);
    g.fillStyle(shade(base, .3)); g.fillRoundedRect(x + s * .1, y + s * .08, s * .55, s * .16, s * .06);
    g.lineStyle(Math.max(1, s * .05), shade(base, -.45));
    if (seed % 2) { g.lineBetween(x + s * .55, y + s * .4, x + s * .7, y + s * .62); g.lineBetween(x + s * .7, y + s * .62, x + s * .62, y + s * .8); }
    else g.lineBetween(x + s * .25, y + s * .55, x + s * .45, y + s * .72);
    if (world === 'jungle' && seed % 3 === 0) { g.fillStyle(0x6fc24a, .9); g.fillEllipse(x + s * .3, y + s * .08, s * .5, s * .16); }
    if (world === 'volcan' && seed % 3 === 0) { g.lineStyle(Math.max(1, s * .04), 0xff7a2a, .8); g.lineBetween(x + s * .2, y + s * .3, x + s * .38, y + s * .5); }
}
/** Wooden crate: frame, planks, diagonal brace, nails (charter: "Caisse"). */
export function crate(g: G, x: number, y: number, s: number, tone = 0xd08a3e): void {
    const dark = shade(tone, -.45), light = shade(tone, .25);
    g.fillStyle(dark); g.fillRoundedRect(x, y, s, s, s * .1);
    g.fillStyle(tone); g.fillRect(x + s * .12, y + s * .12, s * .76, s * .76);
    g.lineStyle(Math.max(1, s * .03), shade(tone, -.25));
    for (let i = 1; i < 3; i++) g.lineBetween(x + s * .12, y + s * (.12 + i * .253), x + s * .88, y + s * (.12 + i * .253));
    g.lineStyle(Math.max(2, s * .12), dark); g.lineBetween(x + s * .16, y + s * .84, x + s * .84, y + s * .16);
    g.fillStyle(light); g.fillRect(x + s * .06, y + s * .05, s * .88, s * .05);
    g.fillStyle(0x3a2a20); for (const [u, v] of [[.06, .06], [.88, .06], [.06, .88], [.88, .88]] as const) g.fillCircle(x + s * (u + .03), y + s * (v + .03), Math.max(1, s * .035));
}
/** Ice slab: pale blue, bevel and glints (charter: "Glace"/"Neige"). */
export function iceTile(g: G, x: number, y: number, s: number): void {
    g.fillStyle(0x7cc4ef); g.fillRect(x, y, s, s);
    g.fillStyle(0xbfe8ff); g.fillRect(x + s * .06, y + s * .06, s * .88, s * .82);
    g.lineStyle(Math.max(1, s * .05), 0xffffff, .85); g.lineBetween(x + s * .2, y + s * .7, x + s * .45, y + s * .3); g.lineBetween(x + s * .55, y + s * .8, x + s * .8, y + s * .4);
    g.fillStyle(0xffffff, .9); g.fillCircle(x + s * .78, y + s * .2, Math.max(1, s * .05));
}
/** Water strip with moving wave crests (charter: "Eau"); lava in the volcano world. */
export function water(g: G, world: World, x: number, y: number, w: number, h: number, time: number): void {
    const lava = world === 'volcan', base = lava ? 0xd2451f : world === 'automne' ? 0x2f7fa6 : 0x2f9fd0;
    g.fillStyle(base); g.fillRect(x, y, w, h);
    g.fillStyle(shade(base, -.18)); g.fillRect(x, y + h * .65, w, h * .35);
    g.lineStyle(2, lava ? 0xffc04a : 0xcff3ff, .75);
    for (let i = 0; i < Math.ceil(w / 28) + 1; i++) {
        const wx = x + ((i * 28 + time * 22) % (w + 28)) - 14, wy = y + h * (.3 + (i % 2) * .25);
        if (wx < x || wx + 12 > x + w) continue;
        g.beginPath(); g.arc(wx + 6, wy + 4, 6, Math.PI * 1.15, Math.PI * 1.85); g.strokePath();
    }
}
/** Gold coin with rim and shine (charter: "Collectible"). */
export function coin(g: G, cx: number, cy: number, r: number, time = 0): void {
    const squash = .55 + .45 * Math.abs(Math.cos(time * 2.4));
    g.fillStyle(0xb8860b); g.fillEllipse(cx, cy, r * 2 * squash, r * 2);
    g.fillStyle(0xffd34d); g.fillEllipse(cx, cy, r * 1.6 * squash, r * 1.6);
    g.fillStyle(0xfff3b0); g.fillEllipse(cx - r * .25 * squash, cy - r * .3, r * .5 * squash, r * .6);
}
/** Faceted gem block in a vivid colour (charter: brick-breaker bricks and bubble-shooter crystals). */
export function gemBlock(g: G, x: number, y: number, s: number, color: number, alpha = 1): void {
    g.fillStyle(shade(color, -.4), alpha); g.fillRoundedRect(x, y, s, s, s * .16);
    g.fillStyle(color, alpha); g.fillRoundedRect(x + s * .07, y + s * .07, s * .86, s * .8, s * .12);
    g.fillStyle(shade(color, .35), alpha); g.fillTriangle(x + s * .12, y + s * .12, x + s * .88, y + s * .12, x + s * .5, y + s * .45);
    g.fillStyle(shade(color, -.18), alpha); g.fillTriangle(x + s * .12, y + s * .82, x + s * .88, y + s * .82, x + s * .5, y + s * .5);
    g.fillStyle(0xffffff, .75 * alpha); g.fillCircle(x + s * .28, y + s * .26, Math.max(1, s * .07));
}
/** Small car seen from above, facing `dir` (charter: kart racing vehicles). */
export function car(g: G, x: number, y: number, w: number, h: number, color: number, dir: number): void {
    g.fillStyle(0x1b1b22); for (const u of [.18, .72]) { g.fillRoundedRect(x + w * u, y - h * .06, w * .16, h * .2, 2); g.fillRoundedRect(x + w * u, y + h * .86, w * .16, h * .2, 2); }
    g.fillStyle(shade(color, -.35)); g.fillRoundedRect(x, y + h * .06, w, h * .88, h * .3);
    g.fillStyle(color); g.fillRoundedRect(x + w * .03, y + h * .1, w * .94, h * .72, h * .26);
    const front = dir > 0 ? x + w * .62 : x + w * .14;
    g.fillStyle(0xbfe9ff); g.fillRoundedRect(front, y + h * .22, w * .22, h * .5, 3);
    g.fillStyle(shade(color, .35)); g.fillRoundedRect(x + w * .36, y + h * .2, w * .22, h * .52, 3);
    g.fillStyle(0xfff3a0); const lamp = dir > 0 ? x + w * .95 : x + w * .05; g.fillCircle(lamp, y + h * .25, Math.max(1.5, h * .08)); g.fillCircle(lamp, y + h * .7, Math.max(1.5, h * .08));
}
/** Floating log with bark and end rings (charter: "Bois"). */
export function log(g: G, x: number, y: number, w: number, h: number): void {
    g.fillStyle(0x6b4226); g.fillRoundedRect(x, y, w, h, h * .45);
    g.fillStyle(0x8a5a32); g.fillRoundedRect(x + 2, y + 2, w - 4, h * .55, h * .35);
    g.lineStyle(1.5, 0x4f2f1a); g.lineBetween(x + w * .2, y + h * .3, x + w * .45, y + h * .3); g.lineBetween(x + w * .5, y + h * .62, x + w * .8, y + h * .62);
    g.fillStyle(0xd9a86a); g.fillEllipse(x + w - h * .32, y + h / 2, h * .5, h * .8); g.lineStyle(1, 0x8a5a32); g.strokeEllipse(x + w - h * .32, y + h / 2, h * .26, h * .44);
}
/** Turtle seen from above: shell with plates, head and flippers. */
export function turtle(g: G, cx: number, cy: number, r: number, dir: number, diving = false): void {
    if (diving) { g.fillStyle(0x6fd0c8, .5); g.fillEllipse(cx, cy, r * 2.1, r * 1.5); }
    g.fillStyle(0x7ac35a); g.fillCircle(cx + dir * r * 1.05, cy, r * .38);
    for (const [u, v] of [[-.6, -.75], [.6, -.75], [-.6, .75], [.6, .75]] as const) g.fillEllipse(cx + u * r, cy + v * r, r * .55, r * .4);
    g.fillStyle(0x2f7a3a); g.fillEllipse(cx, cy, r * 2, r * 1.6);
    g.fillStyle(0x58a84a); g.fillEllipse(cx, cy, r * 1.5, r * 1.15);
    g.lineStyle(1.5, 0x2f6a30); g.lineBetween(cx - r * .7, cy, cx + r * .7, cy); g.lineBetween(cx - r * .2, cy - r * .55, cx - r * .2, cy + r * .55); g.lineBetween(cx + r * .3, cy - r * .55, cx + r * .3, cy + r * .55);
}
/** Round shrub used as decoration on grass strips. */
export function shrub(g: G, world: World, cx: number, cy: number, r: number): void {
    const p = palettes[world];
    g.fillStyle(shade(p.foliage, -.3)); g.fillCircle(cx, cy, r); g.fillStyle(p.foliage); g.fillCircle(cx - r * .3, cy - r * .3, r * .7);
    if (world !== 'volcan') { g.fillStyle(p.accent); g.fillCircle(cx + r * .35, cy - r * .1, r * .18); }
}
/** Static scenery baked into one texture: a Graphics object replays every command on each
 * rendered frame, so hundreds of tiles would be rasterised sixty times a second. Painting
 * happens only when the key (level, board) changes; the frame then shows a single image. */
export class SceneryLayer {
    readonly g: G;
    private image: Phaser.GameObjects.Image;
    private key: unknown = null;
    constructor(private scene: Phaser.Scene, private name: string) {
        this.image = scene.add.image(0, 0, '__DEFAULT').setOrigin(0, 0).setDepth(-1);
        this.g = scene.make.graphics({}, false);
        scene.events.once('shutdown', () => { this.g.destroy(); });
    }
    /** True (and the brush cleared) when the scenery must be repainted for `key`. */
    stale(key: unknown): boolean {
        if (this.key === key) return false;
        this.key = key; this.g.clear(); return true;
    }
    commit(): void {
        const texture = `${this.name}-scenery`;
        this.image.setTexture('__DEFAULT');
        if (this.scene.textures.exists(texture)) this.scene.textures.remove(texture);
        this.g.generateTexture(texture, 360, 640); this.image.setTexture(texture);
    }
}
/** Bake `draw` once into a texture named `key` (size w × h) and return the key. */
export function baked(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void): string {
    if (!scene.textures.exists(key)) {
        const g = scene.make.graphics({}, false);
        draw(g); g.generateTexture(key, Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h))); g.destroy();
    }
    return key;
}
/** Texture key of one gem block (colour × size), baked once with the full drawing. */
export function gemTexture(scene: Phaser.Scene, color: number, size: number): string {
    return baked(scene, `gem-${color.toString(16)}-${String(size)}`, size, size, g => { gemBlock(g, 0, 0, size, color); });
}
/** Reused images for pieces drawn each frame: one image per piece, no per-frame geometry
 * (the voie C bead approach). Call begin(), then show()/block() for each, then end(). */
export class BlockPool {
    private images: Phaser.GameObjects.Image[] = [];
    private used = 0;
    constructor(private scene: Phaser.Scene, private depth = 0) {}
    begin(): void { this.used = 0; }
    show(key: string, x: number, y: number, alpha = 1): void {
        let image = this.images[this.used];
        if (!image) { image = this.scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(this.depth); this.images.push(image); }
        image.setTexture(key).setPosition(x, y).setAlpha(alpha).setVisible(true);
        this.used++;
    }
    block(x: number, y: number, size: number, color: number, alpha = 1): void { this.show(gemTexture(this.scene, color, size), x, y, alpha); }
    end(): void { for (let i = this.used; i < this.images.length; i++) this.images[i]?.setVisible(false); }
}
