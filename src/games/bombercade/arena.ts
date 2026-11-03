import type Phaser from 'phaser';
import { Engine, WIDTH, HEIGHT, LEVELS } from '../../engines/bombercade/engine';
import { palettes, tile, crate } from './art';

/** Only images survive baking: no arena Graphics commands are replayed per frame. */
export class ArenaLayer {
    private signature = '';
    private keys: string[] = [];
    private layers: Phaser.GameObjects.Image[] = [];
    private blocks = new Map<number, { image: Phaser.GameObjects.Image; style: string }>();
    private blockKeys = new Map<string, string>();
    private serial = 0;
    constructor(private scene: Phaser.Scene) {}
    reset(): void {
        for (const { image } of this.blocks.values()) image.destroy();
        this.blocks.clear();
        for (const image of this.layers) image.destroy();
        this.layers = [];
        for (const key of this.keys) this.scene.textures.remove(key);
        this.keys = []; this.blockKeys.clear(); this.signature = '';
    }
    destroy(): void { this.reset(); }
    private bake(draw: (g: Phaser.GameObjects.Graphics) => void, width: number, height: number): string {
        const key = `bombercade-arena-${String(this.serial++)}`;
        const g = this.scene.make.graphics({ x: 0, y: 0 });
        try { draw(g); g.generateTexture(key, width, height); this.keys.push(key); }
        finally { g.destroy(); }
        return key;
    }
    sync(e: Engine): void {
        const level = LEVELS[e.level]; if (!level) return;
        const palette = palettes[level.arena as keyof typeof palettes];
        const signature = JSON.stringify([e.level, e.board.walls, e.board.conveyors, e.board.portals]);
        // Ordinary frames never rebake. Sudden-death walls and test rooms are
        // actual board changes, so replace the old textures before repainting.
        if (signature !== this.signature) {
            this.reset(); this.signature = signature;
            const base = this.bake(g => {
                // generateTexture uses the Canvas renderer: bake the gradient as solid bands.
                for (let band = 0; band < 32; band++) {
                    const t = band / 62;
                    const mix = (shift: number): number => Math.round(((palette[0] >> shift) & 255) * (1 - t) + ((palette[1] >> shift) & 255) * t);
                    g.fillStyle((mix(16) << 16) | (mix(8) << 8) | mix(0)); g.fillRect(0, band * 20, 360, 20);
                }
                g.lineStyle(1, palette[2], .09);
                for (let i = 0; i < 18; i++) {
                    const x = (i * 73) % 360, y = (i * 113) % 640;
                    if (level.arena === 'jungle') { g.fillStyle(palette[2], .08); g.fillEllipse(x, y, 32, 12); g.lineBetween(x - 14, y + 5, x + 14, y - 5); }
                    else if (level.arena === 'château') g.strokeRoundedRect(x, y, 28, 18, 3);
                    else if (level.arena === 'volcan') { g.lineBetween(x - 10, y - 16, x, y); g.lineBetween(x, y, x - 5, y + 15); }
                    else { g.strokeCircle(x, y, 12 + i % 4 * 7); g.lineBetween(x - 6, y - 6, x + 6, y + 6); }
                }
                g.fillStyle(0x050d1b, .6); g.fillRoundedRect(10, 136, 340, 400, 10);
                g.lineStyle(2, palette[2], .7); g.strokeRoundedRect(11, 137, 338, 396, 8);
                for (let at = 0; at < WIDTH * HEIGHT; at++) {
                    const col = at % WIDTH, row = Math.floor(at / WIDTH);
                    tile(g, level.arena as keyof typeof palettes, 15 + col * 30, 140 + row * 30, at, false, false);
                }
                // Floor first: a wall's soft shadow must survive on the next row.
                for (const at of e.board.walls) {
                    const col = at % WIDTH, row = Math.floor(at / WIDTH);
                    tile(g, level.arena as keyof typeof palettes, 15 + col * 30, 140 + row * 30, at, true, col === 0 || col === WIDTH - 1 || row === 0 || row === HEIGHT - 1);
                }
                if (level.arena === 'château') for (const x of [30, 330]) for (const y of [215, 455]) {
                    g.fillStyle(0x251a20); g.fillRoundedRect(x - 4, y - 2, 8, 14, 2);
                    g.fillStyle(0xb58244); g.fillRect(x - 6, y - 3, 12, 4);
                }
                // Static card and speech bubble belong to the baked layer too.
                g.fillStyle(0x071727, .93); g.fillRoundedRect(12, 12, 336, 113, 14);
                g.lineStyle(1, palette[2], .7); g.strokeRoundedRect(12, 12, 336, 113, 14);
                g.lineStyle(2, 0xffdf9c); g.strokeCircle(308, 77, 9);
                g.lineBetween(308, 77, 308, 71); g.lineBetween(308, 77, 313, 80);
                g.fillStyle(0x33475d); g.fillRoundedRect(24, 115, 312, 3, 1);
                g.fillStyle(0xfff3d9); g.fillRoundedRect(15, 550, 330, 70, 12);
                g.fillTriangle(35, 550, 48, 550, 35, 540);

            }, 360, 640);
            this.layers.push(this.scene.add.image(0, 0, base).setOrigin(0).setDepth(-3));
            const overlay = this.bake(g => {
                for (let at = 0; at < WIDTH * HEIGHT; at++) {
                    const x = 15 + at % WIDTH * 30, y = 140 + Math.floor(at / WIDTH) * 30;
                    const belt = e.board.conveyors.find(c => c.at === at);
                    if (belt) { g.lineStyle(2, 0xffe1a1); const dx = belt.direction === 'right' ? 1 : -1; for (let n = 0; n < 3; n++) { const cx = x + 8 + n * 7; g.lineBetween(cx - dx * 3, y + 8, cx + dx * 3, y + 15); g.lineBetween(cx + dx * 3, y + 15, cx - dx * 3, y + 22); } }
                    if (e.board.portals.includes(at)) { g.lineStyle(3, 0xf1abff); g.strokeCircle(x + 15, y + 15, 10); g.strokeCircle(x + 15, y + 15, 5); }
                }
            }, 360, 640);
            this.layers.push(this.scene.add.image(0, 0, overlay).setOrigin(0).setDepth(-1));
        }
        const occupied = new Set(e.board.blocks.map(b => b.at));
        for (const [at, entry] of this.blocks) if (!occupied.has(at)) { entry.image.destroy(); this.blocks.delete(at); }
        for (const block of e.board.blocks) {
            const style = `${block.kind}/${String(block.hp)}`;
            const entry = this.blocks.get(block.at);
            if (entry?.style === style) continue;
            let key = this.blockKeys.get(style);
            if (!key) {
                key = this.bake(g => {
                    crate(g, level.arena as keyof typeof palettes, block);
                }, 32, 34);
                this.blockKeys.set(style, key);
            }
            if (entry) entry.image.destroy();
            const image = this.scene.add.image(15 + block.at % WIDTH * 30, 140 + Math.floor(block.at / WIDTH) * 30, key).setOrigin(0).setDepth(-2);
            this.blocks.set(block.at, { image, style });
        }
    }
}
