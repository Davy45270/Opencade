import type Phaser from 'phaser';
import { ArcadePaint } from './arcade-phaser';
import { actionArt, actionThemes, ballDrawing, craftViews, emblems, fighterViews, liveries, type CraftView, type Emblem, type FighterView } from './arcade-art';
import type { CharacterId } from './model';
import { selectedCharacter } from './selection';

/** Fixed atlas and image pool. All textures are baked from vectors at scene creation. */
export class ActionPaint {
    readonly id: CharacterId = selectedCharacter();
    readonly theme = actionThemes[this.id];
    readonly colors = liveries[this.id];
    readonly paint: ArcadePaint;
    private textures = new Map<string, string>();
    constructor(scene: Phaser.Scene, budget: number) {
        this.paint = new ArcadePaint(scene, budget);
        const art = actionArt[this.id];
        for (const view of fighterViews) this.textures.set(`fighter-${view}`, this.paint.texture(`77-fighter-${this.id}-${view}`, art.fighters[view], 192));
        for (const kind of ['vehicles', 'paddles', 'ships'] as const) for (const view of craftViews) this.textures.set(`${kind}-${view}`, this.paint.texture(`77-${kind}-${this.id}-${view}`, art[kind][view], 192));
        this.textures.set('ball', this.paint.texture(`77-ball-${this.id}`, ballDrawing(this.id), 64));
        for (const kind of Object.keys(emblems) as Emblem[]) this.textures.set(kind, this.paint.texture(`77-emblem-${kind}`, emblems[kind], 64));
    }
    begin(): void { this.paint.begin(); }
    destroy(): void { this.paint.destroy(); }
    stats() { return { ...this.paint.stats(), character: this.id, textures: this.textures.size, visible: this.paint.keys(), primary: this.theme.primary, special: this.theme.special, vehicle: this.theme.vehicle }; }
    icon(kind: Emblem, x: number, y: number, size: number, rotation = 0, alpha = 1): void {
        this.paint.draw(this.textures.get(kind) ?? '', x, y, size, rotation, alpha, 2);
    }
    fighter(view: FighterView, x: number, y: number, size: number): void { this.paint.draw(this.textures.get(`fighter-${view}`) ?? '', x, y, size, 0, 1, 2); }
    craft(kind: 'vehicles' | 'paddles' | 'ships', view: CraftView, x: number, y: number, width: number, height = width, rotation = 0): void {
        this.paint.draw(this.textures.get(`${kind}-${view}`) ?? '', x, y, width, rotation, 1, 2, height);
    }
    /** Short analytic trail: no histories, allocations or emitters growing with playtime. */
    ball(x: number, y: number, vx: number, vy: number, special: boolean, reduced: boolean): void {
        const motif = this.id === 'panda' ? 'bao' : this.id === 'singe' ? 'coeur' : this.theme.primary;
        this.projectile(x, y, vx, vy, 18, special ? this.theme.special : motif, reduced);
        this.paint.draw(this.textures.get('ball') ?? '', x, y, 16, 0, 1, 2);
    }
    projectile(x: number, y: number, vx: number, vy: number, size: number, special: boolean | Emblem = false, reduced = false): void {
        const motif = typeof special === 'string' ? special : special ? this.theme.special : this.theme.primary;
        const angle = Math.atan2(vy, vx);
        if (!reduced) for (let i = 3; i > 0; i--) this.icon(motif, x - Math.cos(angle) * i * size * .45, y - Math.sin(angle) * i * size * .45, size * (1 - i * .16), angle + Math.PI / 2, .42 - i * .08);
        this.icon(motif, x, y, size, angle + Math.PI / 2);
    }
}

const number = (color: string): number => Number.parseInt(color.slice(1), 16);
/** Three low contrast depths, authored props, then restrained foreground particles. */
export function actionBackdrop(g: Phaser.GameObjects.Graphics, id: CharacterId, band: number, clock: number, reduced: boolean): void {
    const l = liveries[id], t = reduced ? 0 : clock / 1000;
    g.fillStyle(number(actionThemes[id].sky)); g.fillRoundedRect(0, 0, 360, 640, 16);
    for (let layer = 0; layer < 3; layer++) {
        const offset = t * (layer + 1) * 2;
        g.fillStyle(number(l.body), .05 + layer * .035);
        for (let i = 0; i < 7; i++) {
            const x = ((i * 69 + layer * 23 - offset) % 440 + 440) % 440 - 40, y = 190 + (i * 53 + band * 19) % 190;
            if (id === 'panda' || id === 'pandaroux') {
                g.fillRoundedRect(x, y, 9 + layer * 3, 460, 5);
                for (let j = 0; j < 5; j++) { g.fillEllipse(x - 10, y + j * 47, 37, 12); g.fillEllipse(x + 19, y + j * 47 + 16, 37, 12); }
            } else if (id === 'dragon') { g.fillTriangle(x - 28, 640, x + 34, y, x + 100, 640); }
            else if (id === 'singe') { g.fillEllipse(x, y, 73, 93); g.fillRoundedRect(x - 22, y, 44, 440, 18); }
            else { g.fillTriangle(x - 21, y + 100, x, y, x + 28, y + 100); g.fillRect(x - 14, y + 100, 32, 280); }
        }
    }
    if (id === 'dragon') { g.fillStyle(0xff723e, .12); g.fillEllipse(180, 628, 440, 80); }
    for (let i = 0; i < 18; i++) {
        const x = 14 + (i * 73 + band * 13) % 332, y = 65 + ((i * 97 + t * (3 + i % 3)) % 490);
        g.fillStyle(number(l.trim), .12); g.fillCircle(x, y, 1 + i % 3);
    }
}
