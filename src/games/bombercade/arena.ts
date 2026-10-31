import type Phaser from 'phaser';
import { Engine, WIDTH, HEIGHT, LEVELS } from '../../engines/bombercade/engine';
import { palettes } from './art';

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
                g.fillStyle(palette[0]); g.fillRect(0, 0, 360, 640);
                g.lineStyle(1, palette[2], .2); for (let i = 0; i < 9; i++) g.strokeCircle(180, 330, 80 + i * 34);
                const unit = 30, ox = 15, oy = 140;
                for (let at = 0; at < WIDTH * HEIGHT; at++) {
                    const x = ox + at % WIDTH * unit, y = oy + Math.floor(at / WIDTH) * unit;
                    const wall = e.board.walls.includes(at);
                    g.fillStyle(wall ? palette[2] : palette[1], wall ? .85 : .45); g.fillRoundedRect(x + 1, y + 1, 28, 28, wall ? 6 : 3);
                    if (wall) {
                        g.lineStyle(2, palette[0], .35); g.lineBetween(x + 5, y + 9, x + 25, y + 9);
                        if (level.arena === 'jungle') { g.fillStyle(0x285b32); g.fillEllipse(x + 10, y + 12, 15, 6); g.fillEllipse(x + 21, y + 20, 12, 5); }
                        if (level.arena === 'château') { g.fillStyle(palette[0], .55); for (let n = 0; n < 3; n++) g.fillRect(x + 4 + n * 8, y + 1, 4, 5); g.lineBetween(x + 13, y + 9, x + 13, y + 26); }
                        if (level.arena === 'volcan') { g.lineStyle(2, 0xffdf62, .85); g.lineBetween(x + 8, y + 4, x + 19, y + 14); g.lineBetween(x + 19, y + 14, x + 12, y + 26); }
                        if (level.arena === 'sucré') { g.lineStyle(3, 0xffe6f7, .8); g.lineBetween(x + 5, y + 20, x + 20, y + 5); g.fillStyle(0xf56bb5); g.fillCircle(x + 20, y + 21, 4); }
                    }
                }
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
                    const x = 0, y = 0;
                    g.fillStyle(block.kind === 'gold' ? 0xffd153 : block.kind === 'ice' ? 0x9eeaff : palette[3]); g.fillRoundedRect(x + 3, y + 3, 24, 24, 5);
                    g.lineStyle(block.hp === 2 ? 3 : 1, palette[0], .6); g.strokeRoundedRect(x + 6, y + 6, 18, 18, 3); g.lineBetween(x + 7, y + 7, x + 23, y + 23);
                }, 30, 30);
                this.blockKeys.set(style, key);
            }
            if (entry) entry.image.destroy();
            const image = this.scene.add.image(15 + block.at % WIDTH * 30, 140 + Math.floor(block.at / WIDTH) * 30, key).setOrigin(0).setDepth(-2);
            this.blocks.set(block.at, { image, style });
        }
    }
}
