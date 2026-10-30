import type Phaser from 'phaser';
import { renderCharacter } from './phaser';
import type { Primitive } from './model';

/** A fixed sprite pool. Texture ownership belongs to the game, including scene restarts.
 * Only procedural vector descriptions enter this cache, never external image assets. */
export class ArcadePaint {
    private readonly sprites: Phaser.GameObjects.Image[];
    private used = 0;
    constructor(private readonly scene: Phaser.Scene, budget: number) {
        this.sprites = Array.from({ length: budget }, () => scene.add.image(0, 0, '__WHITE').setVisible(false));
    }
    texture(key: string, list: readonly Primitive[], resolution = 128): string {
        const name = `arcade-vector-75-${key}`;
        if (!this.scene.textures.exists(name)) {
            const graphics = this.scene.make.graphics({ x: 0, y: 0 });
            renderCharacter(graphics, list, 0, 0, resolution);
            graphics.generateTexture(name, resolution, resolution);
            graphics.destroy();
        }
        return name;
    }
    begin(): void { for (let i = 0; i < this.used; i++) this.sprites[i]?.setVisible(false); this.used = 0; }
    draw(key: string, x: number, y: number, size: number, rotation = 0, alpha = 1, depth = 1, height = size): void {
        const sprite = this.sprites[this.used];
        if (!sprite) return;
        this.used++;
        sprite.setTexture(key).setPosition(x, y).setDisplaySize(size, height).setRotation(rotation).setAlpha(alpha).setDepth(depth).setVisible(true);
    }
    stats() { return { capacity: this.sprites.length, used: this.used }; }
    keys(): string[] { return this.sprites.slice(0, this.used).map(sprite => sprite.texture.key); }
    destroy(): void { for (const sprite of this.sprites) sprite.destroy(); this.used = 0; }
}
