import type Phaser from 'phaser';
import { TILE, type Engine } from '../../engines/petits-pompiers/engine';
import type { View } from './view';
import { groundPlan, objectPlan, project, type Placement } from './iso';
import { SPRITES, TEXELS } from './sprites';
/** Texture key of an iso sprite (loaded once by the scene). */
export const spriteKey = (key: string): string => `pompiers-iso-${key}`;
type Image = Phaser.GameObjects.Image;
/** Static isometric map: ground diamonds and standing objects, one build per load. Breakable
 *  obstacles are independent images, removed as soon as the engine clears their cell. */
export class ArenaLayer {
    private images: { image: Image; place: Placement }[] = [];
    private objects = new Map<number, { image: Image; place: Placement }>();
    private last = '';
    bakes = 0;
    constructor(private scene: Phaser.Scene) {}
    /** False until the sprites are loaded: the scene loads again once they are. */
    ready(): boolean { return this.scene.textures.exists(spriteKey('sol_herbe')); }
    load(e: Engine): void {
        this.reset();
        if (!this.ready()) return;
        this.bakes++;
        for (const place of [...groundPlan(e), ...objectPlan(e)]) {
            const s = SPRITES[place.key];
            const image = this.scene.add.image(0, 0, spriteKey(place.key)).setOrigin(s.ox, s.oy).setDepth(place.depth).setAlpha(place.alpha);
            if (place.flip) image.setFlipX(true);
            const entry = { image, place };
            if (place.at >= 0 && place.depth > 0) this.objects.set(place.at, entry); else this.images.push(entry);
        }
    }
    sync(e: Engine): void { for (const [at, { image }] of this.objects) if (!'XbB#'.includes(e.tiles[at] ?? '')) { image.destroy(); this.objects.delete(at); } }
    /** `e` fades the objects standing just in front of the firefighter, so that he is never hidden. */
    view(view: View, e?: Engine): void {
        if (e) {
            const gx = e.player.x / TILE, gy = e.player.y / TILE;
            // Only what is taller than the firefighter's shoulders can hide him: hydrants, crates and the safe spot stay solid.
            for (const { image, place } of [...this.images, ...this.objects.values()]) if (place.depth > 0 && SPRITES[place.key].h / TEXELS > 40) {
                const ahead = place.gx + place.gy - gx - gy, side = Math.abs(place.gx - place.gy - gx + gy);
                image.setAlpha(ahead > .2 && ahead < 3.2 && side < 1.6 ? Math.min(place.alpha, .45) : place.alpha);
            }
        }
        const key = `${String(view.x)}|${String(view.y)}|${String(view.scale)}|${String(this.objects.size)}|${String(this.bakes)}`;
        if (key === this.last) return; this.last = key;
        // Ground diamonds overlap by a hair so that no seam shows between them.
        const k = view.scale / TEXELS;
        for (const { image, place } of [...this.images, ...this.objects.values()]) {
            const p = project(place.gx, place.gy);
            image.setPosition(view.x + p.x * view.scale, view.y + p.y * view.scale).setScale(place.depth === 0 ? k * 1.02 : k);
        }
    }
    count(): number { return this.images.length + this.objects.size; }
    reset(): void { for (const { image } of [...this.images, ...this.objects.values()]) image.destroy(); this.images = []; this.objects.clear(); this.last = ''; }
    destroy(): void { this.reset(); }
}
