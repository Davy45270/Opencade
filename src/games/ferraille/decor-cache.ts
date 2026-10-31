import type Phaser from 'phaser';

/** Scene-owned images, game-owned textures. Baking is explicit and confined to create(). */
export class DecorCache {
    private images: Phaser.GameObjects.Image[];
    private used = 0;
    /** Wall time spent baking textures (diagnostic; reported by the test hook). */
    bakeMs = 0;
    baked = 0;
    constructor(private scene: Phaser.Scene, capacity: number) {
        this.images = Array.from({ length: capacity }, () => scene.add.image(0, 0, '__WHITE').setVisible(false));
    }
    bake(key: string, width: number, height: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
        if (this.scene.textures.exists(key)) return;
        const start = performance.now();
        const g = this.scene.make.graphics({ x: 0, y: 0 });
        draw(g); g.generateTexture(key, width, height); g.destroy();
        this.bakeMs += performance.now() - start; this.baked++;
    }
    begin(): void { for (let i = 0; i < this.used; i++) this.images[i]?.setVisible(false); this.used = 0; }
    draw(key: string, x: number, y: number, width: number, height: number, depth: number): void {
        const image = this.images[this.used++];
        if (!image) throw new Error('Decor image budget exceeded');
        image.setTexture(key).setPosition(x + width / 2, y + height / 2).setDisplaySize(width, height).setDepth(depth).setVisible(true);
    }
    destroy(): void { for (const image of this.images) image.destroy(); this.used = 0; }
}
