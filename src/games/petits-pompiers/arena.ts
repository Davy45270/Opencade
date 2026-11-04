import type Phaser from 'phaser';
import type { Engine } from '../../engines/petits-pompiers/engine';
import type { View } from './view';
import { arenaBase, obstacle, position } from './art';
/** One background bake per load. Breakable objects are independent cached images. */
export class ArenaLayer {
    private keys: string[] = [];
    private background?: Phaser.GameObjects.Image;
    private objects = new Map<number, Phaser.GameObjects.Image>();
    private serial = 0;
    bakes = 0;
    constructor(private scene: Phaser.Scene) {}
    load(e: Engine): void {
        this.reset();
        const key = `pompiers-floor-${String(++this.serial)}`;
        const g = this.scene.make.graphics({ x: 0, y: 0 });
        arenaBase(g, e); g.generateTexture(key, 360, 640); g.destroy(); this.keys.push(key); this.bakes++;
        this.background = this.scene.add.image(0, 0, key).setOrigin(0).setDepth(0);
        for (const [at, tile] of e.tiles.entries()) if ('XbB#'.includes(tile)) {
            const objectKey = `pompiers-object-${String(this.serial)}-${String(at)}`;
            const art = this.scene.make.graphics({ x: 0, y: 0 }); obstacle(art, tile, 12, 12); art.generateTexture(objectKey, 24, 24); art.destroy(); this.keys.push(objectKey);
            const p = position(at); this.objects.set(at, this.scene.add.image(p.x - 12, p.y - 12, objectKey).setOrigin(0).setDepth(1));
        }
    }
    sync(e: Engine): void { for (const [at, image] of this.objects) if (!'XbB#'.includes(e.tiles[at] ?? '')) { image.destroy(); this.objects.delete(at); } }
    view(view: View): void {
        this.background?.setPosition(view.x, view.y).setScale(view.scale);
        for (const [at, image] of this.objects) { const p = position(at); image.setPosition(view.x + (p.x - 12) * view.scale, view.y + (p.y - 12) * view.scale).setScale(view.scale); }
    }
    reset(): void { this.background?.destroy(); this.background = undefined; for (const image of this.objects.values()) image.destroy(); this.objects.clear(); for (const key of this.keys) this.scene.textures.remove(key); this.keys = []; }
    destroy(): void { this.reset(); }
}
